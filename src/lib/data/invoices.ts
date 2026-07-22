import { createServiceClient } from '@/lib/supabase';
import { slugify } from '@/lib/utils';
import {
    BuyerSnapshot,
    InvoiceLineInput,
    InvoiceStatus,
    InvoiceType,
    SellerSnapshot,
    computeTaxBreakdown,
    computeLineAmount,
    formatInvoiceNumber,
    getFinancialYear,
    slugifyInvoiceNumber,
    stateNameFromCode,
} from '@/lib/invoiceUtils';

export interface InvoiceItem {
    id: string;
    invoice_id: string;
    position: number;
    description: string;
    sac_code: string | null;
    quantity: number;
    rate: number;
    amount: number;
}

export interface InvoiceRecord {
    id: string;
    slug: string | null;
    client_id: string;
    invoice_type: InvoiceType;
    invoice_number: string | null;
    fy: string;
    sequence_number: number | null;
    status: InvoiceStatus;
    issue_date: string;
    due_date: string | null;
    place_of_supply: string | null;
    seller_snapshot: SellerSnapshot;
    buyer_snapshot: BuyerSnapshot;
    subtotal: number;
    cgst_rate: number;
    cgst_amount: number;
    sgst_rate: number;
    sgst_amount: number;
    igst_rate: number;
    igst_amount: number;
    total: number;
    notes: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    client?: {
        id: string;
        name: string;
        email: string;
        organization: string;
        slug?: string;
        billing_address?: string | null;
        billing_state?: string | null;
        billing_state_code?: string | null;
        gstin?: string | null;
    } | null;
    items?: InvoiceItem[];
}

export async function getInvoiceSellerSettings(): Promise<SellerSnapshot> {
    const supabase = createServiceClient();
    const { data } = await supabase.from('app_settings').select('key, value');
    const map: Record<string, string> = {};
    (data || []).forEach((row: { key: string; value: string }) => {
        map[row.key] = row.value;
    });

    return {
        company_name: map.invoice_company_name || 'Aneeverse',
        address: map.invoice_address || 'Office No. 03, Plot No. 45, near HP Petrol Pump, Seawoods West, Sector 44, Seawoods, Navi Mumbai, Maharashtra 400706',
        phone: map.invoice_phone || '91527 55529',
        website: map.invoice_website || 'https://www.aneeverse.com/',
        state: map.invoice_state || 'Maharashtra',
        state_code: map.invoice_state_code || '27',
        gstin: map.invoice_gstin || '27AAAAA0000A1Z5',
        gst_rate: Number(map.invoice_gst_rate || 18),
        sac_code: map.invoice_sac_code || '998361',
    };
}

async function peekNextSequence(type: InvoiceType, fy: string): Promise<number> {
    const supabase = createServiceClient();
    const { data } = await supabase
        .from('invoice_sequences')
        .select('last_number')
        .eq('invoice_type', type)
        .eq('fy', fy)
        .maybeSingle();
    return (data?.last_number || 0) + 1;
}

/** Atomically claim the next sequence number for a type + FY. */
export async function claimNextSequence(type: InvoiceType, fy: string): Promise<number> {
    const supabase = createServiceClient();

    const { data: existing } = await supabase
        .from('invoice_sequences')
        .select('last_number')
        .eq('invoice_type', type)
        .eq('fy', fy)
        .maybeSingle();

    if (!existing) {
        const { error } = await supabase
            .from('invoice_sequences')
            .insert({ invoice_type: type, fy, last_number: 1 });
        if (error) {
            // Race: another insert won — retry read/update
            const { data: raced } = await supabase
                .from('invoice_sequences')
                .select('last_number')
                .eq('invoice_type', type)
                .eq('fy', fy)
                .single();
            const next = (raced?.last_number || 0) + 1;
            await supabase
                .from('invoice_sequences')
                .update({ last_number: next })
                .eq('invoice_type', type)
                .eq('fy', fy);
            return next;
        }
        return 1;
    }

    const next = existing.last_number + 1;
    const { error } = await supabase
        .from('invoice_sequences')
        .update({ last_number: next })
        .eq('invoice_type', type)
        .eq('fy', fy)
        .eq('last_number', existing.last_number);

    if (error) {
        // Optimistic lock failed — recursive retry
        return claimNextSequence(type, fy);
    }

    // Verify update succeeded (Supabase update doesn't always error on 0 rows)
    const { data: verified } = await supabase
        .from('invoice_sequences')
        .select('last_number')
        .eq('invoice_type', type)
        .eq('fy', fy)
        .single();

    if (verified?.last_number !== next) {
        return claimNextSequence(type, fy);
    }

    return next;
}

