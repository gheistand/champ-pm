-- Phase 3: Compensation equity and promotion analysis
-- Run AFTER 0002_salary_budget.sql

-- Classification/title salary bands (admin-managed reference table)
CREATE TABLE IF NOT EXISTS classification_bands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  classification TEXT NOT NULL,
  band_min REAL NOT NULL,
  band_mid REAL NOT NULL,
  band_max REAL NOT NULL,
  typical_years_min INTEGER,
  typical_years_max INTEGER,
  notes TEXT,
  effective_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Promotion eligibility criteria
CREATE TABLE IF NOT EXISTS promotion_criteria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_classification TEXT NOT NULL,
  to_classification TEXT NOT NULL,
  min_years_in_role INTEGER NOT NULL DEFAULT 3,
  min_years_total INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

-- Equity analysis snapshots (point-in-time records)
CREATE TABLE IF NOT EXISTS equity_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_date TEXT NOT NULL,
  created_by TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS equity_snapshot_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_id INTEGER NOT NULL REFERENCES equity_snapshots(id),
  user_id TEXT NOT NULL,
  classification TEXT NOT NULL,
  annual_salary REAL NOT NULL,
  years_of_service REAL NOT NULL,
  band_min REAL,
  band_mid REAL,
  band_max REAL,
  compa_ratio REAL,
  percentile_in_band REAL,
  equity_gap REAL,
  flag TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_classification_bands ON classification_bands(classification, effective_date);
CREATE INDEX IF NOT EXISTS idx_equity_snapshot_items ON equity_snapshot_items(snapshot_id, user_id);
