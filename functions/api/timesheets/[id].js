import { json } from '../../_utils.js';

function getWeekStart(dateStr) {
  const date = new Date(dateStr + 'T00:00:00Z');
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setUTCDate(monday.getUTCDate() + diff);
  return monday.toISOString().split('T')[0];
}

export async function onRequestDelete(context) {
  const { env, data, params } = context;
  const { id } = params;

  const entry = await env.DB.prepare('SELECT * FROM timesheet_entries WHERE id = ?').bind(id).first();
  if (!entry) return json({ error: 'Entry not found' }, 404);

  if (data.role !== 'admin' && entry.user_id !== data.userId) {
    return json({ error: 'Forbidden' }, 403);
  }

  if (data.role !== 'admin') {
    const weekStart = getWeekStart(entry.entry_date);
    const weekStatus = await env.DB.prepare(
      'SELECT status FROM timesheet_weeks WHERE user_id = ? AND week_start = ?'
    ).bind(entry.user_id, weekStart).first();

    if (weekStatus && ['submitted', 'approved'].includes(weekStatus.status)) {
      return json({ error: 'Cannot delete entries for a submitted or approved week' }, 403);
    }
  }

  await env.DB.prepare('DELETE FROM timesheet_entries WHERE id = ?').bind(id).run();
  return json({ success: true });
}
