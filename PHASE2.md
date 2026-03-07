# CHAMP Program Manager — Phase 2 Build Instructions

## Prerequisites
Phase 1 must be complete and deployed. This phase adds salary tracking and budget burndown on top of the existing codebase.

---

## Phase 2 Scope
1. Staff salary and compensation history (admin-only)
2. Budget burndown by task / project / grant using federal cost category structure
3. Loaded cost calculation: hours × loaded salary rate (salary + fringe)
4. F&A (Facilities & Administration / indirect cost) tracking per grant
5. Budget vs. actual tracking with projections
6. Period of performance burn rate dashboard

---

## Cost Structure — Federal Budget Categories

All budget tracking follows the federal A–J budget structure used in FEMA/DHS grants:

```
A. Senior Personnel        — salary + fringe (SURS rate, 45.1%)
B. Other Personnel         — salary + fringe (rate varies by appointment type)
C. Fringe Benefits         — totaled from A+B fringe lines
D. Equipment               — not subject to F&A
E. Travel
F. Participant Support
G. Other Direct Costs      — contractual, supplies, etc.
H. Total Direct Costs      — sum of A–G
I. F&A / Indirect          — rate × MTDC (Modified Total Direct Costs)
J. Total Project Cost      — H + I
```

**MTDC basis**: F&A applies to direct costs *excluding* equipment, subcontracts over $25K, patient care, and tuition remission.

**Loaded cost** (for burndown purposes): salary + fringe only. F&A is calculated separately at the grant level.

---

## Appointment Types & Fringe Rates

Fringe rates vary by appointment type. Store appointment_type on salary records; derive fringe rate from a reference table so rates can be updated annually without code changes.

| Appointment Type   | Fringe Rate | Description |
|--------------------|-------------|-------------|
| surs               | 45.1%       | Academic Professional / SURS-eligible (most staff) |
| gra_half_plus      | 9.72%       | Graduate Research Assistant >= half-time enrollment |
| gra_half_less      | 17.37%      | Graduate Research Assistant < half-time enrollment |
| hourly_half_plus   | 0.01%       | Student Hourly >= half-time enrollment |
| non_surs           | 7.66%       | Non-SURS employee or student hourly < half-time |

---

## New D1 Migrations — migrations/0002_salary_budget.sql

```sql
-- Fringe rate reference table (U of I rates, updated annually)
CREATE TABLE IF NOT EXISTS fringe_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_type TEXT NOT NULL,
  rate REAL NOT NULL,
  effective_date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO fringe_rates (appointment_type, rate, effective_date, notes) VALUES
  ('surs',             0.451,  '2025-07-01', 'Academic Professional / SURS-eligible'),
  ('gra_half_plus',    0.0972, '2025-07-01', 'GRA >= half-time enrollment'),
  ('gra_half_less',    0.1737, '2025-07-01', 'GRA < half-time enrollment'),
  ('hourly_half_plus', 0.0001, '2025-07-01', 'Student Hourly >= half-time enrollment'),
  ('non_surs',         0.0766, '2025-07-01', 'Non-SURS / student hourly < half-time');

-- Salary records (append-only history)
CREATE TABLE IF NOT EXISTS salary_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  annual_salary REAL NOT NULL,
  fringe_rate REAL NOT NULL,
  appointment_type TEXT NOT NULL DEFAULT 'surs',
  effective_date TEXT NOT NULL,
  change_type TEXT NOT NULL,            -- 'initial' | 'merit' | 'equity' | 'promotion' | 'cola'
  classification TEXT,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- F&A rates per grant (varies by grant/agency)
CREATE TABLE IF NOT EXISTS grant_fa_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grant_id INTEGER NOT NULL REFERENCES grants(id),
  fa_rate REAL NOT NULL,
  fa_basis TEXT NOT NULL DEFAULT 'mtdc',  -- 'mtdc' | 'tdc'
  effective_date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO grant_fa_rates (grant_id, fa_rate, fa_basis, effective_date, notes) VALUES
  (7,  0.317, 'mtdc', '2024-10-01', 'DHS EMC-2024-CA-05002'),
  (8,  0.317, 'mtdc', '2024-10-01', 'DHS EMC-2024-CA-05001'),
  (11, 0.317, 'mtdc', '2023-09-22', 'DHS EMC-2023-CA-05003'),
  (12, 0.317, 'mtdc', '2023-09-22', 'DHS EMC-2023-CA-05002'),
  (13, 0.317, 'mtdc', '2022-09-01', 'DHS EMC-2022-CA-00011'),
  (14, 0.317, 'mtdc', '2021-09-01', 'DHS EMC-2021-CA-00012');

-- Salary adjustment requests (for Phase 3 equity analysis)
CREATE TABLE IF NOT EXISTS salary_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  adjustment_type TEXT NOT NULL,
  current_salary REAL NOT NULL,
  proposed_salary REAL NOT NULL,
  reason TEXT,
  recommended_by TEXT,
  status TEXT NOT NULL DEFAULT 'draft',   -- 'draft' | 'approved' | 'denied'
  effective_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Budget category breakdown per task
CREATE TABLE IF NOT EXISTS task_budget_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  category TEXT NOT NULL,                 -- 'personnel' | 'fringe' | 'travel' | 'equipment' | 'other_direct' | 'fa'
  budgeted_amount REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_salary_records_user ON salary_records(user_id, effective_date);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_user ON salary_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_grant_fa_rates ON grant_fa_rates(grant_id, effective_date);
CREATE INDEX IF NOT EXISTS idx_fringe_rates ON fringe_rates(appointment_type, effective_date);
```

