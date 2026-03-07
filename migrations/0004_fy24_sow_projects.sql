-- FY24 FEMA SOW Projects (Grant ID 7) - Added manually 2026-03-07

-- Project: PM SOW ISWS 24-01
INSERT INTO projects (grant_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (7, 'PM SOW ISWS 24-01', 'Program Management SOW - Statewide', '2024-10-01', '2026-09-30', 95000.00, 0, 'active');

INSERT INTO tasks (project_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES ((SELECT id FROM projects WHERE name = 'PM SOW ISWS 24-01' ORDER BY id DESC LIMIT 1),
'State and Local Business Plans and/or Updates', 'Business Plan (required)', '2024-10-01', '2026-09-30', 30000.00, 0, 'active');

INSERT INTO tasks (project_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES ((SELECT id FROM projects WHERE name = 'PM SOW ISWS 24-01' ORDER BY id DESC LIMIT 1),
'Global Program Management Activities', 'Program Management Plan', '2024-10-01', '2026-09-30', 25000.00, 0, 'active');

INSERT INTO tasks (project_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES ((SELECT id FROM projects WHERE name = 'PM SOW ISWS 24-01' ORDER BY id DESC LIMIT 1),
'Coordinated Needs Management Strategy (CNMS)', 'Program 24-01 CNMS', '2024-10-01', '2026-09-30', 30000.00, 0, 'active');

INSERT INTO tasks (project_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES ((SELECT id FROM projects WHERE name = 'PM SOW ISWS 24-01' ORDER BY id DESC LIMIT 1),
'Programmatic QA/QC Plans', 'Program 24-01 QA/QC Plan', '2024-10-01', '2026-09-30', 10000.00, 0, 'active');

-- Project: COMS SOW ISWS 24-02
INSERT INTO projects (grant_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES (7, 'COMS SOW ISWS 24-02', 'Communications & Outreach SOW - Statewide', '2024-10-01', '2026-09-30', 200000.00, 0, 'active');

INSERT INTO tasks (project_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES ((SELECT id FROM projects WHERE name = 'COMS SOW ISWS 24-02' ORDER BY id DESC LIMIT 1),
'COMS Engagement Plan', 'COMS Engagement/Business Plan', '2024-10-01', '2026-09-30', 10000.00, 0, 'active');

INSERT INTO tasks (project_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES ((SELECT id FROM projects WHERE name = 'COMS SOW ISWS 24-02' ORDER BY id DESC LIMIT 1),
'Strategic Planning for Community Engagement', 'COMS 24-02 Strategic Outreach', '2024-10-01', '2026-09-30', 35000.00, 0, 'active');

INSERT INTO tasks (project_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES ((SELECT id FROM projects WHERE name = 'COMS SOW ISWS 24-02' ORDER BY id DESC LIMIT 1),
'Mitigation Support', 'COMS 24-02 Recon Scoping', '2024-10-01', '2026-09-30', 15000.00, 0, 'active');

INSERT INTO tasks (project_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES ((SELECT id FROM projects WHERE name = 'COMS SOW ISWS 24-02' ORDER BY id DESC LIMIT 1),
'Communication and Outreach to Communities', 'COMS 24-02 Website maintenance/updates, database updates, outreach materials', '2024-10-01', '2026-09-30', 75000.00, 0, 'active');

INSERT INTO tasks (project_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES ((SELECT id FROM projects WHERE name = 'COMS SOW ISWS 24-02' ORDER BY id DESC LIMIT 1),
'Training and Community Capability Development', 'COMS 24-02 Floodplain management training', '2024-10-01', '2026-09-30', 20000.00, 0, 'active');

INSERT INTO tasks (project_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES ((SELECT id FROM projects WHERE name = 'COMS SOW ISWS 24-02' ORDER BY id DESC LIMIT 1),
'Mitigation Planning Technical Assistance', 'COMS 24-02 Technical Assistance & Toolkit', '2024-10-01', '2026-09-30', 40000.00, 0, 'active');

INSERT INTO tasks (project_id, name, description, start_date, end_date, budget, estimated_hours, status)
VALUES ((SELECT id FROM projects WHERE name = 'COMS SOW ISWS 24-02' ORDER BY id DESC LIMIT 1),
'Internal Partner Support Activities: Mentoring and/or Staffing', 'COMS 24-02 Mentoring', '2024-10-01', '2026-09-30', 5000.00, 0, 'active');
