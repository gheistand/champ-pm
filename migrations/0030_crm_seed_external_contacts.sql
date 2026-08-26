-- Seed CRM with external contacts pulled from Glenn's inbox (2026-08-26)
-- Orgs outside CHAMP: FEMA R5, IL DNR, mapping subcontractors, PRI sister units,
-- SPA/grants admin, and floodplain-management associations/local govts.
-- NOTE: John Wethington (id=1) already exists from prior use; this migration
-- links him to the new FEMA Region 5 org rather than re-inserting him.

-- ── Organizations ──────────────────────────────────────────────────────────

INSERT INTO organizations (name, type, website, notes, created_at, updated_at) VALUES
  ('FEMA Region 5', 'federal', 'https://www.fema.gov', 'Risk MAP program office overseeing ISWS CTP/CCS agreements; runs monthly ISWS-IDNR-FEMA status call.', datetime('now'), datetime('now')),
  ('Illinois Department of Natural Resources - Office of Water Resources', 'state', 'https://dnr.illinois.gov', 'State floodplain/mapping partner on FEMA Risk MAP projects.', datetime('now'), datetime('now')),
  ('Michael Baker International', 'private', 'https://mbakerintl.com', 'FEMA Region 5 mapping subcontractor.', datetime('now'), datetime('now')),
  ('Niyam IT', 'private', 'https://niyamit.com', 'RSC (Risk Support Contractor) for FEMA Region 5 mapping program.', datetime('now'), datetime('now')),
  ('Freese and Nichols', 'private', 'https://freese.com', 'FEMA Region 5 mapping subcontractor.', datetime('now'), datetime('now')),
  ('WSP', 'private', 'https://www.wsp.com', 'FEMA Region 5 mapping subcontractor.', datetime('now'), datetime('now')),
  ('CLB Engineering Corporation', 'private', 'https://clbengineering.com', 'NSF PESOSE proposal collaborator (letters of collaboration).', datetime('now'), datetime('now')),
  ('UIUC Sponsored Programs Administration', 'other', 'https://spa.uillinois.edu', 'Central university grants/contracts office; processes FEMA and NSF award actions for ISWS.', datetime('now'), datetime('now')),
  ('Illinois State Geological Survey', 'other', 'https://isgs.illinois.edu', 'Sister survey under Prairie Research Institute; LiDAR data processing funding coordination.', datetime('now'), datetime('now')),
  ('Association of State Floodplain Managers (ASFPM)', 'nonprofit', 'https://www.floods.org', 'Professional association; RASPLOT/committee co-chair coordination.', datetime('now'), datetime('now')),
  ('Lake County IL Stormwater Management Commission', 'local', 'https://www.lakecountyil.gov/', 'Local stormwater agency; IAFSM-ASFPM agreement coordination.', datetime('now'), datetime('now')),
  ('Rock Island County, IL', 'local', 'https://www.rockislandcountyil.gov/', 'County government; floodplain management / CFM coordination.', datetime('now'), datetime('now'));

-- ── Link existing contact (Wethington) to new FEMA Region 5 org ────────────

UPDATE contacts
SET org_id = (SELECT id FROM organizations WHERE name = 'FEMA Region 5'),
    updated_at = datetime('now')
WHERE id = 1 AND email = 'john.wethington@fema.dhs.gov';

-- ── Contacts ─────────────────────────────────────────────────────────────

-- FEMA Region 5
INSERT INTO contacts (org_id, first_name, last_name, email, phone, role, notes, created_at, updated_at) VALUES
  ((SELECT id FROM organizations WHERE name = 'FEMA Region 5'), 'Richard', 'Moricz', 'richard.moricz@fema.dhs.gov', NULL, 'Program Officer', 'Program Officer for EMC-2022-CA-00011 (AJ190 amendment).', datetime('now'), datetime('now')),
  ((SELECT id FROM organizations WHERE name = 'FEMA Region 5'), 'Michelle', 'Johnson', 'michelle.johnson4@fema.dhs.gov', '(202) 813-2516', 'Grants Management Specialist', 'Grants Management Division, FEMA Region 5.', datetime('now'), datetime('now')),
  ((SELECT id FROM organizations WHERE name = 'FEMA Region 5'), 'Chad', 'Lanctot', 'chad.lanctot@fema.dhs.gov', NULL, NULL, 'CC on ISWS monthly status call thread.', datetime('now'), datetime('now')),
  ((SELECT id FROM organizations WHERE name = 'FEMA Region 5'), 'Jacob', 'Pierce', 'jacob.pierce@fema.dhs.gov', NULL, NULL, 'CC on ISWS monthly status call thread.', datetime('now'), datetime('now'));

-- Illinois DNR
INSERT INTO contacts (org_id, first_name, last_name, email, phone, role, notes, created_at, updated_at) VALUES
  ((SELECT id FROM organizations WHERE name = 'Illinois Department of Natural Resources - Office of Water Resources'), 'Steve', 'Altman', 'steve.altman@illinois.gov', NULL, NULL, 'ISWS-IDNR-FEMA monthly status call participant.', datetime('now'), datetime('now')),
  ((SELECT id FROM organizations WHERE name = 'Illinois Department of Natural Resources - Office of Water Resources'), 'Erin', 'Conley', 'Erin.C.Conley@Illinois.gov', NULL, NULL, 'ISWS-IDNR-FEMA monthly status call participant.', datetime('now'), datetime('now')),
  ((SELECT id FROM organizations WHERE name = 'Illinois Department of Natural Resources - Office of Water Resources'), 'Mark', 'Hoskins', 'Mark.Hoskins@Illinois.gov', NULL, NULL, 'ISWS-IDNR-FEMA monthly status call participant.', datetime('now'), datetime('now')),
  ((SELECT id FROM organizations WHERE name = 'Illinois Department of Natural Resources - Office of Water Resources'), 'Michelle', 'Staff', 'Michelle.Staff@Illinois.gov', NULL, NULL, 'ISWS-IDNR-FEMA monthly status call participant.', datetime('now'), datetime('now'));

