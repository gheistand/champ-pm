import { json, requireAdmin } from '../../_utils.js';

// Accepts a batch of pre-mapped timesheet entries and inserts them.
// Uses INSERT OR IGNORE so re-importing the same date range is safe.
// Also upserts timesheet_weeks records.
export async function onRequestPost(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { entries = [], weeks = [] } = body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return json({ error: 'entries array is required' }, 400);
    }

    let inserted = 0;
    let skipped = 0;
    let week_inserted = 0;

    // Insert timesheet_weeks first (INSERT OR IGNORE)
    for (const w of weeks) {
      const result = await env.DB.prepare(
        `INSERT OR IGNORE INTO timesheet_weeks (user_id, week_start, status)
         VALUES (?, ?, 'approved')`
      ).bind(w.user_id, w.week_start).run();
      if (result.meta?.changes > 0) week_inserted++;
    }

    // Insert entries in chunks using D1 batch
    const CHUNK = 80; // D1 batch limit is ~100 statements
    for (let i = 0; i < entries.length; i += CHUNK) {
      const chunk = entries.slice(i, i + CHUNK);
      const stmts = chunk.map(e =>
        env.DB.prepare(
          `INSERT OR IGNORE INTO timesheet_entries
             (user_id, task_id, entry_date, hours, notes)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(e.user_id, e.task_id, e.entry_date, e.hours, e.notes || null)
      );
      const results = await env.DB.batch(stmts);
      for (const r of results) {
        if (r.meta?.changes > 0) inserted++;
        else skipped++;
      }
    }

    return json({ inserted, skipped, week_inserted });
  } catch (err) {
    return json({ error: err.message || 'Batch insert failed' }, 500);
  }
}
