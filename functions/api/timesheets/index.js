import { json } from '../../_utils.js';

function getWeekStart(dateStr) {
  const date = new Date(dateStr + 'T00:00:00Z');
  const day = date.getUTCDay(); // 0=Sun, 1=Mon
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setUTCDate(monday.getUTCDate() + diff);
  return monday.toISOString().split('T')[0];
}

async function handleGet(context) {
  const { env, data, request } = context;

  const url = new URL(request.url);
  const week = url.searchParams.get('week');

  if (!week) return json({ error: 'week parameter is required' }, 400);

  const weekEnd = new Date(week + 'T00:00:00Z');
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  let query = `
    SELECT te.*,
      t.name as task_name,
      p.name as project_name,
      p.id as project_id,
      g.name as grant_name,
      g.id as grant_id,
      u.name as user_name
    FROM timesheet_entries te
    JOIN tasks t ON t.id = te.task_id
    JOIN projects p ON p.id = t.project_id
    JOIN grants g ON g.id = p.grant_id
    JOIN users u ON u.id = te.user_id
    WHERE te.entry_date >= ? AND te.entry_date <= ?
  `;
  const params = [week, weekEndStr];

  if (data.role !== 'admin') {
    query += ' AND te.user_id = ?';
    params.push(data.userId);
  }
  query += ' ORDER BY te.entry_date, te.task_id';

  const { results: entries } = await env.DB.prepare(query).bind(...params).all();
  return json({ entries, week, week_end: weekEndStr });
}

async function handlePost(context) {
  const { env, data, request } = context;
  const body = await request.json();
  const { task_id, entry_date, hours, notes } = body;

  if (!task_id || !entry_date || hours === undefined) {
    return json({ error: 'task_id, entry_date, and hours are required' }, 400);
  }

  let user_id = data.userId;
  if (data.role === 'admin' && body.user_id) {
    user_id = body.user_id;
  }

  // For non-admin: check week isn't locked
  if (data.role !== 'admin') {
    const weekStart = getWeekStart(entry_date);
    const weekStatus = await env.DB.prepare(
      'SELECT status FROM timesheet_weeks WHERE user_id = ? AND week_start = ?'
    ).bind(user_id, weekStart).first();

    if (weekStatus && ['submitted', 'approved'].includes(weekStatus.status)) {
      return json({ error: 'Cannot edit entries for a submitted or approved week' }, 403);
    }
  }

  await env.DB.prepare(`
    INSERT INTO timesheet_entries (user_id, task_id, entry_date, hours, notes)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, task_id, entry_date) DO UPDATE SET
      hours = excluded.hours,
      notes = excluded.notes,
      updated_at = datetime('now')
  `).bind(user_id, task_id, entry_date, hours, notes || null).run();

  const entry = await env.DB.prepare(`
    SELECT te.*, t.name as task_name
    FROM timesheet_entries te
    JOIN tasks t ON t.id = te.task_id
    WHERE te.user_id = ? AND te.task_id = ? AND te.entry_date = ?
  `).bind(user_id, task_id, entry_date).first();

  return json({ entry }, 201);
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  return new Response('Method Not Allowed', { status: 405 });
}
