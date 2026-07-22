'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
    Receipt,
    Loader2,
    Printer,
    Download,
    Pencil,
    ArrowLeft,
    Check,
} from 'lucide-react';
import Header from '@/components/Header';
import InvoiceDocument from '@/components/invoices/InvoiceDocument';
import InvoiceForm from '@/components/invoices/InvoiceForm';
import { InvoiceRecord } from '@/lib/data/invoices';
import { SellerSnapshot } from '@/lib/invoiceUtils';
import { useAuth } from '@/context/AuthContext';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function InvoiceDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const printRef = useRef<HTMLDivElement>(null);
    const { profile, viewAsProfile } = useAuth();
    const displayProfile = viewAsProfile || profile;

    const [editing, setEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusBusy, setStatusBusy] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const { data: invoice, error, isLoading, mutate } = useSWR<InvoiceRecord>(
        id ? `/api/invoices/${id}` : null,
        fetcher
    );
    const { data: clients = [] } = useSWR('/api/clients', fetcher);
    const { data: seller } = useSWR<SellerSnapshot>('/api/invoices?settings=1', fetcher);

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

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPdf = () => {
        // Browser print-to-PDF — same professional sheet
        window.print();
    };

    const updateStatus = async (status: string) => {
        if (!invoice) return;
        setStatusBusy(true);
        try {
            const res = await fetch(`/api/invoices/${invoice.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update status');
            await mutate(data, false);
            showToast('success', `Marked as ${status}`);
            if (data.slug && data.slug !== id) {
                router.replace(`/invoices/${data.slug}`);
            }
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setStatusBusy(false);
        }
    };

    const handleSave = async (payload: any) => {
        if (!invoice) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/invoices/${invoice.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save');
            await mutate(data, false);
            setEditing(false);
            showToast('success', 'Invoice saved');
            if (data.slug && data.slug !== id) {
                router.replace(`/invoices/${data.slug}`);
            }
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
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

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-[#279da6]" size={28} />
            </div>
        );
    }

    if (error || !invoice || (invoice as any).error) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <p className="text-sm font-bold text-storm-gray">Invoice not found</p>
                <button
                    onClick={() => router.push('/invoices')}
                    className="text-[11px] font-black uppercase tracking-widest text-[#279da6]"
                >
                    Back to invoices
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
            <div className="print:hidden">
                <Header
                    label={invoice.invoice_number || 'DRAFT INVOICE'}
                    labelIcon={<Receipt size={18} className="text-[#279da6]" />}
                    rightToolbar={
                        <div className="flex items-center gap-2">
                            {!editing && (
                                <>
                                    <button
                                        onClick={handlePrint}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-shark/50 text-[10px] font-black uppercase tracking-widest text-storm-gray hover:text-iron hover:border-[#279da6]/40"
                                        title="Print"
                                    >
                                        <Printer size={14} />
                                        <span className="hidden sm:inline">Print</span>
                                    </button>
                                    <button
                                        onClick={handleDownloadPdf}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-shark/50 text-[10px] font-black uppercase tracking-widest text-storm-gray hover:text-iron hover:border-[#279da6]/40"
                                        title="Download PDF"
                                    >
                                        <Download size={14} />
                                        <span className="hidden sm:inline">PDF</span>
                                    </button>
                                    {invoice.status !== 'cancelled' && (
                                        <button
                                            onClick={() => setEditing(true)}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-shark/50 text-[10px] font-black uppercase tracking-widest text-storm-gray hover:text-iron"
                                        >
                                            <Pencil size={14} />
                                            <span className="hidden sm:inline">Edit</span>
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    }
                />
            </div>

            {toast && (
                <div
                    className={`print:hidden fixed top-20 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl border text-xs font-bold uppercase tracking-tight shadow-2xl ${
                        toast.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}
                >
                    {toast.message}
                </div>
            )}

            <div className="flex-1 overflow-y-auto px-3 sm:px-4 lg:px-6 pb-10 pt-4">
                {editing && seller ? (
                    <div className="print:hidden">
                        <button
                            onClick={() => setEditing(false)}
                            className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-storm-gray hover:text-iron mb-4"
                        >
                            <ArrowLeft size={14} /> Cancel edit
                        </button>
                        <InvoiceForm
                            clients={clientList}
                            initialInvoice={invoice}
                            seller={seller}
                            isSubmitting={isSubmitting}
                            onCancel={() => setEditing(false)}
                            onSubmit={handleSave}
                        />
                    </div>
                ) : (
                    <>
                        <div className="print:hidden flex flex-wrap items-center gap-2 mb-6">
                            {(['draft', 'sent', 'paid', 'cancelled'] as const).map((s) => (
                                <button
                                    key={s}
                                    disabled={statusBusy || invoice.status === s}
                                    onClick={() => updateStatus(s)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5 disabled:opacity-40 ${
                                        invoice.status === s
                                            ? 'bg-[#279da6]/15 border-[#279da6]/40 text-[#279da6]'
                                            : 'border-shark/50 text-storm-gray hover:border-shark'
                                    }`}
                                >
                                    {invoice.status === s && <Check size={12} />}
                                    {s}
                                </button>
                            ))}
                        </div>

                        <div ref={printRef} className="pb-8">
                            <InvoiceDocument invoice={invoice} />
                        </div>
                    </>
                )}
            </div>

        </div>
    );
}
