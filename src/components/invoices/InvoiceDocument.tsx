'use client';

import React from 'react';
import Image from 'next/image';
import { InvoiceRecord } from '@/lib/data/invoices';
import { amountInWords, stateNameFromCode } from '@/lib/invoiceUtils';

interface InvoiceDocumentProps {
    invoice: InvoiceRecord;
}

function formatINR(n: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
    }).format(n || 0);
}

function formatDate(d: string | null | undefined): string {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return d;
    }
}

export default function InvoiceDocument({ invoice }: InvoiceDocumentProps) {
    const seller = invoice.seller_snapshot;
    const buyer = invoice.buyer_snapshot;
    const isGst = invoice.invoice_type === 'gst';
    const items = invoice.items || [];

    return (
        <div
            id="invoice-print-sheet"
            className="invoice-sheet bg-white text-[#111] w-full max-w-[210mm] mx-auto shadow-2xl print:shadow-none"
            style={{ fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif' }}
        >
            <div className="p-8 sm:p-10 print:p-8">
                {/* Header */}
                <div className="flex items-start justify-between gap-6 border-b-2 border-[#279da6] pb-6">
                    <div className="flex items-start gap-4">
                        <div className="relative w-14 h-14 shrink-0">
                            <Image
                                src="/images/Artboard 7@2x.png"
                                alt="Aneeverse"
                                fill
                                className="object-contain"
                                unoptimized
                            />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-[#0a0a0a] uppercase">
                                {seller?.company_name || 'Aneeverse'}
                            </h1>
                            <p className="text-[11px] text-[#555] mt-1 max-w-sm leading-relaxed">
                                {seller?.address}
                            </p>
                            <p className="text-[11px] text-[#555] mt-1">
                                {seller?.phone && <span>Ph: {seller.phone}</span>}
                                {seller?.website && (
                                    <span className="ml-2">· {seller.website.replace(/^https?:\/\//, '')}</span>
                                )}
                            </p>
                            {isGst && seller?.gstin && (
                                <p className="text-[11px] font-semibold text-[#111] mt-1">
                                    GSTIN: {seller.gstin}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#279da6]">
                            {isGst ? 'Tax Invoice' : 'Invoice'}
                        </p>
                        <p className="text-lg font-black text-[#0a0a0a] mt-1">
                            {invoice.invoice_number || 'DRAFT'}
                        </p>
                        <div className="mt-3 space-y-1 text-[11px] text-[#444]">
                            <p>
                                <span className="text-[#888]">Date:</span>{' '}
                                <span className="font-semibold text-[#111]">{formatDate(invoice.issue_date)}</span>
                            </p>
                            {invoice.due_date && (
                                <p>
                                    <span className="text-[#888]">Due:</span>{' '}
                                    <span className="font-semibold text-[#111]">{formatDate(invoice.due_date)}</span>
                                </p>
                            )}
                            {isGst && (
                                <p>
                                    <span className="text-[#888]">Place of Supply:</span>{' '}
                                    <span className="font-semibold text-[#111]">
                                        {stateNameFromCode(invoice.place_of_supply) || invoice.place_of_supply}
                                    </span>
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Parties */}
                <div className="grid grid-cols-2 gap-8 mt-6">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#279da6] mb-2">Bill To</p>
                        <p className="text-sm font-bold text-[#0a0a0a]">
                            {buyer?.organization || buyer?.name || '—'}
                        </p>
                        {buyer?.name && buyer?.organization && buyer.name !== buyer.organization && (
                            <p className="text-[11px] text-[#555]">{buyer.name}</p>
                        )}
                        {buyer?.billing_address && (
                            <p className="text-[11px] text-[#555] mt-1 leading-relaxed whitespace-pre-line">
                                {buyer.billing_address}
                            </p>
                        )}
                        {(buyer?.billing_state || buyer?.billing_state_code) && (
                            <p className="text-[11px] text-[#555] mt-1">
                                {buyer.billing_state || stateNameFromCode(buyer.billing_state_code)}
                                {buyer.billing_state_code ? ` (${buyer.billing_state_code})` : ''}
                            </p>
                        )}
                        {buyer?.email && <p className="text-[11px] text-[#555] mt-1">{buyer.email}</p>}
                        {isGst && buyer?.gstin && (
                            <p className="text-[11px] font-semibold text-[#111] mt-1">GSTIN: {buyer.gstin}</p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#279da6] mb-2">Summary</p>
                        <p className="text-[11px] text-[#555]">
                            Type:{' '}
                            <span className="font-semibold text-[#111]">{isGst ? 'GST' : 'Non-GST'}</span>
                        </p>
                        <p className="text-[11px] text-[#555] mt-1">
                            Status:{' '}
                            <span className="font-semibold text-[#111] uppercase">{invoice.status}</span>
                        </p>
                        {isGst && (
                            <p className="text-[11px] text-[#555] mt-1">
                                SAC:{' '}
                                <span className="font-semibold text-[#111]">
                                    {items[0]?.sac_code || seller?.sac_code || '998361'}
                                </span>
                            </p>
                        )}
                    </div>
                </div>

                {/* Line items */}
                <div className="mt-8">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f4f7f8] text-[9px] font-black uppercase tracking-[0.15em] text-[#555]">
                                <th className="py-2.5 px-3 w-10">#</th>
                                <th className="py-2.5 px-3">Description</th>
                                {isGst && <th className="py-2.5 px-3 w-20">SAC</th>}
                                <th className="py-2.5 px-3 w-16 text-right">Qty</th>
                                <th className="py-2.5 px-3 w-28 text-right">Rate</th>
                                <th className="py-2.5 px-3 w-28 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => (
                                <tr key={item.id || idx} className="border-b border-[#eee] text-[12px]">
                                    <td className="py-3 px-3 text-[#888]">{idx + 1}</td>
                                    <td className="py-3 px-3 font-medium text-[#111] whitespace-pre-wrap">
                                        {item.description}
                                    </td>
                                    {isGst && (
                                        <td className="py-3 px-3 text-[#555]">{item.sac_code || '—'}</td>
                                    )}
                                    <td className="py-3 px-3 text-right text-[#333]">{Number(item.quantity)}</td>
                                    <td className="py-3 px-3 text-right text-[#333]">{formatINR(Number(item.rate))}</td>
                                    <td className="py-3 px-3 text-right font-semibold text-[#111]">
                                        {formatINR(Number(item.amount))}
                                    </td>
                                </tr>
                            ))}
                            {items.length === 0 && (
                                <tr>
                                    <td colSpan={isGst ? 6 : 5} className="py-8 text-center text-[#999] text-sm">
                                        No line items
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="mt-6 flex flex-col sm:flex-row gap-6 justify-between">
                    <div className="flex-1 max-w-md">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#279da6] mb-2">
                            Amount in Words
                        </p>
                        <p className="text-[12px] font-semibold text-[#222] leading-relaxed">
                            {amountInWords(Number(invoice.total))}
                        </p>
                        {invoice.notes && (
                            <div className="mt-4">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#279da6] mb-1">
                                    Notes
                                </p>
                                <p className="text-[11px] text-[#555] whitespace-pre-wrap">{invoice.notes}</p>
                            </div>
                        )}
                    </div>
                    <div className="w-full sm:w-64 space-y-2 text-[12px]">
                        <div className="flex justify-between text-[#555]">
                            <span>Subtotal</span>
                            <span className="font-semibold text-[#111]">{formatINR(Number(invoice.subtotal))}</span>
                        </div>
                        {isGst && Number(invoice.igst_amount) > 0 && (
                            <div className="flex justify-between text-[#555]">
                                <span>IGST ({Number(invoice.igst_rate)}%)</span>
                                <span className="font-semibold text-[#111]">{formatINR(Number(invoice.igst_amount))}</span>
                            </div>
                        )}
                        {isGst && Number(invoice.cgst_amount) > 0 && (
                            <div className="flex justify-between text-[#555]">
                                <span>CGST ({Number(invoice.cgst_rate)}%)</span>
                                <span className="font-semibold text-[#111]">{formatINR(Number(invoice.cgst_amount))}</span>
                            </div>
                        )}
                        {isGst && Number(invoice.sgst_amount) > 0 && (
                            <div className="flex justify-between text-[#555]">
                                <span>SGST ({Number(invoice.sgst_rate)}%)</span>
                                <span className="font-semibold text-[#111]">{formatINR(Number(invoice.sgst_amount))}</span>
                            </div>
                        )}
                        <div className="flex justify-between pt-3 border-t-2 border-[#279da6] text-sm font-black text-[#0a0a0a]">
                            <span>Total</span>
                            <span>{formatINR(Number(invoice.total))}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-10 pt-6 border-t border-[#e5e5e5] flex items-end justify-between gap-4">
                    <p className="text-[10px] text-[#888] italic">Thank you for your business.</p>
                    <div className="text-right">
                        <p className="text-[10px] text-[#888] mb-8">For {seller?.company_name || 'Aneeverse'}</p>
                        <p className="text-[11px] font-semibold text-[#333] border-t border-[#ccc] pt-1 inline-block min-w-[140px]">
                            Authorized Signatory
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