---

## Salary & Loaded Cost Logic

### Hourly Loaded Rate
```
hourly_loaded_rate = (annual_salary / 2080) * (1 + fringe_rate)
```
- 2080 = 52 weeks x 40 hours
- Always use the salary record effective on the date of the timesheet entry

### Loaded Cost per Timesheet Entry
```
entry_loaded_cost = hours x hourly_loaded_rate
```

### F&A Cost (grant level)
```
mtdc = sum(loaded_personnel_costs)   -- excludes equipment, subcontracts >$25K
fa_cost = mtdc x grant_fa_rate
total_cost = mtdc + fa_cost
```

### Budget Burndown
The `budget` field on tasks/projects/grants = FEMA-allocated budget. **FEMA pays both direct costs (salary + fringe) AND F&A overhead** — the allocation already includes both. Total cost burned against the budget is therefore:

```
total_cost = loaded_personnel_cost + fa_cost
           = (hours x hourly_loaded_rate) + (loaded_personnel_cost x grant_fa_rate)

budget_remaining = fema_budget - total_cost
burn_rate = total_cost_to_date / days_elapsed
projected_final_cost = total_cost_to_date + (burn_rate x days_remaining)
```

**GRF (General Revenue Fund / state funds):** A portion of Glenn Heistand's and Sarah Milton's salaries are covered by state GRF grants (already in the database). When calculating cost burned against a FEMA grant, only charge hours logged to tasks under that specific grant. Hours charged to GRF tasks burn the GRF budget only. Burndown is always grant-scoped via the task reference on each timesheet entry.

---

## New API Routes

### Fringe Rates
- GET /api/fringe-rates — admin only, current rates by appointment type
- POST /api/fringe-rates — admin only, add new annual rate record

### Salary
- GET /api/salary/:user_id — admin only, full salary history
- POST /api/salary — admin only, add salary record
  - Body: { user_id, annual_salary, appointment_type, effective_date, change_type, classification, notes }
  - Auto-looks up current fringe_rate from fringe_rates table for the appointment_type
- GET /api/salary/:user_id/current — admin only, most recent record + computed hourly rate

### Grant F&A
- GET /api/grants/:grant_id/fa — admin only, F&A rate history
- POST /api/grants/:grant_id/fa — admin only, set/update F&A rate

### Budget & Burndown
- GET /api/budget/task/:task_id — admin only
  Returns: { fema_budget, hours_logged, hours_approved, loaded_cost_logged, loaded_cost_approved, fa_cost, total_cost, budget_remaining, pct_budget_used }

- GET /api/budget/project/:project_id — admin only
  Returns task rollup + project totals (personnel, fringe, F&A, total)

- GET /api/budget/grant/:grant_id — admin only
  Returns project rollup + grant totals + F&A rate applied

- GET /api/budget/program — admin only
  All grants rolled up to program level

