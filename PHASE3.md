# CHAMP Program Manager — Phase 3 Build Instructions

## Prerequisites
Phases 1 and 2 must be complete and deployed. This phase adds the compensation equity and promotion analysis engine.

---

## Phase 3 Scope
1. Title/classification reference table (admin-managed salary bands)
2. Years-of-service calculation per staff member
3. Equity analysis: compare staff salaries within same classification
4. Promotion readiness scoring based on years of service, title, and performance signals
5. Salary adjustment recommendation workflow

---

## New D1 Migrations — `migrations/0003_equity.sql`

```sql
-- Classification/title salary bands (admin-managed reference table)
CREATE TABLE IF NOT EXISTS classification_bands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  classification TEXT NOT NULL,             -- e.g. "Academic Professional Level 2"
  band_min REAL NOT NULL,                   -- minimum salary for this classification
  band_mid REAL NOT NULL,                   -- midpoint
  band_max REAL NOT NULL,                   -- maximum
  typical_years_min INTEGER,                -- typical years of service at entry
  typical_years_max INTEGER,                -- typical years before promotion eligible
  notes TEXT,
  effective_date TEXT NOT NULL,             -- bands can be updated annually
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
  user_id TEXT NOT NULL REFERENCES users(id),
  classification TEXT NOT NULL,
  annual_salary REAL NOT NULL,
  years_of_service REAL NOT NULL,
  band_min REAL,
  band_mid REAL,
  band_max REAL,
  compa_ratio REAL,                         -- salary / band_midpoint
  percentile_in_band REAL,                  -- where in the band (0–1)
  equity_gap REAL,                          -- distance from expected salary given tenure
  flag TEXT                                 -- 'underpaid' | 'at_market' | 'above_market' | null
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_classification_bands ON classification_bands(classification, effective_date);
CREATE INDEX IF NOT EXISTS idx_equity_snapshot_items ON equity_snapshot_items(snapshot_id, user_id);
```

---

## Key Calculations

### Years of Service
```
years_of_service = (today - start_date) / 365.25
```

### Compa-Ratio
```
compa_ratio = annual_salary / band_midpoint
```
- < 0.85 → likely underpaid
- 0.85–1.00 → below midpoint (normal for newer staff)
- 1.00–1.15 → at/above midpoint
- > 1.15 → above market for classification

### Expected Salary by Tenure
Simple linear interpolation within the band:
```
tenure_pct = min(years_in_classification / typical_years_max, 1.0)
expected_salary = band_min + (tenure_pct × (band_max - band_min))
equity_gap = expected_salary - actual_salary
```
Positive gap = underpaid relative to tenure. Negative = ahead of band.

### Promotion Readiness Score
```
score = 0
score += 40 if years_in_current_role >= min_years_in_role
score += 30 if years_total >= min_years_total
score += 30 if compa_ratio >= 0.95  (near top of current band, ready for next)
```
- 100 = fully eligible
- 70–99 = approaching eligibility
- < 70 = not yet eligible

---

## New API Routes

#### Classification Bands
- `GET /api/classifications` — admin only, list all bands
- `POST /api/classifications` — admin only, add/update a band
- `PUT /api/classifications/:id` — admin only
- `DELETE /api/classifications/:id` — admin only

#### Promotion Criteria
- `GET /api/promotion-criteria` — admin only
- `POST /api/promotion-criteria` — admin only
- `PUT /api/promotion-criteria/:id` — admin only

#### Equity Analysis
- `GET /api/equity/current` — admin only
  Returns current equity analysis for all active staff:
  - Classification, salary, years of service, band min/mid/max
  - Compa-ratio, percentile in band, equity gap, flag
  - Sorted by equity gap descending (most underpaid first)

- `POST /api/equity/snapshot` — admin only, save current analysis as a named snapshot
- `GET /api/equity/snapshots` — admin only, list saved snapshots
- `GET /api/equity/snapshots/:id` — admin only, retrieve a specific snapshot