-- Mapping subcontractors
INSERT INTO contacts (org_id, first_name, last_name, email, phone, role, notes, created_at, updated_at) VALUES
  ((SELECT id FROM organizations WHERE name = 'Michael Baker International'), 'Matthew', 'Richards', 'MRichards@mbakerintl.com', NULL, NULL, 'FEMA Region 5 mapping program contact.', datetime('now'), datetime('now')),
  ((SELECT id FROM organizations WHERE name = 'Niyam IT'), 'Betsy', 'Finlay', 'bfinlay@niyamit.com', NULL, 'RSC', 'Risk Support Contractor coordinating SID letters/LOMC issues.', datetime('now'), datetime('now')),
  ((SELECT id FROM organizations WHERE name = 'Freese and Nichols'), 'Caroline', 'Jones', 'Caroline.Jones@freese.com', NULL, NULL, 'FEMA Region 5 mapping program contact.', datetime('now'), datetime('now')),
  ((SELECT id FROM organizations WHERE name = 'WSP'), 'Daniel', 'Cameron', 'daniel.cameron@wsp.com', NULL, NULL, 'FEMA Region 5 mapping program contact.', datetime('now'), datetime('now')),
  ((SELECT id FROM organizations WHERE name = 'WSP'), 'Linnea', 'Hruska', 'linnea.hruska@wsp.com', NULL, NULL, 'FEMA Region 5 mapping program contact.', datetime('now'), datetime('now')),
  ((SELECT id FROM organizations WHERE name = 'WSP'), 'Tripp', 'Spear', 'tripp.spear@wsp.com', NULL, NULL, 'FEMA Region 5 mapping program contact.', datetime('now'), datetime('now'));

-- NSF collaborator
INSERT INTO contacts (org_id, first_name, last_name, email, phone, role, notes, created_at, updated_at) VALUES
  ((SELECT id FROM organizations WHERE name = 'CLB Engineering Corporation'), 'William', 'Katzenmeyer', 'bill@clbengineering.com', '504-390-9387', 'Owner/Vice President', 'P.E., C.F.M. Letter of collaboration for NSF PESOSE proposal (330550).', datetime('now'), datetime('now')),
  ((SELECT id FROM organizations WHERE name = 'CLB Engineering Corporation'), 'Jacob', 'Beatty', 'jacob@clbengineering.com', '205-913-7075', NULL, 'Provided NSF training certs / bio sketch for PESOSE proposal.', datetime('now'), datetime('now'));

-- UIUC Sponsored Programs Administration
INSERT INTO contacts (org_id, first_name, last_name, email, phone, role, notes, created_at, updated_at) VALUES
  ((SELECT id FROM organizations WHERE name = 'UIUC Sponsored Programs Administration'), 'Kari', 'Woodrum', 'kwoodrum@illinois.edu', '217.300.2609', 'Grants & Contracts Asst', 'VCRI/PRI grants support; handles NSF proposal submissions (PESOSE).', datetime('now'), datetime('now')),
  ((SELECT id FROM organizations WHERE name = 'UIUC Sponsored Programs Administration'), 'Lisa', 'Young', 'llyoung@illinois.edu', '217.244.2654', 'Grants & Contracts Coordinator - ISWS Portfolio', 'Handles FEMA award amendments (EMC-2022-CA-00011 / AJ190).', datetime('now'), datetime('now')),
  ((SELECT id FROM organizations WHERE name = 'UIUC Sponsored Programs Administration'), 'Tamara', 'Chapman', 'chapman2@illinois.edu', '217-333-4849', 'Senior Award Management Coordinator, NSF Awards', 'Processes FEMA/NSF award amendments for ISWS.', datetime('now'), datetime('now'));

-- ISGS
INSERT INTO contacts (org_id, first_name, last_name, email, phone, role, notes, created_at, updated_at) VALUES
  ((SELECT id FROM organizations WHERE name = 'Illinois State Geological Survey'), 'Sheena', 'Beaverson', 'sbeavers@illinois.edu', '217.244.9306', 'Associate Research Scientist', 'Coordinating LiDAR processing funding support for Jefferson/Huda from ISGS mine-mapping grant.', datetime('now'), datetime('now'));

-- Associations / local govt
INSERT INTO contacts (org_id, first_name, last_name, email, phone, role, notes, created_at, updated_at) VALUES
  ((SELECT id FROM organizations WHERE name = 'Association of State Floodplain Managers (ASFPM)'), 'Cate', 'Secora', 'cate@floods.org', NULL, NULL, 'Committee co-chairs meeting coordination.', datetime('now'), datetime('now')),
  ((SELECT id FROM organizations WHERE name = 'Lake County IL Stormwater Management Commission'), 'Sharon', 'Osterby', 'SOsterby@lakecountyil.gov', NULL, NULL, 'IAFSM-ASFPM agreement update coordination.', datetime('now'), datetime('now')),
  ((SELECT id FROM organizations WHERE name = 'Rock Island County, IL'), 'Greg', 'Thorpe', 'gthorpe@rockislandcountyil.gov', NULL, NULL, 'IAFSM-ASFPM agreement / Illinois CFM discussion.', datetime('now'), datetime('now'));
