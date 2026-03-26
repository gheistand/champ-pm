CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT, -- "federal", "state", "local", "private", "nonprofit", "other"
  website TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER REFERENCES organizations(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS contact_grant_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  grant_id INTEGER NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
  relationship_type TEXT, -- "program officer", "subrecipient", "partner", "consultant", "other"
  UNIQUE(contact_id, grant_id)
);

CREATE TABLE IF NOT EXISTS interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  grant_id INTEGER REFERENCES grants(id),
  user_id TEXT NOT NULL, -- email-prefix format (e.g. "heistand")
  type TEXT NOT NULL, -- "call", "email", "meeting", "other"
  interaction_date TEXT NOT NULL,
  notes TEXT,
  next_action TEXT,
  next_action_due TEXT,
  next_action_done INTEGER DEFAULT 0,
  created_at TEXT
);
