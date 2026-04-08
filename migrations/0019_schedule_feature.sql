-- Study areas (geographic destination spanning multiple grants/years)
CREATE TABLE study_areas (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'in_progress',
  notes        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Add project type and study area link to projects
ALTER TABLE projects ADD COLUMN project_type TEXT DEFAULT 'custom';
ALTER TABLE projects ADD COLUMN study_area_id INTEGER REFERENCES study_areas(id);

-- Schedule phases (horizontal Gantt bars — separate from budget tasks)
CREATE TABLE schedule_phases (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  start_date      TEXT NOT NULL,
  end_date        TEXT NOT NULL,
  duration_days   INTEGER,
  display_order   INTEGER NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Schedule milestones (vertical diamond markers)
CREATE TABLE schedule_milestones (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  target_date     TEXT NOT NULL,
  is_pop_anchor   INTEGER DEFAULT 0,
  is_key_decision INTEGER DEFAULT 0,
  display_order   INTEGER NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Cross-project dependencies (works across grants)
CREATE TABLE project_dependencies (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  upstream_project_id     INTEGER NOT NULL REFERENCES projects(id),
  downstream_project_id   INTEGER NOT NULL REFERENCES projects(id),
  upstream_milestone_id   INTEGER REFERENCES schedule_milestones(id),
  dependency_label        TEXT,
  notes                   TEXT,
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(upstream_project_id, downstream_project_id)
);

-- What-if scenarios (follows staff_plan_scenarios pattern)
CREATE TABLE schedule_scenarios (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_by  TEXT REFERENCES users(id),
  status      TEXT NOT NULL DEFAULT 'draft',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- What-if phase overrides (delta only — stores only what differs from base)
CREATE TABLE scenario_phase_overrides (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  scenario_id     INTEGER NOT NULL REFERENCES schedule_scenarios(id) ON DELETE CASCADE,
  phase_id        INTEGER NOT NULL REFERENCES schedule_phases(id),
  start_date      TEXT,
  end_date        TEXT,
  duration_days   INTEGER,
  notes           TEXT,
  UNIQUE(scenario_id, phase_id)
);

-- What-if milestone overrides (delta only)
CREATE TABLE scenario_milestone_overrides (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  scenario_id     INTEGER NOT NULL REFERENCES schedule_scenarios(id) ON DELETE CASCADE,
  milestone_id    INTEGER NOT NULL REFERENCES schedule_milestones(id),
  target_date     TEXT,
  notes           TEXT,
  UNIQUE(scenario_id, milestone_id)
);