#### Promotion
- `GET /api/promotions/eligible` — admin only
  Returns staff with readiness score ≥ 70, sorted by score descending

- `GET /api/promotions/staff/:user_id` — admin only
  Returns promotion readiness detail for a single staff member

#### Salary Adjustments
- `GET /api/salary-adjustments` — admin only, list all draft/approved adjustments
- `POST /api/salary-adjustments` — admin only, create recommendation
- `PUT /api/salary-adjustments/:id` — admin only, update status
- `POST /api/salary-adjustments/:id/apply` — admin only, apply adjustment (creates new salary_record)

---

## Frontend Additions

### Admin: Classification Bands — `/admin/classifications`
- Table: classification name, min, mid, max, typical tenure range
- Add/edit form (modal)
- Useful reference for salary decisions; informs all equity calculations
- Note: these should map to U of I Academic Professional classification levels

### Admin: Equity Dashboard — `/admin/equity`
This is the primary Phase 3 view.

**Summary section:**
- Donut chart: % of staff flagged underpaid / at market / above market
- Cards: staff needing attention (equity gap > $3,000), staff promotion-eligible

**Equity Table (sortable columns):**
| Name | Classification | Years | Salary | Band Midpoint | Compa-Ratio | Equity Gap | Flag | Action |
- Color coding: red rows = equity gap > $5K, amber = $2–5K, green = at/above market
- Action column: **Recommend Adjustment** button (opens modal)

**Recommend Adjustment Modal:**
- Pre-fills current salary, proposed salary (defaults to expected based on tenure)
- Type: merit / equity / promotion / cola
- Effective date
- Notes
- Save as draft or mark approved

**Classification Breakdown Chart:**
- Box-and-whisker or scatter plot per classification showing all staff salaries vs. band
- Each dot = one staff member, labeled by name (admin-only view)
- Band shown as colored region (min → mid → max)

### Admin: Promotion Readiness — `/admin/promotions`
- Staff list with promotion readiness scores
- Table columns: Name, Current Classification, Years in Role, Years Total, Compa-Ratio, Readiness Score, Eligible For (next classification)
- Color-coded score badges: green ≥ 100, amber 70–99, gray < 70
- Click on a staff member → detail view:
  - Current role history
  - Eligibility checklist (each criterion with pass/fail)
  - Suggested next classification
  - Salary impact: current pay → expected pay at new classification midpoint

### Admin: Salary Adjustments — `/admin/salary-adjustments`
- List of all draft and approved recommendations
- Quick approve/deny if in draft status
- Apply button converts approved recommendations to official salary records (triggers new salary_record entry and updates the user's effective salary going forward)
- Export to CSV for use in U of I HR processes

### Update `/admin/staff` detail page
- Add **Equity Summary** tab: compa-ratio, band position, equity gap, flag
- Add **Promotion Readiness** tab: score, criteria checklist, eligible-for
- Add **Salary Adjustment History** tab: list of past adjustments

---

## Completion Criteria
- [ ] Classification bands migration runs without error
- [ ] Admin can define and edit classification salary bands
- [ ] Equity analysis calculates compa-ratio and equity gap correctly
- [ ] Equity dashboard table shows all staff with correct color coding
- [ ] Promotion readiness scores calculate correctly
- [ ] Promotion eligibility page shows correct staff
- [ ] Salary adjustment recommendation workflow saves and applies correctly
- [ ] Applying an adjustment creates a new salary_record entry
- [ ] Equity snapshot save/load works correctly
- [ ] No salary or equity data is ever exposed to staff-role API endpoints
- [ ] README updated with Phase 3 migration and deploy steps

---

## Post-Phase 3 Notes for Future Enhancements
- Annual review workflow (formal review cycle with sign-off)
- Direct U of I HR system export format for salary action requests
- Performance rating input (1–5 scale) as additional promotion signal
- Historical equity trend chart (how gaps have changed over time)
- Email notifications to admin when staff approach promotion eligibility
