-- Grant balances entered manually by Glenn from PRIDE
CREATE TABLE IF NOT EXISTS staff_plan_grant_balances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fund_number TEXT NOT NULL,           -- matches Fund column in spreadsheet (e.g. '470714')
  chart INTEGER NOT NULL DEFAULT 1,
  org INTEGER,
  program INTEGER,
  activity TEXT,
  full_account_string TEXT,            -- e.g. '1-470714-740000-191200-A00'
  remaining_balance REAL NOT NULL,     -- dollars remaining in grant
  pop_end_date TEXT NOT NULL,          -- period of performance end date (YYYY-MM-DD)
  as_of_date TEXT NOT NULL,            -- date Glenn pulled this balance from PRIDE
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Staff appointment history (imported from spreadsheet)
CREATE TABLE IF NOT EXISTS staff_appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  fund_number TEXT NOT NULL,
  chart INTEGER DEFAULT 1,
  org INTEGER,
  program INTEGER,
  activity TEXT,
  full_account_string TEXT,
  period_start TEXT NOT NULL,          -- YYYY-MM-DD
  period_end TEXT NOT NULL,            -- YYYY-MM-DD
  allocation_pct REAL NOT NULL,        -- 0-100
  salary_rate REAL,                    -- annual salary at time of appointment
  employee_type TEXT DEFAULT 'AP',
  source TEXT DEFAULT 'import',        -- 'import' | 'plan' | 'manual'
  created_at TEXT DEFAULT (datetime('now'))
);

-- Saved plan scenarios
CREATE TABLE IF NOT EXISTS staff_plan_scenarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT REFERENCES users(id),
  status TEXT DEFAULT 'draft',         -- 'draft' | 'active' | 'archived'
  plan_start_date TEXT NOT NULL,       -- YYYY-MM-DD
  plan_end_date TEXT NOT NULL,         -- YYYY-MM-DD
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Individual appointment rows in a scenario
CREATE TABLE IF NOT EXISTS staff_plan_scenario_rows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scenario_id INTEGER NOT NULL REFERENCES staff_plan_scenarios(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  fund_number TEXT NOT NULL,
  full_account_string TEXT,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  allocation_pct REAL NOT NULL,
  salary_rate REAL,
  estimated_cost REAL,                 -- pre-calculated: salary/12 * pct * fringe * fa
  is_override INTEGER DEFAULT 0,       -- 1 if Glenn manually changed this row
  flag TEXT,                           -- 'low_pct' | 'over_budget' | 'near_end' etc.
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_staff_appointments_user ON staff_appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_appointments_fund ON staff_appointments(fund_number);
CREATE INDEX IF NOT EXISTS idx_staff_plan_rows_scenario ON staff_plan_scenario_rows(scenario_id);
CREATE INDEX IF NOT EXISTS idx_staff_plan_rows_user ON staff_plan_scenario_rows(user_id);
CREATE INDEX IF NOT EXISTS idx_grant_balances_fund ON staff_plan_grant_balances(fund_number);
