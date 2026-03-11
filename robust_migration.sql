-- ROBUST APPROACH: "Force Rename & Link"
-- This script handles cases where constraints might have different names or columns are already partially renamed.

-- 1. Rename columns (using subqueries/checks if needed, but standard RENAME is usually safe in Supabase if they exist)
DO $$ 
BEGIN
    -- Rename old client_id to profile_id_legacy if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='requests' AND column_name='client_id') THEN
        ALTER TABLE requests RENAME COLUMN client_id TO profile_id_legacy;
    END IF;

    -- Rename client_link_id to client_id if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='requests' AND column_name='client_link_id') THEN
        ALTER TABLE requests RENAME COLUMN client_link_id TO client_id;
    END IF;
END $$;

-- 2. Drop ANY existing foreign key on the (now renamed) client_id or profile_id_legacy 
-- to avoid conflicts, then create the fresh one we need.
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'requests'::regclass 
        AND contype = 'f' 
        AND array_to_string(conkey, ', ') = (
            SELECT attnum::text 
            FROM pg_attribute 
            WHERE attrelid = 'requests'::regclass AND attname = 'client_id'
        )
    LOOP
        EXECUTE 'ALTER TABLE requests DROP CONSTRAINT ' || constraint_name;
    END LOOP;
END $$;

-- 3. Create the correct Foreign Key to the clients table
ALTER TABLE requests 
ADD CONSTRAINT requests_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- 4. Final sync: Try to backfill again just in case
UPDATE requests r
SET client_id = c.id
FROM profiles p, clients c
WHERE r.profile_id_legacy = p.id
  AND p.email = c.email
  AND r.client_id IS NULL;
