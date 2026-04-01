-- Add full_account_string as unique key to grant balances
-- (fund_number alone is not unique — Fund 100026 has 8 distinct accounts)
CREATE TABLE IF NOT EXISTS staff_plan_grant_balances_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_account_string TEXT NOT NULL UNIQUE,  -- canonical key e.g. "1-470736-740000-191200-A00"
  fund_number TEXT,                           -- kept for display/filtering
  chart INTEGER DEFAULT 1,
  org INTEGER,
  program INTEGER,
  activity TEXT,
  remaining_balance REAL NOT NULL DEFAULT 0,
  pop_end_date TEXT,
  as_of_date TEXT,
  runway_balance REAL,
  runway_as_of_date TEXT,
  is_manual_override INTEGER DEFAULT 0,
  grant_name TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime("now")),
  updated_at TEXT DEFAULT (datetime("now"))
);
INSERT INTO staff_plan_grant_balances_new
  SELECT id, COALESCE(full_account_string, fund_number), fund_number, chart, org, program, activity,
         remaining_balance, pop_end_date, as_of_date, runway_balance, runway_as_of_date,
         is_manual_override, grant_name, notes, created_at, updated_at
  FROM staff_plan_grant_balances;
DROP TABLE staff_plan_grant_balances;
ALTER TABLE staff_plan_grant_balances_new RENAME TO staff_plan_grant_balances;
CREATE INDEX IF NOT EXISTS idx_grant_balances_account ON staff_plan_grant_balances(full_account_string);
CREATE INDEX IF NOT EXISTS idx_grant_balances_fund ON staff_plan_grant_balances(fund_number);

-- Add full_account_string index to appointments
CREATE INDEX IF NOT EXISTS idx_staff_appt_account ON staff_appointments(full_account_string);
