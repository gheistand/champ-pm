-- Wire staff_plan_grant_balances to Runway (grants + grant_balances tables)
-- Adds sync tracking columns and manual override flag

ALTER TABLE staff_plan_grant_balances ADD COLUMN runway_balance REAL;
ALTER TABLE staff_plan_grant_balances ADD COLUMN runway_as_of_date TEXT;
ALTER TABLE staff_plan_grant_balances ADD COLUMN is_manual_override INTEGER DEFAULT 0;
ALTER TABLE staff_plan_grant_balances ADD COLUMN grant_name TEXT;
