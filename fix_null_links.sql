-- 1. Backfill client_link_id using the old client_id (profile id) and matching by email
UPDATE requests r
SET client_link_id = c.id
FROM profiles p, clients c
WHERE r.client_id = p.id
  AND p.email = c.email
  AND r.client_link_id IS NULL;

-- 2. Verify: Check if there are still any NULL client_link_id rows
-- SELECT count(*) FROM requests WHERE client_link_id IS NULL;

-- 3. Run Phase 5 once NULLs are cleared
ALTER TABLE requests ALTER COLUMN client_link_id SET NOT NULL;
ALTER TABLE requests RENAME COLUMN client_id TO profile_id_legacy;
ALTER TABLE requests RENAME COLUMN client_link_id TO client_id;
ALTER TABLE requests RENAME CONSTRAINT requests_client_link_id_fkey TO requests_client_id_fkey;
