# Staff Plans Priority + Pin Spec

## New DB columns

### staff_plan_grant_balances
- `priority_rank INTEGER DEFAULT 99` — lower = higher priority (1 = most important)
- `is_pinned INTEGER DEFAULT 0` — if 1, optimizer never touches this grant's allocations

### staff_plan_scenario_rows  
- `is_pinned INTEGER DEFAULT 0` — if 1, this specific row's allocation_pct is locked (do not change on recalculate)

---

## Optimizer Changes (optimize.js)

### Phase 1: Separate grants into pinned vs optimizable
For each staff member, for each period:
1. Identify PINNED grants: full_account_string marked is_pinned=1 in balances OR the scenario row itself is_pinned=1
2. Sum pinned allocations — these are fixed and subtracted from 100% first
3. Remaining % = 100 - sum(pinned_pcts) → available to optimize

### Phase 2: Priority-driven allocation of remaining %
Sort optimizable grants by priority_rank ASC (lower number = higher priority).

For each grant in priority order:
1. Calculate "target allocation" for this staff/period that would exhaust this grant by POP end:
   - monthly_cost_at_1pct = (salary / 12) * 0.01 * BURN_MULTIPLIER
   - months_remaining_in_pop = (pop_end - period_start) in months
   - pct_needed_to_exhaust = remaining_balance / (monthly_cost_at_1pct * months_remaining_in_pop * 100)
   - BUT cap at available_pct (don't exceed what's left after pinned)
   - AND cap at reasonable max per grant (50% default — avoid putting all eggs in one basket)
   - AND floor at 5% (PRIDE minimum) if any allocation at all
2. Assign that % to this grant
3. Subtract from available_pct
4. Move to next grant

After all priority grants allocated, if available_pct > 0:
- Distribute remainder proportionally among remaining grants by balance/months weight
- If still leftover after all grants, add to highest-priority grant

### Edge cases
- If pinned pcts already sum to >= 100: log warning, skip optimization for this staff/period, use pinned values only (total may exceed 100 — flag it)
- If a grant has is_pinned but no balance data: treat as pinned passthrough (keep original pct, don't flag)
- Minimum 5% per non-pinned grant; if calculated % < 5, skip that grant (don't force tiny allocations)

---

## Grant Balances UI Changes

### Priority ranking
- Add a "Priority" column to the balances table
- Show priority as an editable number field (1, 2, 3... or blank = unranked = lowest priority)
- Add "↑↓" drag handles for reordering (optional — number input is sufficient)
- Default: grants sorted by pop_end_date ASC, priority auto-assigned on first sync

### Pin toggle
- Add a "📌 Pin" toggle column to the balances table
- When pinned: row shows a pin icon, "Pinned — optimizer will not change allocations for this grant"
- When unpinned: normal optimization applies
- Pinning affects ALL staff on this grant (grant-level pin)

### Visual priority indicator
- Priority 1-3: badge with rank number in blue
- Priority 4+: small grey number
- Unpinned/unranked: dash

---

## Scenario Row Pin (individual override)
In the Plan Builder, each allocation row already has an edit override.
Add a pin button next to each row's % edit:
- 📌 Pin this row = lock this specific staff+grant+period combination at its current %
- Pinned rows show pin icon, amber background, not recalculated
- This is for "I'm appointed at 10% on Prof. Smith's grant and that never changes"

---

## Export behavior
Pinned rows export as-is. Non-pinned rows export optimizer results.
Excel export notes pinned rows in the Notes column: "Pinned - not optimized"

---

## Staff name map — same as STAFF_PLANS_SPEC.md
