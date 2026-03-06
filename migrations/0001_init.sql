-- CHAMP PM Phase 1 Schema
-- See PHASE1.md for full documentation

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  title TEXT,
  classification TEXT,
  department TEXT DEFAULT 'CHAMP',
  start_date TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  funder TEXT NOT NULL,
  grant_number TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  total_budget REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grant_id INTEGER NOT NULL REFERENCES grants(id),
  name TEXT NOT NULL,
  description TEXT,
  start_date TEXT,
  end_date TEXT,
  budget REAL NOT NULL DEFAULT 0,
  estimated_hours REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  name TEXT NOT NULL,
  description TEXT,
  start_date TEXT,
  end_date TEXT,
  budget REAL NOT NULL DEFAULT 0,
  estimated_hours REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  allocated_hours REAL NOT NULL DEFAULT 0,
  allocated_pct REAL,
  start_date TEXT,
  end_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, task_id)
);

CREATE TABLE IF NOT EXISTS timesheet_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  entry_date TEXT NOT NULL,
  hours REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, task_id, entry_date)
);

CREATE TABLE IF NOT EXISTS timesheet_weeks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  week_start TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  review_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_timesheet_entries_user_date ON timesheet_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_task ON timesheet_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_task ON assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_projects_grant ON projects(grant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
