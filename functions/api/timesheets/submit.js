import { json } from '../../_utils.js';

export async function onRequestPost(context) {
  const { env, data, request } = context;

  const url = new URL(request.url);
  const week = url.searchParams.get('week');

  if (!week) return json({ error: 'week parameter is required' }, 400);

  const user_id = data.userId;

  const weekEnd = new Date(week + 'T00:00:00Z');
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const { results: entries } = await env.DB.prepare(`
    SELECT id FROM timesheet_entries
    WHERE user_id = ? AND entry_date >= ? AND entry_date <= ?
  `).bind(user_id, week, weekEndStr).all();

  if (entries.length === 0) {
    return json({ error: 'No timesheet entries found for this week' }, 400);
  }

  await env.DB.prepare(`
    INSERT INTO timesheet_weeks (user_id, week_start, status, submitted_at)
    VALUES (?, ?, 'submitted', datetime('now'))
    ON CONFLICT(user_id, week_start) DO UPDATE SET
      status = 'submitted',
      submitted_at = datetime('now'),
      review_notes = NULL,
      reviewed_by = NULL,
      reviewed_at = NULL
  `).bind(user_id, week).run();

  const weekRecord = await env.DB.prepare(
    'SELECT * FROM timesheet_weeks WHERE user_id = ? AND week_start = ?'
  ).bind(user_id, week).first();

  return json({ week: weekRecord });
}
