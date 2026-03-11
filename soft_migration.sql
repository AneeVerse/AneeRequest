-- ALTERNATIVE APPROACH: "Soft Migration"
-- Use this if the backfill failed and you want to unblock the UI immediately.

-- 1. Still try to backfill what we can (No harm if already run)
UPDATE requests r
SET client_link_id = c.id
FROM profiles p, clients c
WHERE r.client_id = p.id
  AND p.email = c.email
  AND r.client_link_id IS NULL;

-- 2. Rename columns and setup the FK WITHOUT enforcing NOT NULL
-- This will allow the script to succeed even if there are orphaned rows.
ALTER TABLE requests RENAME COLUMN client_id TO profile_id_legacy;
ALTER TABLE requests RENAME COLUMN client_link_id TO client_id;
ALTER TABLE requests RENAME CONSTRAINT requests_client_link_id_fkey TO requests_client_id_fkey;

-- NOTE: We are skipping 'ALTER COLUMN client_id SET NOT NULL' for now.
-- This unblocks the "Requests" page immediately.
