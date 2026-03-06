# CHAMP Program Manager — Phase 2 Build Instructions

## Prerequisites
Phase 1 must be complete and deployed. This phase adds salary tracking and budget burndown on top of the existing codebase.

---

## Phase 2 Scope
1. Staff salary and compensation history (admin-only)
2. Budget burndown by task / project / grant
3. Loaded cost calculation (hours × loaded salary rate)
4. Budget vs. actual tracking with projections
5. Period of performance burn rate dashboard

---

## New D1 Migrations — `migrations/0002_salary_budget.sql`

```sql
-- Salary records (append-only history)
CREATE TABLE IF NOT EXISTS salary_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  annual_salary REAL NOT NULL,
  fringe_rate REAL NOT NULL DEFAULT 0.30,   -- fringe benefit rate as decimal (e.g., 0.30 = 30%)
  effective_date TEXT NOT NULL,             -- ISO date YYYY-MM-DD
  change_type TEXT NOT NULL,                -- 'initial' | 'merit' | 'equity' | 'promotion' | 'cola'
  classification TEXT,                      -- title/grade at time of record
  notes TEXT,
  created_by TEXT NOT NULL,                 -- admin user ID who entered it
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Salary adjustment requests / history (for Phase 3 equity analysis)
CREATE TABLE IF NOT EXISTS salary_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  adjustment_type TEXT NOT NULL,            -- 'merit' | 'equity' | 'promotion' | 'cola'
  current_salary REAL NOT NULL,
  proposed_salary REAL NOT NULL,
  reason TEXT,
  recommended_by TEXT,
  status TEXT NOT NULL DEFAULT 'draft',     -- 'draft' | 'approved' | 'denied'
  effective_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Budget categories per task (optional breakdown)
CREATE TABLE IF NOT EXISTS task_budget_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  category TEXT NOT NULL,                   -- 'personnel' | 'travel' | 'equipment' | 'indirect' | 'other'
  budgeted_amount REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_salary_records_user ON salary_records(user_id, effective_date);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_user ON salary_adjustments(user_id);
```

---

## Salary & Loaded Cost Logic

### Hourly Rate Calculation
```
hourly_rate = (annual_salary / 2080) * (1 + fringe_rate)
```
- 2080 = standard work hours per year (52 weeks × 40 hours)
- Fringe rate is stored per salary record (can vary by staff type)
- Always use the salary record effective on the date of the timesheet entry

### Loaded Cost per Timesheet Entry
```
entry_cost = hours × hourly_rate
```

### Budget Burndown
For any task/project/grant:
```
budget_remaining = total_budget - sum(entry_cost for all approved entries)
projected_final_cost = sum(entry_cost for all entries) + (remaining_allocated_hours × avg_hourly_rate)
```

---

## New API Routes

#### Salary
- `GET /api/salary/:user_id` — admin only, full salary history for a user
- `POST /api/salary` — admin only, add new salary record
- `GET /api/salary/:user_id/current` — admin only, most recent salary record

#### Budget & Burndown
- `GET /api/budget/task/:task_id` — admin only
  Returns: `{ budget, budgeted_hours, hours_logged, hours_approved, cost_logged, cost_approved, cost_projected, pct_budget_used, pct_hours_used }`

- `GET /api/budget/project/:project_id` — admin only
  Returns task rollup + project totals

- `GET /api/budget/grant/:grant_id` — admin only
  Returns project rollup + grant totals

- `GET /api/budget/program` — admin only
  Returns all grants, rolled up to program level total

- `GET /api/budget/projections?grant_id=` — admin only
  Returns projected end-of-grant cost based on current burn rate

---

## Frontend Additions

### Admin: Salary Management — `/admin/salary`
- Staff list with current salary, fringe rate, loaded hourly rate
- Click on a staff member → salary history table (date, type, amount, notes)
- **Add Salary Record** form:
  - Staff selector
  - Annual salary (numeric)
  - Fringe rate (default 0.30, editable)
  - Effective date
  - Change type (initial / merit / equity / promotion / cola)
  - Classification at this record
  - Notes
- Salary data is **admin-only** — never exposed to staff API
- Display loaded hourly rate (calculated from salary + fringe)

### Admin: Task Budget View (update existing task detail page)
- Add budget burndown section to each task detail:
  - Budget gauge: visual progress bar (green < 75%, amber 75–90%, red > 90%)
  - Hours gauge: same for estimated vs. logged hours
  - Table: each assigned staff member, their hours logged, loaded cost
  - Projected final cost vs. budget

### Admin: Project Budget View (update existing project detail page)
- Task-level rollup table: task name, budget, spent, remaining, % used
- Project total row
- Bar chart (Recharts): budget vs. spent vs. projected per task

### Admin: Grant Budget View (update existing grant detail page)
- Project-level rollup table: project name, budget, spent, remaining, % used
- Grant total row with overall burn gauge

### Admin: Program Budget Dashboard — `/admin/budget`
- **Top-level burn dashboard**
- Cards for each active grant: total budget, spent, remaining, % used, days remaining in period of performance
- Color coding: green (< 60% budget used), amber (60–85%), red (> 85%)
- Stacked bar chart: all grants side by side, showing spent vs. remaining by category
- Burn rate chart: monthly cost trend (line chart, last 12 months)
- Projection table: at current burn rate, when does each grant run out of budget?

### Admin: Staff Cost View (add to `/admin/staff` detail)
- For each staff member: year-to-date cost by grant
- Hours breakdown: by grant, by project
- Useful for checking if a staff member is properly distributed across grants

---

## Completion Criteria
- [ ] Salary migration runs without error
- [ ] Admin can add/view salary history for any staff member
- [ ] Loaded hourly rate calculates correctly from salary + fringe
- [ ] Task, project, and grant budget pages show accurate burndown
- [ ] Budget gauges use correct color thresholds
- [ ] Program budget dashboard renders with real data
- [ ] Burn rate projections display correctly
- [ ] Salary data is NOT accessible via staff API endpoints (verified)
- [ ] README updated with Phase 2 migration and deploy steps
