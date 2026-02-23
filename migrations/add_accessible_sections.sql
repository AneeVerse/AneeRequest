-- Migration: Add accessible_sections to team_members
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS accessible_sections TEXT[] DEFAULT '{}';

-- Update existing records to have empty array if null
UPDATE public.team_members 
SET accessible_sections = '{}' 
WHERE accessible_sections IS NULL;
