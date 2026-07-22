'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import {
    INDIAN_STATES,
    InvoiceStatus,
    InvoiceType,
    SellerSnapshot,
    computeLineAmount,
    computeTaxBreakdown,
    formatInvoiceNumber,
    getFinancialYear,
    parseInvoiceNumber,
} from '@/lib/invoiceUtils';
import { InvoiceRecord } from '@/lib/data/invoices';

export interface InvoiceFormClient {
    id: string;
    name: string;
    organization: string;
    email: string;
    billing_address?: string | null;
    billing_state?: string | null;
    billing_state_code?: string | null;
    gstin?: string | null;
}

interface LineDraft {
    description: string;
    sac_code: string;
    quantity: string;
    rate: string;
}

export interface InvoiceFormSubmitPayload {
    client_id: string;
    invoice_type: InvoiceType;
    status: InvoiceStatus;
    issue_date: string;
    due_date: string | null;
    notes: string | null;
    items: {
        description: string;
        sac_code: string | null;
        quantity: number;
        rate: number;
    }[];
    assignNumber: boolean;
}

interface InvoiceFormProps {
    clients: InvoiceFormClient[];
    initialClientId?: string;
    initialInvoice?: InvoiceRecord | null;
    seller: SellerSnapshot;
    onSubmit: (payload: InvoiceFormSubmitPayload) => Promise<void>;
    onCancel: () => void;
    isSubmitting?: boolean;
}

function emptyLine(): LineDraft {
    return { description: '', sac_code: '', quantity: '1', rate: '' };
}

const lineInputClass =
    'w-full bg-[#09090B] border border-shark/50 rounded-xl py-2.5 px-3 text-sm text-iron font-semibold focus:outline-none focus:border-[#279da6]/50 placeholder:text-storm-gray/35';

const gstLineGridClass =
    'grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_5.75rem_4.25rem_6.75rem_6.75rem_2.75rem] gap-2 md:gap-2.5 md:items-center';

const nonGstLineGridClass =
    'grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_4.25rem_6.75rem_6.75rem_2.75rem] gap-2 md:gap-2.5 md:items-center';

