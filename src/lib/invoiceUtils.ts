export type InvoiceType = 'gst' | 'non_gst';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled';

export interface SellerSnapshot {
    company_name: string;
    address: string;
    phone: string;
    website: string;
    state: string;
    state_code: string;
    gstin: string;
    gst_rate: number;
    sac_code: string;
}

export interface BuyerSnapshot {
    name: string;
    organization: string;
    email: string;
    billing_address: string | null;
    billing_state: string | null;
    billing_state_code: string | null;
    gstin: string | null;
}

export interface InvoiceLineInput {
    description: string;
    sac_code?: string | null;
    quantity: number;
    rate: number;
}

export interface TaxBreakdown {
    subtotal: number;
    cgst_rate: number;
    cgst_amount: number;
    sgst_rate: number;
    sgst_amount: number;
    igst_rate: number;
    igst_amount: number;
    total: number;
    place_of_supply: string;
    isInterstate: boolean;
}

const ONES = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
    if (n < 20) return ONES[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return `${TENS[t]}${o ? ` ${ONES[o]}` : ''}`.trim();
}

function threeDigits(n: number): string {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    if (h && rest) return `${ONES[h]} Hundred ${twoDigits(rest)}`;
    if (h) return `${ONES[h]} Hundred`;
    return twoDigits(rest);
}

/** Convert INR amount to Indian words (e.g. Rupees One Lakh Only). */
export function amountInWords(amount: number): string {
    if (!Number.isFinite(amount)) return 'Zero Rupees Only';
    const rounded = Math.round(amount * 100) / 100;
    let rupees = Math.floor(rounded);
    const paise = Math.round((rounded - rupees) * 100);

    if (rupees === 0 && paise === 0) return 'Zero Rupees Only';

    const parts: string[] = [];
    const crore = Math.floor(rupees / 10000000);
    rupees %= 10000000;
    const lakh = Math.floor(rupees / 100000);
    rupees %= 100000;
    const thousand = Math.floor(rupees / 1000);
    rupees %= 1000;
    const hundred = rupees;

    if (crore) parts.push(`${threeDigits(crore)} Crore`);
    if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
    if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
    if (hundred) parts.push(threeDigits(hundred));

    let words = parts.length ? `Rupees ${parts.join(' ')}` : 'Rupees Zero';
    if (paise) words += ` and ${twoDigits(paise)} Paise`;
    return `${words} Only`;
}

/** Indian financial year label, e.g. 2026-27 */
export function getFinancialYear(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed
    if (month >= 3) {
        const next = String(year + 1).slice(-2);
        return `${year}-${next}`;
    }
    const prev = year - 1;
    const curr = String(year).slice(-2);
    return `${prev}-${curr}`;
}

export function formatInvoiceNumber(type: InvoiceType, fy: string, sequence: number): string {
    const prefix = type === 'gst' ? 'AV/GST' : 'AV/NG';
    return `${prefix}/${fy}/${String(sequence).padStart(3, '0')}`;
}

export function roundMoney(n: number): number {
    if (!Number.isFinite(n)) return 0;
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Parse qty/rate from form fields (handles commas, spaces, partial strings). */
export function parseInvoiceNumber(value: string | number | null | undefined): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (value == null) return 0;
    const cleaned = String(value).trim().replace(/,/g, '');
    if (!cleaned || cleaned === '-' || cleaned === '.') return 0;
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
}

export function computeLineAmount(
    quantity: string | number,
    rate: string | number
): number {
    return roundMoney(parseInvoiceNumber(quantity) * parseInvoiceNumber(rate));
}

