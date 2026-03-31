# Staff Plans Feature Spec

## Purpose
Help Glenn optimize staff allocations across FEMA grants so each grant spends down
smoothly within its period of performance. Output: a proposed appointment table
(periods + % allocations per staff per grant) ready to enter into PRIDE.

---

## Business Rules

### Burn Rate Formula
Monthly cost per staff per grant allocation:
  `(annual_salary / 12) × allocation_pct × (1 + fringe_rate) × (1 + fa_rate)`
- All staff in scope are AP type → fringe_rate = 0.451 (SURS rate from fringe_rates table)
- FA rate = 0.317 MTDC for all FEMA grants
- Salary comes from the imported appointment record (Salary_Rate column = annual salary)

### Period Generation (Option B)
Generate period break points automatically based on grant end dates:
1. Collect all grant end dates for all grants a staff member is appointed to
2. Create period boundaries at: today, each grant end date, and 24 months out
3. Within each period, only include grants that are still active (end_date >= period_start)
4. Last period for a grant = ends on that grant's period_of_performance end date

### Allocation Optimization
For each period, distribute 100% effort across active grants proportional to:
  `weight = remaining_balance / months_remaining_in_pop`
  (remaining_balance from staff_plan_grant_balances table, entered manually by Glenn)
- Normalize weights to sum to 100%
- Round to nearest whole %, adjust largest allocation to ensure exact 100% total
- Flag any allocation < 5% (too small per PRIDE rules) — suggest consolidating or removing
- Never appoint staff to grants not in their historical appointment list
- Never allocate more total $ than remaining_balance for any grant

### Termination Rules
- Mary Richardson (mjr): no appointments past 2026-04-30
- Diana Davisson (dianad): no appointments past 2026-04-30
- Love Kumar (lkumar): no new appointments (current ones end 2026-04-01)

### Constraints
- Total allocation per period = exactly 100%
- Min allocation per grant = 5% (flag if lower, allow override)
- Max periods to generate = 24 months out from today
- Only appoint to grants with remaining_balance > 0

---

## Database Schema

### Migration: 0019_staff_plans.sql

```sql
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
```

---

## API Endpoints

### Grant Balances
- `GET /api/staff-plans/balances` — list all balances with fund info
- `POST /api/staff-plans/balances` — create/update balance record
- `DELETE /api/staff-plans/balances/:id` — remove balance

### Appointments (historical/import)
- `GET /api/staff-plans/appointments` — list with filters (user_id, fund, date range)
- `POST /api/staff-plans/appointments/import` — bulk import from spreadsheet JSON
- `GET /api/staff-plans/appointments/eligible-grants/:userId` — funds this user has ever been appointed to

### Scenarios
- `GET /api/staff-plans/scenarios` — list scenarios
- `POST /api/staff-plans/scenarios` — create new scenario (triggers optimization)
- `GET /api/staff-plans/scenarios/:id` — get scenario with all rows
- `PUT /api/staff-plans/scenarios/:id/rows/:rowId` — update single row (override)
- `POST /api/staff-plans/scenarios/:id/recalculate` — re-run optimization preserving overrides
- `POST /api/staff-plans/scenarios/:id/export` — return XLSX-compatible JSON for export
- `DELETE /api/staff-plans/scenarios/:id` — delete scenario

### Optimization Engine (server-side, called by scenario create/recalculate)
- `POST /api/staff-plans/optimize` — core engine, returns proposed rows

---

## UI Pages (all admin-only)

### Route: /admin/staff-plans

#### Tab 1: Grant Balances
- Table: Fund | Account String | Remaining Balance | POP End Date | As Of Date | Notes | Actions
- Inline edit for balance and date fields
- "Add Balance" button → modal with fund lookup
- Color coding: red = end date < 3 months, yellow = < 6 months
- Shows total remaining across all grants

#### Tab 2: Appointments (Historical)
- View-only table of all imported appointments
- Filter by staff, fund, date range
- "Import from Spreadsheet" button → file upload → parse → preview → confirm
- Shows which staff are on which funds

#### Tab 3: Plan Builder
- "New Plan" button → modal: name, start date (default today), end date (default +24mo)
- Plan generation: runs optimization engine, shows proposed rows
- **Staff view:** expandable rows per staff member
  - Shows each period with fund allocations
  - Inline edit for %s (override mode)
  - Red flag icon on rows with issues (< 5%, over budget, past POP end)
- **Grant view:** pivot by grant, shows total spend per period
- Validation sidebar: total per staff per period, grant burn rate vs balance
- "Recalculate" button (re-runs preserving overrides)
- "Export to Excel" button → downloads XLSX matching PRIDE import format

#### Tab 4: Saved Plans
- List of scenarios with status, created date, summary stats
- "Activate" / "Archive" controls
- Side-by-side comparison (future)

---

## Export Format (XLSX)
One sheet per staff member (matching input spreadsheet format):
Columns: Employee_Name, Employee_Type, Period_Start_Date, Period_End_Date, Chart, Fund, Org, Program, Activity, Allocation_Percent, Salary_Rate, Full_Account_String, Notes

---

## Staff → User ID Map (for import)
```
Camden Arnold       → carnold3
Arpita Banerjee     → arpitab2
Greta Buckley       → gbuckley
Gregory Byard       → byard
Brian Chaille       → bchaille
Diana Davisson      → dianad      [RETIRE 2026-04-30]
Michelle Fuller     → mlfuller
Christopher Hanstad → hanstad
Glenn Heistand      → heistand
Nazmul Huda         → nazmul
Matthew Jefferson   → mrjeffer
Addison Jobe        → asjobe
Tanner Jones        → tannerj
Love Kumar          → lkumar      [LEAVING 2026-04-01 — no new appointments]
Marni Law           → marnilaw
Caitlin Lebeda      → clebeda
Lena Makdah         → makdah2
Brad McVay          → bmcvay
Ryan Meekma         → rmeekma
Sarah Milton        → smilton
Samikshya Pantha    → spantha
Sabin Paudel        → spaudel
James Powell        → powell
Mary Richardson     → mjr         [RETIRE 2026-04-30]
Nikhil Sangwan      → sangwan2
Fereshteh Ghiami Shomami → fghiami
Aaron Thomas        → abthomas
Zoe Zaloudek        → zaloudek
```

---

## Fringe / FA Constants (from D1)
- AP/SURS fringe rate: 0.451
- FEMA F&A rate: 0.317
- Burn rate = (salary/12) × pct × 1.451 × 1.317

---

## Phase Plan
1. **Migration** — create 4 tables
2. **Import endpoint + UI** — parse spreadsheet, load historical appointments
3. **Grant balances UI** — manual entry of PRIDE balances
4. **Optimization engine** — period generation + allocation math
5. **Plan Builder UI** — view/edit/recalculate/export