export async function previewNextInvoiceNumber(type: InvoiceType, issueDate?: string): Promise<string> {
    const date = issueDate ? new Date(issueDate) : new Date();
    const fy = getFinancialYear(date);
    const next = await peekNextSequence(type, fy);
    return formatInvoiceNumber(type, fy, next);
}

const INVOICE_CLIENT_SELECT =
    'id, name, email, organization, billing_address, billing_state, billing_state_code, gstin';

function withClientSlug<T extends { organization?: string; name?: string }>(client: T | null) {
    if (!client) return null;
    return {
        ...client,
        slug: slugify(client.organization || client.name || ''),
    };
}

function mapInvoiceRow(inv: any): InvoiceRecord {
    return {
        ...inv,
        client: withClientSlug(inv.client),
        items: (inv.items || []).sort((a: InvoiceItem, b: InvoiceItem) => a.position - b.position),
    };
}

function buildBuyerSnapshot(client: any): BuyerSnapshot {
    return {
        name: client.name || '',
        organization: client.organization || client.name || '',
        email: client.email || '',
        billing_address: client.billing_address || null,
        billing_state: client.billing_state || stateNameFromCode(client.billing_state_code) || 'Maharashtra',
        billing_state_code: client.billing_state_code || '27',
        gstin: client.gstin || null,
    };
}

export async function getAllInvoices(filters?: {
    clientId?: string;
    type?: InvoiceType;
    status?: InvoiceStatus;
}): Promise<InvoiceRecord[]> {
    const supabase = createServiceClient();
    let query = supabase
        .from('invoices')
        .select(`
            *,
            client:client_id (${INVOICE_CLIENT_SELECT}),
            items:invoice_items (*)
        `)
        .order('created_at', { ascending: false });

    if (filters?.clientId) query = query.eq('client_id', filters.clientId);
    if (filters?.type) query = query.eq('invoice_type', filters.type);
    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) {
        console.error('getAllInvoices error:', error);
        return [];
    }

    return (data || []).map(mapInvoiceRow);
}

export async function getInvoiceByIdOrSlug(idOrSlug: string): Promise<InvoiceRecord | null> {
    const supabase = createServiceClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    const { data, error } = await supabase
        .from('invoices')
        .select(`
            *,
            client:client_id (${INVOICE_CLIENT_SELECT}),
            items:invoice_items (*)
        `)
        .eq(isUuid ? 'id' : 'slug', idOrSlug)
        .maybeSingle();

    if (error) {
        console.error('getInvoiceByIdOrSlug error:', error);
        return null;
    }
    if (!data) return null;

    return mapInvoiceRow(data);
}

