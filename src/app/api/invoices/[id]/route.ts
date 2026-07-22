import { NextResponse } from 'next/server';
import { requireInvoiceAccess } from '@/lib/invoiceAuth';
import { deleteInvoice, getInvoiceByIdOrSlug, updateInvoice } from '@/lib/data/invoices';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireInvoiceAccess();
        if (!auth.allowed) {
            return NextResponse.json(
                { error: auth.reason || 'Unauthorized' },
                { status: auth.reason === 'Unauthorized' ? 401 : 403 }
            );
        }

        const { id } = await params;
        const invoice = await getInvoiceByIdOrSlug(id);
        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        return NextResponse.json(invoice);
    } catch (error: any) {
        console.error('Invoice GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireInvoiceAccess();
        if (!auth.allowed) {
            return NextResponse.json(
                { error: auth.reason || 'Unauthorized' },
                { status: auth.reason === 'Unauthorized' ? 401 : 403 }
            );
        }

        const { id } = await params;
        const body = await request.json();
        const invoice = await updateInvoice(id, body);
        return NextResponse.json(invoice);
    } catch (error: any) {
        console.error('Invoice PATCH Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireInvoiceAccess();
        if (!auth.allowed) {
            return NextResponse.json(
                { error: auth.reason || 'Unauthorized' },
                { status: auth.reason === 'Unauthorized' ? 401 : 403 }
            );
        }

        if (auth.role !== 'super_admin' && auth.role !== 'admin') {
            return NextResponse.json({ error: 'Only admins can delete invoices' }, { status: 403 });
        }

        const { id } = await params;
        await deleteInvoice(id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Invoice DELETE Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