- GET /api/budget/projections?grant_id= — admin only
  Projected end-of-grant cost at current burn rate

---

## Frontend Additions

### Admin: Fringe Rates — /admin/fringe-rates
- Reference table: appointment type, rate, effective date
- Add new rate each fiscal year (old records preserved for historical accuracy)

### Admin: Salary Management — /admin/salary
- Staff list: name, appointment type, current salary, fringe rate, loaded hourly rate
- Click staff member: salary history table (date, change type, salary, rate, classification, notes)
- Add Salary Record form:
  - Staff selector
  - Annual salary
  - Appointment type dropdown (auto-fills current fringe rate)
  - Effective date
  - Change type: initial / merit / equity / promotion / cola
  - Classification at this record
  - Notes
- Loaded hourly rate displayed with formula tooltip: (salary / 2080) x (1 + fringe_rate)
- Admin-only — never exposed to staff API

### Admin: Grant F&A Settings (add to grant detail page)
- Current F&A rate and basis (MTDC/TDC)
- Edit button to update rate each fiscal year
- History of past rates with effective dates

### Admin: Task Budget View (update existing task detail page)
- Budget breakdown:
  - Personnel cost (hours x loaded rate)
  - F&A cost (personnel cost x grant F&A rate)
  - Total cost (personnel + F&A)
  - FEMA budget
  - Remaining (FEMA budget - total cost)
- Budget gauge: green < 75%, amber 75-90%, red > 90%
- Hours gauge: estimated vs. logged
- Table: assigned staff, hours logged, loaded rate, loaded cost

### Admin: Project Budget View (update existing project detail page)
- Task-level rollup: task name, FEMA budget, personnel cost, F&A, total cost, remaining, % used
- Bar chart (Recharts): FEMA budget vs. personnel vs. F&A vs. remaining per task

### Admin: Grant Budget View (update existing grant detail page)
- Project-level rollup: FEMA budget, personnel cost, F&A, total cost, remaining
- F&A rate prominently shown (e.g., "31.7% MTDC — Other Sponsored Activity")
- Overall burn gauge

### Admin: Program Budget Dashboard — /admin/budget
- Cards per active grant: FEMA budget, total cost, remaining, % used, days left in PoP
- Color coding: green < 60%, amber 60-85%, red > 85%
- Stacked bar: all grants — personnel vs. F&A vs. remaining
- Burn rate chart: monthly cost trend, last 12 months
- Projection table: at current burn rate, when does each grant exhaust its budget?

### Admin: Staff Cost View (add to /admin/staff detail)
- YTD cost by grant (personnel + F&A share)
- Hours by grant and project
- Loaded hourly rate prominently displayed

---

## Completion Criteria
- [ ] Fringe rate reference table seeded with FY2025 rates
- [ ] Salary migration runs without error; 29 staff salary records loaded from FY25 budget spreadsheet
- [ ] appointment_type field drives fringe rate automatically on new salary records
- [ ] Grant F&A rates seeded for grants 7, 8, 11, 12, 13, 14 (all at 31.7% MTDC)
- [ ] Admin can add/view salary history for any staff member
- [ ] Loaded hourly rate calculates correctly: (salary / 2080) x (1 + fringe_rate)
- [ ] F&A calculated separately from loaded cost, applied at grant level
- [ ] Task, project, and grant budget pages show personnel cost, F&A, and total vs. FEMA budget
- [ ] Budget gauges use correct color thresholds
- [ ] Program budget dashboard renders with real data
- [ ] Burn rate projections display correctly
- [ ] Salary data NOT accessible via staff API endpoints (verified)
- [ ] README updated with Phase 2 migration and deploy steps

---

## Notes
- Dawn Cosentino has left the group and is not included in salary seed data
- Salary seed data is pre-generated in migrations/0008_salary_seed.sql (29 staff from FY25 budget spreadsheet)
- The 0008 migration must run AFTER the salary_records table is created by 0002_salary_budget.sql
- F&A rate 31.7% applies to "Other Sponsored Activity" — the correct federal category for FEMA/DHS CTP grants
- When staff log timesheets, loaded rate is looked up from the salary record effective on the entry date — historical accuracy preserved even if salary changes mid-grant