export function computeTaxBreakdown(
    items: InvoiceLineInput[],
    invoiceType: InvoiceType,
    sellerStateCode: string,
    buyerStateCode: string | null | undefined,
    gstRate = 18
): TaxBreakdown {
    const effectiveGstRate = parseInvoiceNumber(gstRate) || 18;

    const subtotal = roundMoney(
        items.reduce((sum, item) => sum + computeLineAmount(item.quantity, item.rate), 0)
    );

    const buyerCode = (buyerStateCode || sellerStateCode || '27').trim();
    const sellerCode = (sellerStateCode || '27').trim();
    const isInterstate = invoiceType === 'gst' && buyerCode !== sellerCode;

    if (invoiceType !== 'gst') {
        return {
            subtotal,
            cgst_rate: 0,
            cgst_amount: 0,
            sgst_rate: 0,
            sgst_amount: 0,
            igst_rate: 0,
            igst_amount: 0,
            total: subtotal,
            place_of_supply: buyerCode === '27' ? 'Maharashtra' : buyerCode,
            isInterstate: false,
        };
    }

    const half = effectiveGstRate / 2;
    if (isInterstate) {
        const igst_amount = roundMoney(subtotal * (effectiveGstRate / 100));
        return {
            subtotal,
            cgst_rate: 0,
            cgst_amount: 0,
            sgst_rate: 0,
            sgst_amount: 0,
            igst_rate: effectiveGstRate,
            igst_amount,
            total: roundMoney(subtotal + igst_amount),
            place_of_supply: buyerCode,
            isInterstate: true,
        };
    }

    const cgst_amount = roundMoney(subtotal * (half / 100));
    const sgst_amount = roundMoney(subtotal * (half / 100));
    return {
        subtotal,
        cgst_rate: half,
        cgst_amount,
        sgst_rate: half,
        sgst_amount,
        igst_rate: 0,
        igst_amount: 0,
        total: roundMoney(subtotal + cgst_amount + sgst_amount),
        place_of_supply: 'Maharashtra',
        isInterstate: false,
    };
}

export function slugifyInvoiceNumber(invoiceNumber: string | null | undefined, id: string): string {
    if (!invoiceNumber) return id;
    return invoiceNumber
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

export const INDIAN_STATES: { name: string; code: string }[] = [
    { name: 'Andhra Pradesh', code: '37' },
    { name: 'Arunachal Pradesh', code: '12' },
    { name: 'Assam', code: '18' },
    { name: 'Bihar', code: '10' },
    { name: 'Chhattisgarh', code: '22' },
    { name: 'Goa', code: '30' },
    { name: 'Gujarat', code: '24' },
    { name: 'Haryana', code: '06' },
    { name: 'Himachal Pradesh', code: '02' },
    { name: 'Jharkhand', code: '20' },
    { name: 'Karnataka', code: '29' },
    { name: 'Kerala', code: '32' },
    { name: 'Madhya Pradesh', code: '23' },
    { name: 'Maharashtra', code: '27' },
    { name: 'Manipur', code: '14' },
    { name: 'Meghalaya', code: '17' },
    { name: 'Mizoram', code: '15' },
    { name: 'Nagaland', code: '13' },
    { name: 'Odisha', code: '21' },
    { name: 'Punjab', code: '03' },
    { name: 'Rajasthan', code: '08' },
    { name: 'Sikkim', code: '11' },
    { name: 'Tamil Nadu', code: '33' },
    { name: 'Telangana', code: '36' },
    { name: 'Tripura', code: '16' },
    { name: 'Uttar Pradesh', code: '09' },
    { name: 'Uttarakhand', code: '05' },
    { name: 'West Bengal', code: '19' },
    { name: 'Andaman and Nicobar Islands', code: '35' },
    { name: 'Chandigarh', code: '04' },
    { name: 'Dadra and Nagar Haveli and Daman and Diu', code: '26' },
    { name: 'Delhi', code: '07' },
    { name: 'Jammu and Kashmir', code: '01' },
    { name: 'Ladakh', code: '38' },
    { name: 'Lakshadweep', code: '31' },
    { name: 'Puducherry', code: '34' },
];

export function stateNameFromCode(code: string | null | undefined): string {
    if (!code) return 'Maharashtra';
    return INDIAN_STATES.find(s => s.code === code)?.name || code;
}
