-- Persistent mapping tables for recurring timesheet CSV import

CREATE TABLE IF NOT EXISTS timesheet_project_map (
  csv_name TEXT PRIMARY KEY,
  task_id  INTEGER REFERENCES tasks(id),
  notes    TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS timesheet_staff_map (
  csv_name TEXT PRIMARY KEY,   -- "Last, First" as it appears in CSV
  user_id  TEXT REFERENCES users(id),
  notes    TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ── Project map seed ─────────────────────────────────────────────────────────
INSERT OR IGNORE INTO timesheet_project_map (csv_name, task_id, notes) VALUES
-- Overhead (grant 19)
('Leave',           338, 'Annual/Sick Leave → Leave project'),
('CHAMP',           340, 'CHAMP Admin overhead'),
('PD',              341, 'Professional Development'),
('Prof_Org',        342, 'Professional Organizations'),
('General',         343, 'General overhead'),
('CNMS',            355, 'CNMS program work'),
('incidental non-FEMA', 343, 'Non-FEMA incidental → General overhead'),
('Proposal Prep- non FEMA', 343, 'Non-FEMA proposal prep → General overhead'),
-- FY24 FEMA (grant 7)
('03_Peoria_PPP_Eff',          3,  'MAS ISWS 24-03'),
('04_McHenry_PPP_Eff',         8,  'MAS ISWS 24-04'),
('05_McDonough_PPP_Eff',       13, 'MAS ISWS 24-05'),
('05_McDonough_QR2_OH',        13, 'MAS ISWS 24-05 phase 2'),
('06_Johnson_QR1_OH',          18, 'MAS ISWS 24-06'),
('07_Bureau_QR1_OH',           25, 'MAS ISWS 24-07'),
('08_Kishwaukee_Phase_5_DD',   32, 'MAS ISWS 24-08'),
('09_Macoupin_QR1-QR3',        43, 'MAS ISWS 24-09'),
('10_Embarras_Tribs_DD',       48, 'MAS ISWS 24-10'),
('10_Embarras_River_Hydraulics_DD', 48, 'MAS ISWS 24-10 hydraulics'),
('Proposal Prep- FEMA/Business Plan', 61, 'PM SOW ISWS 24-01'),
('02_COMS',                    65, 'COMS SOW ISWS 24-02'),
-- FY23 FEMA (grant 11)
('08_Kishwaukee_Phase_4_KDP2', 116, 'MAS ISWS 23-08'),
('06_Edwards_QR1_OH',          102, 'MAS ISWS 23-06'),
('07_Wabash_QR1_OH',           109, 'MAS ISWS 23-07'),
('09_Alexander_Pulaski_DD',    126, 'MAS ISWS 23-09'),
('13_Whiteside_GR_WD_MD_DD',   153, 'MAS ISWS 23-13'),
('14_Kaskaskia_Survey_DD',     162, 'MAS ISWS 23-14'),
-- FY22 FEMA (grant 13)
('08KaskaskiaR_ModelReview_Pre_DD_Scoping', 215, 'MAS ISWS 22-08'),
('07EmbarrasR_Mainstem_Hydro_Survey',       205, 'MAS ISWS 22-07'),
('03Richland_DFIRM_QR2_Eff',               180, 'MAS ISWS 22-03'),
('04Cook_Poplar_Spring_PMR_Add_Funds',      195, 'MAS ISWS 22-05'),
('05Kane_Poplar_Spring_PMR_Add_Funds',      195, 'MAS ISWS 22-05'),
('09Kishwaukee_HUC8_Phase3_Survey',         220, 'MAS ISWS 22-09'),
('02Bond_DFIRM_QR2_Eff',                   170, 'MAS ISWS 22-02'),
('11White_DD',                             229, 'MAS ISWS 22-11'),
-- FY21 FEMA (grant 14)
('02RockIsland_DD_KDP2',   1,   'MAS ISWS 21-02 / Rock Island'),
('06Montgomery_DD_KDP2',   289, 'MAS ISWS 21-06'),
('07Hamilton_DD_KDP2',     300, 'MAS ISWS 21-07'),
('05Stark_DFIRM',          273, 'MAS ISWS 21-05'),
('12Kishwaukee_Phase2',    329, 'MAS ISWS 21-12'),
('04Henry_DD_KDP2',        266, 'MAS ISWS 21-04'),
('03Whiteside_DD_KDP2',    258, 'MAS ISWS 21-03'),
('07Bond&ISWS21_10',       357, 'MAS ISWS 19-07 Bond historical'),
-- FY20/FY19 historical
('11Wayne',    356, 'MAS ISWS 20-11 Wayne (historical)'),
-- DHS Sub grants
('McHenry',   345, 'DHS Sub McHenry County'),
('Lake',      344, 'DHS Sub Lake County'),
('GWRPC_HMP', 346, 'GWRPC HMP'),
-- IDNR OWR
('FY25-26_Task 1 SAFR',              349, 'IDNR OWR SAFR'),
('FY25-26_Task 2 Inundation Mapping',348, 'IDNR OWR Inundation Mapping'),
('FY25-26_Task 3 Model DB',          347, 'IDNR OWR Model Database'),
-- Other grants
('ISGS_LIDAR',    351, 'ISGS LiDAR'),
('IL Streams 2023',352,'IL Streams 2023'),
('Jersey_HMP',    353, 'Jersey County HMP'),
('CACS_GIST',     354, 'ResMit CACS GIST'),
-- LOMR Reviews (all private LOMR projects)
('Mink_Ck_LOMR',                    350, 'LOMR Review'),
('Henderson_RA',                    350, 'LOMR Review'),
('TechyDrain_CovenantLiving_Northbrook', 350, 'LOMR Review'),
('WestBank_IM_Canal_Fiddyment',     350, 'LOMR Review'),
('River_Edge_Park',                 350, 'LOMR Review'),
('Lincoln_Prairie_Phase2',          350, 'LOMR Review'),
('Harrison_St_Bridge_Replacement',  350, 'LOMR Review'),
('EakinCreek_PingreeGrove',         350, 'LOMR Review'),
('MWRD_Prairie_Ck_FloodControl_CLOMR', 350, 'LOMR Review'),
('SpringBrook_No1',                 350, 'LOMR Review'),
('River_Stone_Quarry_LaSalle',      350, 'LOMR Review'),
('Piper_Glen',                      350, 'LOMR Review'),
('Piper Glen',                      350, 'LOMR Review'),
('Xacto',                           350, 'LOMR Review'),
('Unnamed_Trib_Relocation_Enhancement', 350, 'LOMR Review'),
('Plainjar_Property',               350, 'LOMR Review'),
('Ashton_Estate_North',             350, 'LOMR Review'),
('Brookside Creek Retail Center',   350, 'LOMR Review'),
('Conservancy_NH2',                 350, 'LOMR Review'),
('43W126_Empire_Rd',                350, 'LOMR Review'),
('Town Center Pointe',              350, 'LOMR Review'),
('1900_SpringRd_North',             350, 'LOMR Review'),
('Love''s_Wilmington_Site',         350, 'LOMR Review'),
('Riverstone_Subdivision',          350, 'LOMR Review'),
('The_Highlands_Subdivision',       350, 'LOMR Review'),
('Shorewood_Dev_Gp_BuffaloGrv',     350, 'LOMR Review'),
('Hoffman_Estates_LOMR',            350, 'LOMR Review'),
('BoneyardCk_Neil_Bradley',         350, 'LOMR Review'),
('G&M Farms',                       350, 'LOMR Review'),
('Kedzie_Avenue_Parcel',            350, 'LOMR Review'),
('Romeoville_Highpoint_Rdwy_Ext',   350, 'LOMR Review'),
('ADM_Decatur_Hillside',            350, 'LOMR Review'),
('Greenhill_Subdivision',           350, 'LOMR Review'),
('Conservancy_Neigboorhood_3B',     350, 'LOMR Review'),
('Ginger_Ales_LOMR',                350, 'LOMR Review'),
('Yorkville-Bristol_Sanitary_District_Solids_Handling_Improvements', 350, 'LOMR Review'),
('Four_Rivers_San_Auth_Northern_Expansion', 350, 'LOMR Review'),
('Brandon Road LD',                 350, 'LOMR Review'),
('14690_Fox_Hollow_Ln_Lemont',      350, 'LOMR Review'),
('Lincoln Prairie - Phase 1',       350, 'LOMR Review'),
('Third_Coast_Intermodal',          350, 'LOMR Review'),
('9th_Street_Detention',            350, 'LOMR Review'),
('Kankakee_Elks_Lodge_627',         350, 'LOMR Review'),
('Conservency_Neighborhoods_4-11',  350, 'LOMR Review'),
('Big_Sandy_N_Little_Sandy_Creek',  350, 'LOMR Review'),
('11_Middle&Lower_Wabash_Outreach', 350, 'LOMR Review'),
('Village_of_Kirkland_Bull_Run_Creek', 350, 'LOMR Review'),
('Chicago_Botanical_Gardens',       350, 'LOMR Review'),
('Jacobs_Field',                    350, 'LOMR Review'),
('Wood_River_Appeal',               350, 'LOMR Review'),
('ComEd_TSS64_Bellwood_Substation', 350, 'LOMR Review'),
('3111_Cara_Lane',                  350, 'LOMR Review'),
('6S700IL_Route53',                 350, 'LOMR Review'),
('Crystal_lake_CLOMR',              350, 'LOMR Review'),
('1901_SelmartenRd_Aurora',         350, 'LOMR Review');

-- ── Staff map seed ───────────────────────────────────────────────────────────
-- Explicit overrides for names that don't follow "First Last" ↔ "Last, First"
INSERT OR IGNORE INTO timesheet_staff_map (csv_name, user_id, notes) VALUES
('Healy, Conor (old David Lentzner)', 'chealy',      'Conor Healy (former David Lentzner)'),
('Fuller, Shelly',                    'mlfuller',    'Michelle (Shelly) Fuller'),
('Byard, Jennifer',                   'jbyard',      'Jennifer Byard'),
('Byard, Greg',                       'byard',       'Greg Byard');
