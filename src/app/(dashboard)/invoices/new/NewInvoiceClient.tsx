'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Loader2, Receipt } from 'lucide-react';
import Header from '@/components/Header';
import InvoiceForm from '@/components/invoices/InvoiceForm';
import { SellerSnapshot } from '@/lib/invoiceUtils';
import { useAuth } from '@/context/AuthContext';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function NewInvoiceClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const clientId = searchParams.get('client_id') || undefined;
    const { profile, viewAsProfile } = useAuth();
    const displayProfile = viewAsProfile || profile;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const { data: clients = [], isLoading: loadingClients } = useSWR('/api/clients', fetcher);
    const { data: seller, isLoading: loadingSeller } = useSWR<SellerSnapshot>(
        '/api/invoices?settings=1',
        fetcher
    );

    useEffect(() => {
        const role = displayProfile?.role;
        const sections = displayProfile?.accessible_sections || [];
        const allowed =
            role === 'super_admin' ||
            role === 'admin' ||
            (role === 'team_member' &&
                (sections.includes('invoices') || displayProfile?.team_role === 'admin'));
        if (displayProfile && !allowed) router.replace('/');
    }, [displayProfile, router]);

    const handleSubmit = async (payload: any) => {
        setIsSubmitting(true);
        setError('');
        try {
            const res = await fetch('/api/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create invoice');
            router.push(`/invoices/${data.slug || data.id}`);
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
            setIsSubmitting(false);
        }
    };

    const clientList = Array.isArray(clients)
        ? clients.map((c: any) => ({
              id: c.id,
              name: c.name,
              organization: c.organization,
              email: c.email,
              billing_address: c.billing_address,
              billing_state: c.billing_state,
              billing_state_code: c.billing_state_code,
              gstin: c.gstin,
          }))
        : [];

    return (
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
            <Header
                label="NEW INVOICE"
                labelIcon={<Receipt size={18} className="text-[#279da6]" />}
            />
            <div className="flex-1 overflow-y-auto px-3 sm:px-4 lg:px-6 pb-10 pt-4">
                {error && (
                    <div className="mb-4 px-4 py-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-bold">
                        {error}
                    </div>
                )}
                {loadingClients || loadingSeller || !seller ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-[#279da6]" size={28} />
                    </div>
                ) : (
                    <InvoiceForm
                        clients={clientList}
                        initialClientId={clientId}
                        seller={seller}
                        isSubmitting={isSubmitting}
                        onCancel={() => router.back()}
                        onSubmit={handleSubmit}
                    />
                )}
            </div>
        </div>
    );
}
