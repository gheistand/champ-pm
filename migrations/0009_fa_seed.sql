-- F&A rate seed data for existing FEMA/DHS grants
-- Run AFTER 0002_salary_budget.sql and AFTER grants are populated

INSERT INTO grant_fa_rates (grant_id, fa_rate, fa_basis, effective_date, notes) VALUES
  (7,  0.317, 'mtdc', '2024-10-01', 'DHS EMC-2024-CA-05002'),
  (8,  0.317, 'mtdc', '2024-10-01', 'DHS EMC-2024-CA-05001'),
  (11, 0.317, 'mtdc', '2023-09-22', 'DHS EMC-2023-CA-05003'),
  (12, 0.317, 'mtdc', '2023-09-22', 'DHS EMC-2023-CA-05002'),
  (13, 0.317, 'mtdc', '2022-09-01', 'DHS EMC-2022-CA-00011'),
  (14, 0.317, 'mtdc', '2021-09-01', 'DHS EMC-2021-CA-00012');
