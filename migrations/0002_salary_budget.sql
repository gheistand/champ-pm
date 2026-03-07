-- Phase 2: Salary tracking, budget burndown, fringe rates, F&A tracking
-- Run BEFORE 0008_salary_seed.sql

-- Fringe rate reference table (U of I rates, updated annually)
CREATE TABLE IF NOT EXISTS fringe_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_type TEXT NOT NULL,
  rate REAL NOT NULL,
  effective_date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Salary records (append-only history)
CREATE TABLE IF NOT EXISTS salary_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  annual_salary REAL NOT NULL,
  fringe_rate REAL NOT NULL,
  appointment_type TEXT NOT NULL DEFAULT 'surs',
  effective_date TEXT NOT NULL,
  change_type TEXT NOT NULL,
  classification TEXT,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- F&A rates per grant (varies by grant/agency)
CREATE TABLE IF NOT EXISTS grant_fa_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grant_id INTEGER NOT NULL,
  fa_rate REAL NOT NULL,
  fa_basis TEXT NOT NULL DEFAULT 'mtdc',
  effective_date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Salary adjustment requests (for Phase 3 equity analysis)
CREATE TABLE IF NOT EXISTS salary_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  adjustment_type TEXT NOT NULL,
  current_salary REAL NOT NULL,
  proposed_salary REAL NOT NULL,
  reason TEXT,
  recommended_by TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  effective_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Budget category breakdown per task
CREATE TABLE IF NOT EXISTS task_budget_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  budgeted_amount REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_salary_records_user ON salary_records(user_id, effective_date);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_user ON salary_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_grant_fa_rates ON grant_fa_rates(grant_id, effective_date);
CREATE INDEX IF NOT EXISTS idx_fringe_rates ON fringe_rates(appointment_type, effective_date);

-- Seed fringe rates (always safe to run)
INSERT INTO fringe_rates (appointment_type, rate, effective_date, notes) VALUES
  ('surs',             0.451,  '2025-07-01', 'Academic Professional / SURS-eligible'),
  ('gra_half_plus',    0.0972, '2025-07-01', 'GRA >= half-time enrollment'),
  ('gra_half_less',    0.1737, '2025-07-01', 'GRA < half-time enrollment'),
  ('hourly_half_plus', 0.0001, '2025-07-01', 'Student Hourly >= half-time enrollment'),
  ('non_surs',         0.0766, '2025-07-01', 'Non-SURS / student hourly < half-time');
