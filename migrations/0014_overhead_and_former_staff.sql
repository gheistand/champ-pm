-- Step 1: CHAMP Overhead grant
INSERT INTO grants (name, funder, grant_number, start_date, end_date, total_budget, status)
VALUES ('CHAMP Overhead', 'Internal', 'OVERHEAD', '2021-09-01', '2030-09-30', 0, 'active');

-- Overhead projects (grant_id will be the new row — use subquery)
INSERT INTO projects (grant_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (
  (SELECT id FROM grants WHERE grant_number = 'OVERHEAD'),
  'Leave', 'Annual Leave (AL) and Sick Leave (SL)', '2021-09-01', '2030-09-30', 0, 0, 'active'
);
INSERT INTO projects (grant_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (
  (SELECT id FROM grants WHERE grant_number = 'OVERHEAD'),
  'CHAMP Admin', 'General CHAMP program work — meetings, admin, internal coordination', '2021-09-01', '2030-09-30', 0, 0, 'active'
);
INSERT INTO projects (grant_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (
  (SELECT id FROM grants WHERE grant_number = 'OVERHEAD'),
  'PD', 'Professional Development', '2021-09-01', '2030-09-30', 0, 0, 'active'
);
INSERT INTO projects (grant_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (
  (SELECT id FROM grants WHERE grant_number = 'OVERHEAD'),
  'Prof Org', 'Professional Organizations and Boards (ASFPM, etc.)', '2021-09-01', '2030-09-30', 0, 0, 'active'
);
INSERT INTO projects (grant_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (
  (SELECT id FROM grants WHERE grant_number = 'OVERHEAD'),
  'General', 'General / catch-all', '2021-09-01', '2030-09-30', 0, 0, 'active'
);

-- Tasks for Leave project
INSERT INTO tasks (project_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (
  (SELECT id FROM projects WHERE name = 'Leave' AND grant_id = (SELECT id FROM grants WHERE grant_number = 'OVERHEAD')),
  'Annual Leave (AL)', 'Paid annual leave', '2021-09-01', '2030-09-30', 0, 0, 'active'
);
INSERT INTO tasks (project_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (
  (SELECT id FROM projects WHERE name = 'Leave' AND grant_id = (SELECT id FROM grants WHERE grant_number = 'OVERHEAD')),
  'Sick Leave (SL)', 'Paid sick leave', '2021-09-01', '2030-09-30', 0, 0, 'active'
);

-- Tasks for CHAMP Admin
INSERT INTO tasks (project_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (
  (SELECT id FROM projects WHERE name = 'CHAMP Admin' AND grant_id = (SELECT id FROM grants WHERE grant_number = 'OVERHEAD')),
  'CHAMP Admin', 'General CHAMP program administration and meetings', '2021-09-01', '2030-09-30', 0, 0, 'active'
);

-- Tasks for PD
INSERT INTO tasks (project_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (
  (SELECT id FROM projects WHERE name = 'PD' AND grant_id = (SELECT id FROM grants WHERE grant_number = 'OVERHEAD')),
  'Professional Development', 'Training, conferences, continuing education', '2021-09-01', '2030-09-30', 0, 0, 'active'
);

-- Tasks for Prof Org
INSERT INTO tasks (project_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (
  (SELECT id FROM projects WHERE name = 'Prof Org' AND grant_id = (SELECT id FROM grants WHERE grant_number = 'OVERHEAD')),
  'Professional Organizations', 'ASFPM, ILFSMA, and other professional board service', '2021-09-01', '2030-09-30', 0, 0, 'active'
);

-- Tasks for General
INSERT INTO tasks (project_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (
  (SELECT id FROM projects WHERE name = 'General' AND grant_id = (SELECT id FROM grants WHERE grant_number = 'OVERHEAD')),
  'General', 'Miscellaneous / unclassified time', '2021-09-01', '2030-09-30', 0, 0, 'active'
);

-- Step 2: Former staff (inactive) — needed to hold historical timesheet entries
INSERT OR IGNORE INTO users (id, name, email, role, department, is_active)
VALUES ('cabert', 'Curt Abert', 'cabert@illinois.edu', 'staff', 'CHAMP', 0);

INSERT OR IGNORE INTO users (id, name, email, role, department, is_active)
VALUES ('schakravorty', 'Sam Chakravorty', 'schakravorty@illinois.edu', 'staff', 'CHAMP', 0);

INSERT OR IGNORE INTO users (id, name, email, role, department, is_active)
VALUES ('dcosentino', 'Dawn Cosentino', 'dcosentino@illinois.edu', 'staff', 'CHAMP', 0);

INSERT OR IGNORE INTO users (id, name, email, role, department, is_active)
VALUES ('lgraff', 'Lisa Graff', 'lgraff@illinois.edu', 'staff', 'CHAMP', 0);

INSERT OR IGNORE INTO users (id, name, email, role, department, is_active)
VALUES ('chealy', 'Conor Healy', 'chealy@illinois.edu', 'staff', 'CHAMP', 0);

INSERT OR IGNORE INTO users (id, name, email, role, department, is_active)
VALUES ('rleitschuh', 'Rebecca Leitschuh', 'rleitschuh@illinois.edu', 'staff', 'CHAMP', 0);

INSERT OR IGNORE INTO users (id, name, email, role, department, is_active)
VALUES ('mwilliamson', 'Meirah Williamson', 'mwilliamson@illinois.edu', 'staff', 'CHAMP', 0);
