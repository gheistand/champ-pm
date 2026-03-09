-- Create projects for existing grants that need them (for timesheet import)

-- DHS Sub Lake County (grant 5)
INSERT INTO projects (grant_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (5, 'Lake County Sub', 'DHS Sub Lake County 120484', '2021-09-01', '2027-09-30', 0, 0, 'active');

-- DHS Sub McHenry County (grant 9)
INSERT INTO projects (grant_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (9, 'McHenry County Sub', 'DHS Sub McHenry County 117574', '2021-09-01', '2027-09-30', 0, 0, 'active');

-- DHS Sub GWRPC (grant 10)
INSERT INTO projects (grant_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (10, 'GWRPC HMP', 'Hazard Mitigation Plan — GWRPC', '2021-09-01', '2027-09-30', 0, 0, 'active');

-- IDNR OWR-454 Model (grant 15)
INSERT INTO projects (grant_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (15, 'IDNR OWR Model Database', 'FY25-26 Task 3 — Model Database', '2025-07-01', '2027-06-30', 0, 0, 'active');

-- IDNR OWR-454 Inundation (grant 16)
INSERT INTO projects (grant_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (16, 'IDNR OWR Inundation Mapping', 'FY25-26 Task 2 — Inundation Mapping', '2025-07-01', '2027-06-30', 0, 0, 'active');

-- IDNR OWR-454 SAFR (grant 17)
INSERT INTO projects (grant_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (17, 'IDNR OWR SAFR', 'FY25-26 Task 1 — SAFR', '2025-07-01', '2027-06-30', 0, 0, 'active');

-- LOMR Reviews — new grant + project for all private LOMR work
INSERT INTO grants (name, funder, grant_number, start_date, end_date, total_budget, status)
VALUES ('LOMR Reviews', 'Private/Local', 'LOMR', '2021-09-01', '2030-09-30', 0, 'active');

INSERT INTO projects (grant_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (
  (SELECT id FROM grants WHERE grant_number='LOMR'),
  'LOMR Review Work', 'Private letters of map revision and related consulting work', '2021-09-01', '2030-09-30', 0, 0, 'active'
);

-- ISGS LiDAR — new grant + project
INSERT INTO grants (name, funder, grant_number, start_date, end_date, total_budget, status)
VALUES ('ISGS LiDAR', 'ISGS', 'ISGS-LIDAR', '2021-09-01', '2027-09-30', 0, 'active');

INSERT INTO projects (grant_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (
  (SELECT id FROM grants WHERE grant_number='ISGS-LIDAR'),
  'ISGS LiDAR', 'Illinois State Geological Survey LiDAR work', '2021-09-01', '2027-09-30', 0, 0, 'active'
);

-- IL Streams 2023 — new grant + project
INSERT INTO grants (name, funder, grant_number, start_date, end_date, total_budget, status)
VALUES ('IL Streams 2023', 'IDNR/Other', 'IL-STREAMS-2023', '2023-01-01', '2025-12-31', 0, 'closed');

INSERT INTO projects (grant_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (
  (SELECT id FROM grants WHERE grant_number='IL-STREAMS-2023'),
  'IL Streams 2023', 'Illinois Streams 2023 project', '2023-01-01', '2025-12-31', 0, 0, 'active'
);

-- Jersey HMP — new grant (closed) + project
INSERT INTO grants (name, funder, grant_number, start_date, end_date, total_budget, status)
VALUES ('Jersey County HMP', 'Local', 'JERSEY-HMP', '2021-09-01', '2024-12-31', 0, 'closed');

INSERT INTO projects (grant_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (
  (SELECT id FROM grants WHERE grant_number='JERSEY-HMP'),
  'Jersey County HMP', 'Jersey County Hazard Mitigation Plan', '2021-09-01', '2024-12-31', 0, 0, 'active'
);

-- CACS GIST — new grant + project
INSERT INTO grants (name, funder, grant_number, start_date, end_date, total_budget, status)
VALUES ('ResMit CACS GIST', 'FEMA ResMit', 'CACS-GIST', '2021-09-01', '2027-09-30', 0, 'active');

INSERT INTO projects (grant_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (
  (SELECT id FROM grants WHERE grant_number='CACS-GIST'),
  'CACS GIST', 'ResMit CACS GIST project', '2021-09-01', '2027-09-30', 0, 0, 'active'
);

-- CNMS — add as project under PM SOW ISWS 24-01 (project 10)
-- Actually better as standalone project under Overhead or new grant
-- Glenn said 'MAS ISWS 10-CNMS, create' — treating as overhead admin project
INSERT INTO projects (grant_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (
  (SELECT id FROM grants WHERE grant_number='OVERHEAD'),
  'CNMS', 'Coordinated Needs Management Strategy program work', '2021-09-01', '2030-09-30', 0, 0, 'active'
);

-- FY20 Wayne County (closed historical grant)
INSERT INTO grants (name, funder, grant_number, start_date, end_date, total_budget, status)
VALUES ('DHS EMC-2020 (Historical)', 'DHS/FEMA', 'FY20-FEMA', '2020-09-01', '2023-09-30', 0, 'closed');

INSERT INTO projects (grant_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (
  (SELECT id FROM grants WHERE grant_number='FY20-FEMA'),
  'MAS ISWS 20-11 Wayne', 'Wayne County — closed FY20 grant', '2020-09-01', '2023-09-30', 0, 0, 'active'
);

-- FY19 Bond County (closed historical grant)
INSERT INTO grants (name, funder, grant_number, start_date, end_date, total_budget, status)
VALUES ('DHS EMC-2019 (Historical)', 'DHS/FEMA', 'FY19-FEMA', '2019-09-01', '2022-09-30', 0, 'closed');

INSERT INTO projects (grant_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (
  (SELECT id FROM grants WHERE grant_number='FY19-FEMA'),
  'MAS ISWS 19-07 Bond', 'Bond County / ISWS 21-10 — historical project', '2019-09-01', '2022-09-30', 0, 0, 'active'
);

-- Tasks for all new projects (one generic task each for timesheet import)
INSERT INTO tasks (project_id, name, description, start_date, end_date, budget, estimated_hours, status)
SELECT id, name, 'Imported timesheet hours', start_date, end_date, 0, 0, 'active'
FROM projects WHERE name IN (
  'Lake County Sub', 'McHenry County Sub', 'GWRPC HMP',
  'IDNR OWR Model Database', 'IDNR OWR Inundation Mapping', 'IDNR OWR SAFR',
  'LOMR Review Work', 'ISGS LiDAR', 'IL Streams 2023',
  'Jersey County HMP', 'CACS GIST', 'CNMS',
  'MAS ISWS 20-11 Wayne', 'MAS ISWS 19-07 Bond'
);
