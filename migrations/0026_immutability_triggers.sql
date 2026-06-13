-- Append-only enforcement triggers for salary_records and fringe_rates.
-- These tables are immutable by design (AGENTS.md/SOUL.md).
-- Triggers enforce that at the database level, not just by convention.
--
-- Admin escape hatch (Glenn only, for genuine data fixes):
--   DROP TRIGGER salary_records_no_update;
--   -- make correction --
--   Re-run this migration to restore the trigger.
--
-- Applied to production 2026-06-13 via: wrangler d1 execute champ-pm --remote

CREATE TRIGGER IF NOT EXISTS salary_records_no_update
BEFORE UPDATE ON salary_records
BEGIN
  SELECT RAISE(ABORT, 'salary_records is append-only — INSERT a new record instead');
END;

CREATE TRIGGER IF NOT EXISTS salary_records_no_delete
BEFORE DELETE ON salary_records
BEGIN
  SELECT RAISE(ABORT, 'salary_records is append-only — records may not be deleted');
END;

CREATE TRIGGER IF NOT EXISTS fringe_rates_no_update
BEFORE UPDATE ON fringe_rates
BEGIN
  SELECT RAISE(ABORT, 'fringe_rates is immutable after creation — add a note or create a new rate');
END;

CREATE TRIGGER IF NOT EXISTS fringe_rates_no_delete
BEFORE DELETE ON fringe_rates
BEGIN
  SELECT RAISE(ABORT, 'fringe_rates is immutable after creation — records may not be deleted');
END;
