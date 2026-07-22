'use client';

import React from 'react';
import InvoicesClient from '@/components/InvoicesClient';
import { InvoiceRecord } from '@/lib/data/invoices';

interface ClientInvoicesTabProps {
    clientId: string;
    initialInvoices?: InvoiceRecord[];
}

export default function ClientInvoicesTab({
    clientId,
    initialInvoices = [],
}: ClientInvoicesTabProps) {
    return (
        <InvoicesClient
            initialInvoices={initialInvoices}
            clientId={clientId}
            hideHeader
        />
    );
}
