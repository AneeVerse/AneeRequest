-- Run this in your Supabase SQL Editor to fix the status constraint error

-- 1. Update the 'clients' table status constraint
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE public.clients ADD CONSTRAINT clients_status_check CHECK (status IN ('Ongoing', 'Leads', 'Closed', 'Archive'));

-- 2. (Optional) Also update existing records if any use 'Archived'
-- UPDATE public.clients SET status = 'Archive' WHERE status = 'Archived';
