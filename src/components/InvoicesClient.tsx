'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
    Receipt,
    Search,
    Loader2,
    FileText,
    Filter,
} from 'lucide-react';
import Header from '@/components/Header';
import { useAuth } from '@/context/AuthContext';
import { InvoiceRecord } from '@/lib/data/invoices';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatINR(n: number) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(n || 0);
}

function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

const STATUS_STYLE: Record<string, string> = {
    draft: 'bg-storm-gray/20 text-storm-gray border-storm-gray/30',
    sent: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
};

interface InvoicesClientProps {
    initialInvoices: InvoiceRecord[];
    clientId?: string;
    hideHeader?: boolean;
    onMobileMenuToggle?: () => void;
}

export default function InvoicesClient({
    initialInvoices,
    clientId,
    hideHeader,
    onMobileMenuToggle,
}: InvoicesClientProps) {
    const router = useRouter();
    const { profile, viewAsProfile } = useAuth();
    const displayProfile = viewAsProfile || profile;
    const isSuperAdmin = displayProfile?.role === 'super_admin';
    const isAdmin = displayProfile?.role === 'admin' || isSuperAdmin;
    const sections = displayProfile?.accessible_sections || [];
    const canAccess =
        isAdmin ||
        (displayProfile?.role === 'team_member' &&
            (sections.includes('invoices') || displayProfile?.team_role === 'admin'));

    const apiUrl = clientId ? `/api/invoices?client_id=${clientId}` : '/api/invoices';
    const { data: invoices = initialInvoices, isLoading } = useSWR<InvoiceRecord[]>(
        canAccess ? apiUrl : null,
        fetcher,
        { fallbackData: initialInvoices }
    );

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'gst' | 'non_gst'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
    const [showFilter, setShowFilter] = useState(false);

    React.useEffect(() => {
        if (displayProfile && !canAccess) {
            router.replace('/');
        }
    }, [displayProfile, canAccess, router]);

    const filtered = useMemo(() => {
        const list = Array.isArray(invoices) ? invoices : [];
        return list.filter((inv) => {
            if (typeFilter !== 'all' && inv.invoice_type !== typeFilter) return false;
            if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return (
                (inv.invoice_number || '').toLowerCase().includes(q) ||
                (inv.client?.organization || '').toLowerCase().includes(q) ||
                (inv.client?.name || '').toLowerCase().includes(q) ||
                (inv.buyer_snapshot?.organization || '').toLowerCase().includes(q)
            );
        });
    }, [invoices, typeFilter, statusFilter, search]);

    if (!canAccess) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-[#279da6]" size={24} />
            </div>
        );
    }

    const listBody = (
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 lg:px-6 pb-10 pt-5 sm:pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-storm-gray" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search invoices…"
                        className="w-full h-12 bg-[#18181B] border border-shark/50 rounded-2xl py-3 pl-11 pr-4 text-sm text-iron font-bold focus:outline-none focus:border-[#279da6]/40"
                    />
                </div>
                <div className="relative shrink-0">
                    <button
                        onClick={() => setShowFilter(!showFilter)}
                        className="h-12 px-5 bg-[#18181B] border border-shark/50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-storm-gray hover:text-iron flex items-center gap-2"
                    >
                        <Filter size={14} /> Filters
                    </button>
                    {showFilter && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-[#121214] border border-shark/60 rounded-2xl shadow-2xl z-50 p-3 space-y-3">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-storm-gray mb-2">
                                    Type
                                </p>
                                <div className="flex flex-col gap-1">
                                    {[
                                        { id: 'all', label: 'All' },
                                        { id: 'gst', label: 'GST' },
                                        { id: 'non_gst', label: 'Non-GST' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setTypeFilter(opt.id as any)}
                                            className={`text-left px-3 py-2 rounded-xl text-[11px] font-bold ${
                                                typeFilter === opt.id
                                                    ? 'bg-[#279da6]/15 text-[#279da6]'
                                                    : 'text-storm-gray hover:bg-white/5'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-storm-gray mb-2">
                                    Status
                                </p>
                                <div className="flex flex-col gap-1">
                                    {['all', 'draft', 'sent', 'paid', 'cancelled'].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setStatusFilter(s)}
                                            className={`text-left px-3 py-2 rounded-xl text-[11px] font-bold capitalize ${
                                                statusFilter === s
                                                    ? 'bg-[#279da6]/15 text-[#279da6]'
                                                    : 'text-storm-gray hover:bg-white/5'
                                            }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isLoading && !filtered.length ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-[#279da6]" size={28} />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-3xl bg-[#18181B] border border-shark flex items-center justify-center mb-4">
                        <FileText size={28} className="text-storm-gray" />
                    </div>
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-storm-gray">
                        No invoices found
                    </p>
                    <button
                        onClick={() =>
                            router.push(
                                clientId
                                    ? `/invoices/new?client_id=${clientId}`
                                    : '/invoices/new'
                            )
                        }
                        className="mt-4 px-6 py-2.5 bg-[#279da6] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest"
                    >
                        Create Invoice
                    </button>
                </div>
            ) : (
                <>
                    {/* Desktop table — fixed 12-col: 3+3+1+2+2+1 or without client 4+2+2+2+2 */}
                    <div className="hidden md:block space-y-2">
                        <div
                            className={`grid items-center gap-3 px-4 py-2.5 bg-white/5 border border-shark/40 rounded-xl text-[10px] font-black uppercase tracking-widest text-storm-gray ${
                                clientId
                                    ? 'grid-cols-[minmax(0,2fr)_auto_minmax(0,1.2fr)_auto_minmax(0,1fr)]'
                                    : 'grid-cols-[minmax(0,1.4fr)_minmax(0,1.4fr)_auto_minmax(0,1.1fr)_auto_minmax(0,1fr)]'
                            }`}
                        >
                            <div>Invoice</div>
                            {!clientId && <div>Client</div>}
                            <div>Type</div>
                            <div>Date</div>
                            <div>Status</div>
                            <div className="text-right">Total</div>
                        </div>
                        {filtered.map((inv) => (
                            <button
                                key={inv.id}
                                onClick={() => router.push(`/invoices/${inv.slug || inv.id}`)}
                                className={`w-full grid items-center gap-3 px-4 py-3.5 bg-[#18181B]/40 hover:bg-white/5 border border-shark/40 rounded-xl text-left transition-all group ${
                                    clientId
                                        ? 'grid-cols-[minmax(0,2fr)_auto_minmax(0,1.2fr)_auto_minmax(0,1fr)]'
                                        : 'grid-cols-[minmax(0,1.4fr)_minmax(0,1.4fr)_auto_minmax(0,1.1fr)_auto_minmax(0,1fr)]'
                                }`}
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-iron truncate leading-none group-hover:text-[#279da6]">
                                        {inv.invoice_number || 'DRAFT'}
                                    </p>
                                </div>
                                {!clientId && (
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-storm-gray truncate leading-none">
                                            {inv.client?.organization ||
                                                inv.buyer_snapshot?.organization ||
                                                '—'}
                                        </p>
                                    </div>
                                )}
                                <div className="flex items-center">
                                    <span
                                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border whitespace-nowrap ${
                                            inv.invoice_type === 'gst'
                                                ? 'border-[#279da6]/30 text-[#279da6] bg-[#279da6]/10'
                                                : 'border-shark text-storm-gray bg-shark/30'
                                        }`}
                                    >
                                        {inv.invoice_type === 'gst' ? 'GST' : 'Non-GST'}
                                    </span>
                                </div>
                                <div className="text-sm font-bold text-storm-gray leading-none whitespace-nowrap">
                                    {formatDate(inv.issue_date)}
                                </div>
                                <div className="flex items-center">
                                    <span
                                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border whitespace-nowrap ${
                                            STATUS_STYLE[inv.status] || STATUS_STYLE.draft
                                        }`}
                                    >
                                        {inv.status}
                                    </span>
                                </div>
                                <div className="text-right text-sm font-black text-iron leading-none whitespace-nowrap">
                                    {formatINR(Number(inv.total))}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-3">
                        {filtered.map((inv) => (
                            <button
                                key={inv.id}
                                onClick={() => router.push(`/invoices/${inv.slug || inv.id}`)}
                                className="w-full text-left bg-[#18181B] border border-shark/50 rounded-2xl p-4 space-y-3"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-black text-iron">
                                            {inv.invoice_number || 'DRAFT'}
                                        </p>
                                        {!clientId && (
                                            <p className="text-xs font-bold text-storm-gray mt-0.5">
                                                {inv.client?.organization || '—'}
                                            </p>
                                        )}
                                    </div>
                                    <span
                                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                                            STATUS_STYLE[inv.status] || STATUS_STYLE.draft
                                        }`}
                                    >
                                        {inv.status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold text-storm-gray">
                                    <span>
                                        {inv.invoice_type === 'gst' ? 'GST' : 'Non-GST'} ·{' '}
                                        {formatDate(inv.issue_date)}
                                    </span>
                                    <span className="text-iron font-black">
                                        {formatINR(Number(inv.total))}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );

    if (hideHeader) return listBody;

    return (
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
            <Header
                label="INVOICES"
                labelIcon={<Receipt size={18} className="text-[#279da6]" />}
                onMobileMenuToggle={onMobileMenuToggle}
                onCreate={() =>
                    router.push(clientId ? `/invoices/new?client_id=${clientId}` : '/invoices/new')
                }
            />
            {listBody}
        </div>
    );
}