export interface CreateInvoiceInput {
    client_id: string;
    invoice_type: InvoiceType;
    status?: InvoiceStatus;
    issue_date?: string;
    due_date?: string | null;
    notes?: string | null;
    items: InvoiceLineInput[];
    created_by?: string | null;
    /** If true (or status is sent/paid), assign permanent invoice number. */
    assignNumber?: boolean;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<InvoiceRecord> {
    const supabase = createServiceClient();
    const seller = await getInvoiceSellerSettings();

    const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, name, email, organization, billing_address, billing_state, billing_state_code, gstin')
        .eq('id', input.client_id)
        .single();

    if (clientError || !client) throw new Error('Client not found');

    const issueDate = input.issue_date || new Date().toISOString().slice(0, 10);
    const fy = getFinancialYear(new Date(issueDate));
    const status: InvoiceStatus = input.status || 'draft';
    const assignNumber = input.assignNumber || status === 'sent' || status === 'paid';

    const tax = computeTaxBreakdown(
        input.items,
        input.invoice_type,
        seller.state_code,
        client.billing_state_code || '27',
        seller.gst_rate
    );

    let sequence_number: number | null = null;
    let invoice_number: string | null = null;
    let slug: string | null = null;

    if (assignNumber) {
        sequence_number = await claimNextSequence(input.invoice_type, fy);
        invoice_number = formatInvoiceNumber(input.invoice_type, fy, sequence_number);
        slug = slugifyInvoiceNumber(invoice_number, '');
    }

    const buyer = buildBuyerSnapshot(client);

    const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
            client_id: input.client_id,
            invoice_type: input.invoice_type,
            invoice_number,
            fy,
            sequence_number,
            slug: slug || undefined,
            status,
            issue_date: issueDate,
            due_date: input.due_date || null,
            place_of_supply: tax.place_of_supply,
            seller_snapshot: seller,
            buyer_snapshot: buyer,
            subtotal: tax.subtotal,
            cgst_rate: tax.cgst_rate,
            cgst_amount: tax.cgst_amount,
            sgst_rate: tax.sgst_rate,
            sgst_amount: tax.sgst_amount,
            igst_rate: tax.igst_rate,
            igst_amount: tax.igst_amount,
            total: tax.total,
            notes: input.notes || null,
            created_by: input.created_by || null,
        })
        .select()
        .single();

    if (error || !invoice) throw new Error(error?.message || 'Failed to create invoice');

    // Ensure slug for drafts / numbered invoices
    if (!invoice.slug) {
        const nextSlug = invoice_number
            ? slugifyInvoiceNumber(invoice_number, invoice.id)
            : `draft-${invoice.id.slice(0, 8)}`;
        await supabase.from('invoices').update({ slug: nextSlug }).eq('id', invoice.id);
        invoice.slug = nextSlug;
    }

    const itemRows = input.items.map((item, index) => ({
        invoice_id: invoice.id,
        position: index,
        description: item.description,
        sac_code: item.sac_code || (input.invoice_type === 'gst' ? seller.sac_code : null),
        quantity: item.quantity,
        rate: item.rate,
        amount: computeLineAmount(item.quantity, item.rate),
    }));

    if (itemRows.length) {
        const { error: itemsError } = await supabase.from('invoice_items').insert(itemRows);
        if (itemsError) throw new Error(itemsError.message);
    }

    const full = await getInvoiceByIdOrSlug(invoice.id);
    if (!full) throw new Error('Invoice created but could not be reloaded');
    return full;
}

export interface UpdateInvoiceInput {
    status?: InvoiceStatus;
    issue_date?: string;
    due_date?: string | null;
    notes?: string | null;
    items?: InvoiceLineInput[];
    invoice_type?: InvoiceType;
    client_id?: string;
}

