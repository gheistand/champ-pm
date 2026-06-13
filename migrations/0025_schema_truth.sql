-- Schema truth catch-up migration
-- Documents columns added directly to production D1 without a migration file.
-- NOTE: wrangler d1 migrations apply has NEVER been used on this database.
--       All migrations 0001-0024 were applied via `wrangler d1 execute` directly.
--       This file and 0026+ are for fresh-rebuild documentation only.
--       On production, apply changes individually with `wrangler d1 execute --remote`.

-- users.end_date: added directly 2026-05-14 for PRIDE sync integration.
-- Already exists in production. On a fresh rebuild, this creates it.
ALTER TABLE users ADD COLUMN end_date TEXT;