export default function InvoiceForm({
    clients,
    initialClientId,
    initialInvoice,
    seller,
    onSubmit,
    onCancel,
    isSubmitting,
}: InvoiceFormProps) {
    const isEdit = !!initialInvoice;
    const [clientId, setClientId] = useState(initialClientId || initialInvoice?.client_id || '');
    const [invoiceType, setInvoiceType] = useState<InvoiceType>(initialInvoice?.invoice_type || 'gst');
    const [status, setStatus] = useState<InvoiceStatus>(initialInvoice?.status || 'draft');
    const [issueDate, setIssueDate] = useState(
        initialInvoice?.issue_date || new Date().toISOString().slice(0, 10)
    );
    const [dueDate, setDueDate] = useState(initialInvoice?.due_date || '');
    const [notes, setNotes] = useState(initialInvoice?.notes || '');
    const numberedLocked = !!(isEdit && initialInvoice?.invoice_number);
    const [previewNumber, setPreviewNumber] = useState(
        () => initialInvoice?.invoice_number || ''
    );
    const [lines, setLines] = useState<LineDraft[]>(() => {
        if (initialInvoice?.items?.length) {
            return initialInvoice.items.map((i) => ({
                description: i.description,
                sac_code: i.sac_code || seller.sac_code,
                quantity: String(i.quantity),
                rate: String(i.rate),
            }));
        }
        return [emptyLine()];
    });

    const selectedClient = clients.find((c) => c.id === clientId);

    useEffect(() => {
        if (numberedLocked) return;
        let cancelled = false;
        fetch(`/api/invoices?preview_number=${invoiceType}`)
            .then((r) => r.json())
            .then((d) => {
                if (!cancelled) setPreviewNumber(d.invoice_number || '');
            })
            .catch(() => {
                const fy = getFinancialYear(new Date(issueDate));
                if (!cancelled) setPreviewNumber(formatInvoiceNumber(invoiceType, fy, 1));
            });
        return () => {
            cancelled = true;
        };
    }, [invoiceType, numberedLocked, issueDate]);

    const gstRate = parseInvoiceNumber(seller.gst_rate) || 18;

    const tax = useMemo(() => {
        const items = lines.map((l) => ({
            description: l.description,
            sac_code: l.sac_code,
            quantity: parseInvoiceNumber(l.quantity),
            rate: parseInvoiceNumber(l.rate),
        }));
        return computeTaxBreakdown(
            items,
            invoiceType,
            seller.state_code,
            selectedClient?.billing_state_code || '27',
            gstRate
        );
    }, [lines, invoiceType, seller.state_code, selectedClient?.billing_state_code, gstRate]);

    const updateLine = (index: number, patch: Partial<LineDraft>) => {
        setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const items = lines
            .filter((l) => l.description.trim())
            .map((l) => ({
                description: l.description.trim(),
                sac_code: invoiceType === 'gst' ? l.sac_code || seller.sac_code : null,
                quantity: parseInvoiceNumber(l.quantity),
                rate: parseInvoiceNumber(l.rate),
            }));

        await onSubmit({
            client_id: clientId,
            invoice_type: invoiceType,
            status,
            issue_date: issueDate,
            due_date: dueDate || null,
            notes: notes || null,
            items,
            assignNumber: status === 'sent' || status === 'paid',
        });
    };

    const formatINR = (n: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
            Number.isFinite(n) ? n : 0
        );

    const lineGridClass = invoiceType === 'gst' ? gstLineGridClass : nonGstLineGridClass;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">
                        Client
                    </label>
                    <select
                        required
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        disabled={!!initialClientId && !isEdit}
                        className="w-full bg-[#09090B] border border-shark/50 rounded-2xl py-3.5 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/50 font-bold"
                    >
                        <option value="">Select client…</option>
                        {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.organization || c.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">
                        Invoice Type
                    </label>
                    <div className="flex gap-2">
                        {(['gst', 'non_gst'] as InvoiceType[]).map((t) => (
                            <button
                                key={t}
                                type="button"
                                disabled={numberedLocked}
                                onClick={() => setInvoiceType(t)}
                                className={`flex-1 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all ${
                                    invoiceType === t
                                        ? 'bg-[#279da6]/15 border-[#279da6]/50 text-[#279da6]'
                                        : 'bg-[#09090B] border-shark/50 text-storm-gray hover:border-shark'
                                } disabled:opacity-50`}
                            >
                                {t === 'gst' ? 'GST' : 'Non-GST'}
                            </button>
                        ))}
                    </div>
                    <p className="text-[10px] text-storm-gray/70 font-bold ml-1">
                        Next number: <span className="text-[#279da6]">{previewNumber || '—'}</span>
                        {status === 'draft' && !numberedLocked && (
                            <span className="text-storm-gray/50"> (assigned when Sent/Paid)</span>
                        )}
                    </p>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">
                        Issue Date
                    </label>
                    <input
                        type="date"
                        required
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                        className="w-full bg-[#09090B] border border-shark/50 rounded-2xl py-3.5 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/50 font-bold"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">
                        Due Date
                    </label>
                    <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full bg-[#09090B] border border-shark/50 rounded-2xl py-3.5 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/50 font-bold"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">
                        Status
                    </label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                        className="w-full bg-[#09090B] border border-shark/50 rounded-2xl py-3.5 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/50 font-bold"
                    >
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="paid">Paid</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>

                {selectedClient && (
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">
                            Client State (tax)
                        </label>
                        <p className="w-full bg-[#09090B]/60 border border-shark/30 rounded-2xl py-3.5 px-4 text-sm text-storm-gray font-bold">
                            {INDIAN_STATES.find((s) => s.code === (selectedClient.billing_state_code || '27'))?.name ||
                                'Maharashtra'}{' '}
                            · set in client billing settings
                        </p>
                    </div>
                )}
            </div>

            {/* Line items */}
            <div className="bg-[#18181B] border border-shark/60 rounded-3xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-[11px] font-black text-storm-gray uppercase tracking-[0.25em]">
                            Line Items
                        </h3>
                        {invoiceType === 'gst' && (
                            <p className="text-[10px] text-storm-gray/70 font-bold mt-1">
                                {tax.isInterstate
                                    ? `Inter-state supply · IGST @ ${gstRate}%`
                                    : `Intra-state · CGST + SGST @ ${gstRate / 2}% each`}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setLines((prev) => [...prev, emptyLine()])}
                        className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#279da6] hover:text-[#279da6]/80"
                    >
                        <Plus size={14} /> Add line
                    </button>
                </div>

                <div
                    className={`hidden md:grid ${lineGridClass} px-1 text-[9px] font-black uppercase tracking-[0.2em] text-storm-gray/80`}
                >
                    <span>Description</span>
                    {invoiceType === 'gst' && <span>SAC</span>}
                    <span className="text-right">Qty</span>
                    <span className="text-right">Rate (₹)</span>
                    <span className="text-right">Amount</span>
                    <span className="sr-only">Remove</span>
                </div>

                <div className="space-y-3">
                    {lines.map((line, idx) => {
                        const lineAmount = computeLineAmount(line.quantity, line.rate);
                        return (
                            <div
                                key={idx}
                                className={`${lineGridClass} bg-[#09090B]/50 border border-shark/40 rounded-2xl p-3 md:p-2 md:bg-transparent md:border-none md:rounded-none`}
                            >
                                <div className="space-y-1">
                                    <label className="md:sr-only text-[9px] font-black uppercase tracking-widest text-storm-gray/70">
                                        Description
                                    </label>
                                    <input
                                        required
                                        placeholder="Service or item description"
                                        value={line.description}
                                        onChange={(e) => updateLine(idx, { description: e.target.value })}
                                        className={lineInputClass}
                                    />
                                </div>
                                {invoiceType === 'gst' && (
                                    <div className="space-y-1">
                                        <label className="md:sr-only text-[9px] font-black uppercase tracking-widest text-storm-gray/70">
                                            SAC
                                        </label>
                                        <input
                                            placeholder={seller.sac_code}
                                            value={line.sac_code}
                                            onChange={(e) => updateLine(idx, { sac_code: e.target.value })}
                                            className={`${lineInputClass} text-storm-gray`}
                                        />
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <label className="md:sr-only text-[9px] font-black uppercase tracking-widest text-storm-gray/70">
                                        Qty
                                    </label>
                                    <input
                                        inputMode="decimal"
                                        placeholder="1"
                                        value={line.quantity}
                                        onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                                        className={`${lineInputClass} text-right tabular-nums`}
                                        data-testid={`line-qty-${idx}`}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="md:sr-only text-[9px] font-black uppercase tracking-widest text-storm-gray/70">
                                        Rate (₹)
                                    </label>
                                    <input
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={line.rate}
                                        onChange={(e) => updateLine(idx, { rate: e.target.value })}
                                        className={`${lineInputClass} text-right tabular-nums`}
                                        data-testid={`line-rate-${idx}`}
                                    />
                                </div>
                                <div className="flex items-center justify-between md:justify-end gap-2 py-2 md:py-0">
                                    <span className="md:hidden text-[9px] font-black uppercase tracking-widest text-storm-gray/70">
                                        Amount
                                    </span>
                                    <span
                                        className="text-sm font-black text-iron tabular-nums"
                                        data-testid={`line-amount-${idx}`}
                                    >
                                        {formatINR(lineAmount)}
                                    </span>
                                </div>
                                <div className="flex md:justify-center">
                                    {lines.length > 1 ? (
                                        <button
                                            type="button"
                                            aria-label="Remove line"
                                            onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                                            className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    ) : (
                                        <span className="hidden md:block w-9" aria-hidden />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-end pt-2 border-t border-shark/30">
                    <div className="w-full max-w-sm space-y-2 text-sm bg-[#09090B]/40 rounded-2xl p-4 border border-shark/30">
                        <div className="flex justify-between text-storm-gray">
                            <span className="font-bold">Subtotal</span>
                            <span className="font-black text-iron tabular-nums" data-testid="invoice-subtotal">
                                {formatINR(tax.subtotal)}
                            </span>
                        </div>
                        {invoiceType === 'gst' && tax.igst_amount > 0 && (
                            <div className="flex justify-between text-storm-gray">
                                <span className="font-bold">IGST ({tax.igst_rate}%)</span>
                                <span className="font-black text-iron">{formatINR(tax.igst_amount)}</span>
                            </div>
                        )}
                        {invoiceType === 'gst' && tax.cgst_amount > 0 && (
                            <>
                                <div className="flex justify-between text-storm-gray">
                                    <span className="font-bold">CGST ({tax.cgst_rate}%)</span>
                                    <span className="font-black text-iron">{formatINR(tax.cgst_amount)}</span>
                                </div>
                                <div className="flex justify-between text-storm-gray">
                                    <span className="font-bold">SGST ({tax.sgst_rate}%)</span>
                                    <span className="font-black text-iron">{formatINR(tax.sgst_amount)}</span>
                                </div>
                            </>
                        )}
                        <div className="flex justify-between pt-2 border-t border-shark/40 text-[#279da6]">
                            <span className="font-black uppercase tracking-widest text-[11px]">Total</span>
                            <span className="font-black tabular-nums" data-testid="invoice-total">
                                {formatINR(tax.total)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">
                    Notes
                </label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Payment terms, remarks…"
                    className="w-full bg-[#09090B] border border-shark/50 rounded-2xl py-3.5 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/50 font-bold resize-none"
                />
            </div>

            <div className="flex items-center gap-3 justify-end pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-storm-gray hover:text-iron border border-shark/50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting || !clientId}
                    className="px-8 py-3 bg-[#279da6] hover:bg-[#279da6]/90 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-[#279da6]/30 disabled:opacity-50 flex items-center gap-2"
                >
                    {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                    {isEdit ? 'Save Invoice' : 'Create Invoice'}
                </button>
            </div>
        </form>
    );
}
