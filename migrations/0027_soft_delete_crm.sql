-- Soft-delete for CRM tables (M-4 from June 12 audit)
-- Replaces ON DELETE CASCADE hard-deletes with deleted_at timestamps.
-- Deleted records are preserved in D1 forever; API filters them out.
-- To restore a record: UPDATE contacts SET deleted_at = NULL WHERE id = ?;
--
-- Applied to production 2026-06-13 via: wrangler d1 execute champ-pm --remote

ALTER TABLE contacts ADD COLUMN deleted_at TEXT;
ALTER TABLE organizations ADD COLUMN deleted_at TEXT;
ALTER TABLE interactions ADD COLUMN deleted_at TEXT;
