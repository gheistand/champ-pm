-- Salary seed data from FY25 budget spreadsheet (extracted 2026-03-07)
-- appointment_type: 'surs' = Academic Professional (fringe 45.1%)
-- All records dated 2025-07-01 (fiscal year start, most recent data available)
-- created_by: heistand (admin)

INSERT INTO salary_records (user_id, annual_salary, fringe_rate, appointment_type, effective_date, change_type, notes, created_by)
VALUES
  ('heistand',  119148, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('dianad',    110050, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('hanstad',   107398, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('abthomas',   97428, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('powell',     95340, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('bchaille',   96229, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('byard',     101788, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('rmeekma',    88417, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('zaloudek',   89000, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('mlfuller',   85498, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('asjobe',     88258, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('carnold3',   71776, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('gbuckley',   72100, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('fghiami',    74500, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('lkumar',     72000, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('mrjeffer',   71400, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('smilton',    71400, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('marnilaw',   71400, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('mjr',        71400, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('arpitab2',   71000, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('sangwan2',   78303, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('bmcvay',     69500, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('spaudel',    66194, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('nazmul',     58750, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('clebeda',    58195, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('makdah2',    57750, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('spantha',    57719, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('tannerj',    56373, 0.451, 'surs', '2025-07-01', 'initial', 'Seeded from FY25 budget spreadsheet', 'heistand'),
  ('jbyard',     20914, 0.0766,'non_surs','2025-07-01','initial','Seeded from FY25 budget spreadsheet — non-SURS rate', 'heistand');
