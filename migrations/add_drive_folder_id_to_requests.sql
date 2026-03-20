-- Migration: Add drive_folder_id to requests table
-- Run this in the Supabase SQL Editor to fix the "Schema Cache" error.

ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS drive_folder_id TEXT DEFAULT NULL;

-- Notify PostgREST to reload its schema cache (Supabase does this automatically usually, but just in case)
NOTIFY pgrst, 'reload schema';
