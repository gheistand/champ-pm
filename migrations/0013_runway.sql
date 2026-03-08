-- Grant balance snapshots for runway calculator
CREATE TABLE IF NOT EXISTS grant_balances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grant_id INTEGER NOT NULL REFERENCES grants(id),
  balance REAL NOT NULL DEFAULT 0,
  fa_rate REAL NOT NULL,          -- stored per-snapshot so history is accurate
  as_of_date TEXT NOT NULL,       -- ISO date YYYY-MM-DD
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_grant_balances_grant ON grant_balances(grant_id, as_of_date);
