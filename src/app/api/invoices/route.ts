import { NextResponse } from 'next/server';
import { requireInvoiceAccess } from '@/lib/invoiceAuth';
import {
    createInvoice,
    getAllInvoices,
    getInvoiceSellerSettings,
    previewNextInvoiceNumber,
} from '@/lib/data/invoices';
import { InvoiceStatus, InvoiceType } from '@/lib/invoiceUtils';

export async function GET(request: Request) {
    try {
        const auth = await requireInvoiceAccess();
        if (!auth.allowed) {
            return NextResponse.json(
                { error: auth.reason || 'Unauthorized' },
                { status: auth.reason === 'Unauthorized' ? 401 : 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('client_id') || undefined;
        const type = (searchParams.get('type') as InvoiceType | null) || undefined;
        const status = (searchParams.get('status') as InvoiceStatus | null) || undefined;
        const preview = searchParams.get('preview_number');
        const settings = searchParams.get('settings');

        if (settings === '1') {
            const seller = await getInvoiceSellerSettings();
            return NextResponse.json(seller);
        }

        if (preview === 'gst' || preview === 'non_gst') {
            const number = await previewNextInvoiceNumber(preview);
            return NextResponse.json({ invoice_number: number });
        }

        const invoices = await getAllInvoices({ clientId, type, status });
        return NextResponse.json(invoices);
    } catch (error: any) {
        console.error('Invoices GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requireInvoiceAccess();
        if (!auth.allowed) {
            return NextResponse.json(
                { error: auth.reason || 'Unauthorized' },
                { status: auth.reason === 'Unauthorized' ? 401 : 403 }
            );
        }

        const body = await request.json();
        const { client_id, invoice_type, status, issue_date, due_date, notes, items, assignNumber } = body;

        if (!client_id || !invoice_type) {
            return NextResponse.json({ error: 'client_id and invoice_type are required' }, { status: 400 });
        }
        if (!['gst', 'non_gst'].includes(invoice_type)) {
            return NextResponse.json({ error: 'Invalid invoice_type' }, { status: 400 });
        }
        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 });
        }

        for (const item of items) {
            if (!item.description?.trim()) {
                return NextResponse.json({ error: 'Each line item needs a description' }, { status: 400 });
            }
        }

        const invoice = await createInvoice({
            client_id,
            invoice_type,
            status,
            issue_date,
            due_date,
            notes,
            items,
            created_by: auth.userId,
            assignNumber,
        });

        return NextResponse.json(invoice, { status: 201 });
    } catch (error: any) {
        console.error('Invoices POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
