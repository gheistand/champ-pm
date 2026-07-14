-- 0028_grant_balances_unique.sql
--
-- Bug fix (2026-07-13): grant_balances had no uniqueness constraint on
-- (grant_id, as_of_date). Re-saving a Runway snapshot for the same date
-- (e.g. correcting an error) appended duplicate rows instead of replacing
-- the prior save, causing the Runway "Actual Balance" history chart to
-- sum both the erroneous and corrected snapshots together (observed:
-- ~$14.8M instead of the correct ~$7.4M on 2026-07-14).
--
-- Fix applied directly to prod on 2026-07-13 via d1 execute (see below);
-- this file documents it for schema-truth tracking. Do NOT re-run
-- `wrangler d1 migrations apply` — see MEMORY.md migration tracker notes.

CREATE UNIQUE INDEX IF NOT EXISTS idx_grant_balances_grant_date
  ON grant_balances(grant_id, as_of_date);

-- functions/api/runway/index.js POST handler updated in the same commit to
-- use `INSERT ... ON CONFLICT(grant_id, as_of_date) DO UPDATE SET ...`
-- instead of a plain INSERT, so future re-saves correct in place.
