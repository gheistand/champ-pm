-- Staff Plans: priority_rank and is_pinned columns
-- Already applied directly to D1 (local + remote)

ALTER TABLE staff_plan_grant_balances ADD COLUMN priority_rank INTEGER DEFAULT 99;
ALTER TABLE staff_plan_grant_balances ADD COLUMN is_pinned INTEGER DEFAULT 0;
ALTER TABLE staff_plan_scenario_rows ADD COLUMN is_pinned INTEGER DEFAULT 0;
