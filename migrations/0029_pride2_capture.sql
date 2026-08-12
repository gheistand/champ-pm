-- PRIDE 2.0 discovery capture log.
-- Temporary scaffold: lets the pride2 bookmarklet POST raw JSON responses
-- from PRIDE 2.0's REST endpoints so Glenn + agent can inspect real field
-- shapes together before writing the real sync logic in
-- functions/api/pride2/sync.js. Safe to drop once PRIDE 2.0 sync is final.
CREATE TABLE IF NOT EXISTS pride2_capture_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL,          -- which PRIDE 2.0 endpoint this came from, e.g. 'staff-plan/plans'
  params TEXT,                     -- JSON string of query params used for the request, if any
  raw_response TEXT NOT NULL,      -- raw JSON response body, as-is
  captured_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pride2_capture_endpoint ON pride2_capture_log(endpoint, captured_at);
