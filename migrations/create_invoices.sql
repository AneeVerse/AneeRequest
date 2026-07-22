-- =====================================================
-- Invoices (GST + Non-GST) — Database Migration
-- Run manually in Supabase SQL Editor
-- =====================================================

-- 1. Client billing fields
ALTER TABLE public.clients
    ADD COLUMN IF NOT EXISTS billing_address TEXT,
    ADD COLUMN IF NOT EXISTS billing_state TEXT,
    ADD COLUMN IF NOT EXISTS billing_state_code TEXT,
    ADD COLUMN IF NOT EXISTS gstin TEXT;

-- 2. Invoice sequences (separate counters per type + FY)
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
    invoice_type TEXT NOT NULL CHECK (invoice_type IN ('gst', 'non_gst')),
    fy TEXT NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (invoice_type, fy)
);

-- 3. Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    invoice_type TEXT NOT NULL CHECK (invoice_type IN ('gst', 'non_gst')),
    invoice_number TEXT,
    fy TEXT NOT NULL,
    sequence_number INTEGER,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    place_of_supply TEXT,
    seller_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    buyer_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
    cgst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
    cgst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    sgst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
    sgst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    igst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
    igst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_invoice_number
    ON public.invoices (invoice_number)
    WHERE invoice_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON public.invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);

-- 4. Invoice line items
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL,
    sac_code TEXT,
    quantity NUMERIC(14, 2) NOT NULL DEFAULT 1,
    rate NUMERIC(14, 2) NOT NULL DEFAULT 0,
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- 5. updated_at trigger
CREATE OR REPLACE FUNCTION update_invoices_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_invoices_updated_at_column();

-- 6. RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Staff can manage invoices" ON public.invoices;
    DROP POLICY IF EXISTS "Staff can manage invoice items" ON public.invoice_items;
    DROP POLICY IF EXISTS "Staff can manage invoice sequences" ON public.invoice_sequences;
END $$;

CREATE POLICY "Staff can manage invoices" ON public.invoices
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN ('super_admin', 'admin', 'team_member')
        )
    );

CREATE POLICY "Staff can manage invoice items" ON public.invoice_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN ('super_admin', 'admin', 'team_member')
        )
    );

CREATE POLICY "Staff can manage invoice sequences" ON public.invoice_sequences
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN ('super_admin', 'admin', 'team_member')
        )
    );

-- 7. Seed seller / invoice settings (placeholders editable later)
INSERT INTO public.app_settings (key, value) VALUES
    ('invoice_company_name', 'Aneeverse'),
    ('invoice_address', 'Office No. 03, Plot No. 45, near HP Petrol Pump, Seawoods West, Sector 44, Seawoods, Navi Mumbai, Maharashtra 400706'),
    ('invoice_phone', '91527 55529'),
    ('invoice_website', 'https://www.aneeverse.com/'),
    ('invoice_state', 'Maharashtra'),
    ('invoice_state_code', '27'),
    ('invoice_gstin', '27AAAAA0000A1Z5'),
    ('invoice_gst_rate', '18'),
    ('invoice_sac_code', '998361')
ON CONFLICT (key) DO NOTHING;
