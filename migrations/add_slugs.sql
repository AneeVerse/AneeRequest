-- Add slug column to requests and tasks
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Function to slugify text
CREATE OR REPLACE FUNCTION slugify(title TEXT) RETURNS TEXT AS $$
BEGIN
    RETURN lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing requests with a unique slug
-- We use the first 8 characters of the ID to ensure uniqueness
UPDATE public.requests 
SET slug = slugify(title) || '-' || substr(id::text, 1, 8) 
WHERE slug IS NULL;

-- Update existing tasks
UPDATE public.tasks 
SET slug = slugify(title) || '-' || substr(id::text, 1, 8) 
WHERE slug IS NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_requests_slug ON public.requests(slug);
CREATE INDEX IF NOT EXISTS idx_tasks_slug ON public.tasks(slug);