export async function updateInvoice(id: string, input: UpdateInvoiceInput): Promise<InvoiceRecord> {
    const supabase = createServiceClient();
    const existing = await getInvoiceByIdOrSlug(id);
    if (!existing) throw new Error('Invoice not found');

    if (existing.status === 'cancelled' && input.status !== 'cancelled') {
        // allow only if explicitly changing — otherwise block edits to cancelled
    }

    const seller = (existing.seller_snapshot as SellerSnapshot) || await getInvoiceSellerSettings();
    let clientId = existing.client_id;
    let buyer = existing.buyer_snapshot as BuyerSnapshot;

    if (input.client_id && input.client_id !== existing.client_id) {
        const { data: client } = await supabase
            .from('clients')
            .select('id, name, email, organization, billing_address, billing_state, billing_state_code, gstin')
            .eq('id', input.client_id)
            .single();
        if (!client) throw new Error('Client not found');
        clientId = client.id;
        buyer = buildBuyerSnapshot(client);
    }

    const invoiceType = input.invoice_type || existing.invoice_type;
    const issueDate = input.issue_date || existing.issue_date;
    const status = input.status || existing.status;

    let items = existing.items || [];
    if (input.items) {
        // Replace items
        await supabase.from('invoice_items').delete().eq('invoice_id', existing.id);
        const rows = input.items.map((item, index) => ({
            invoice_id: existing.id,
            position: index,
            description: item.description,
            sac_code: item.sac_code || (invoiceType === 'gst' ? seller.sac_code : null),
            quantity: item.quantity,
            rate: item.rate,
            amount: computeLineAmount(item.quantity, item.rate),
        }));
        if (rows.length) {
            const { error } = await supabase.from('invoice_items').insert(rows);
            if (error) throw new Error(error.message);
        }
        items = rows as any;
    }

    const lineInputs: InvoiceLineInput[] = (input.items || items).map((i: any) => ({
        description: i.description,
        sac_code: i.sac_code,
        quantity: Number(i.quantity),
        rate: Number(i.rate),
    }));

    const tax = computeTaxBreakdown(
        lineInputs,
        invoiceType,
        seller.state_code,
        buyer.billing_state_code || '27',
        seller.gst_rate
    );

    const updatePayload: any = {
        client_id: clientId,
        invoice_type: invoiceType,
        status,
        issue_date: issueDate,
        due_date: input.due_date !== undefined ? input.due_date : existing.due_date,
        notes: input.notes !== undefined ? input.notes : existing.notes,
        place_of_supply: tax.place_of_supply,
        buyer_snapshot: buyer,
        subtotal: tax.subtotal,
        cgst_rate: tax.cgst_rate,
        cgst_amount: tax.cgst_amount,
        sgst_rate: tax.sgst_rate,
        sgst_amount: tax.sgst_amount,
        igst_rate: tax.igst_rate,
        igst_amount: tax.igst_amount,
        total: tax.total,
    };

    // Assign number when leaving draft for the first time
    const leavingDraft =
        existing.status === 'draft' &&
        status !== 'draft' &&
        status !== 'cancelled' &&
        !existing.invoice_number;

    if (leavingDraft) {
        const fy = getFinancialYear(new Date(issueDate));
        const sequence_number = await claimNextSequence(invoiceType, fy);
        const invoice_number = formatInvoiceNumber(invoiceType, fy, sequence_number);
        updatePayload.fy = fy;
        updatePayload.sequence_number = sequence_number;
        updatePayload.invoice_number = invoice_number;
        updatePayload.slug = slugifyInvoiceNumber(invoice_number, existing.id);
        // Freeze seller snapshot at issue time
        updatePayload.seller_snapshot = await getInvoiceSellerSettings();
    }

    // Block changing type once numbered
    if (existing.invoice_number && input.invoice_type && input.invoice_type !== existing.invoice_type) {
        throw new Error('Cannot change invoice type after a number has been assigned');
    }

    const { error } = await supabase.from('invoices').update(updatePayload).eq('id', existing.id);
    if (error) throw new Error(error.message);

    const full = await getInvoiceByIdOrSlug(existing.id);
    if (!full) throw new Error('Invoice updated but could not be reloaded');
    return full;
}

export async function deleteInvoice(id: string): Promise<void> {
    const supabase = createServiceClient();
    const existing = await getInvoiceByIdOrSlug(id);
    if (!existing) throw new Error('Invoice not found');
    if (existing.status !== 'draft' && existing.invoice_number) {
        throw new Error('Only draft invoices can be deleted. Cancel issued invoices instead.');
    }
    const { error } = await supabase.from('invoices').delete().eq('id', existing.id);
    if (error) throw new Error(error.message);
}
