import { json, requireAdmin } from '../../_utils.js';

async function handleGet(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const url = new URL(request.url);
  const user_id = url.searchParams.get('user_id');
  const task_id = url.searchParams.get('task_id');

  let query = `
    SELECT a.*,
      u.name as user_name, u.title as user_title,
      t.name as task_name,
      p.name as project_name,
      g.name as grant_name,
      COALESCE(SUM(te.hours), 0) as hours_logged,
      (a.allocated_hours - COALESCE(SUM(te.hours), 0)) as hours_remaining
    FROM assignments a
    JOIN users u ON u.id = a.user_id
    JOIN tasks t ON t.id = a.task_id
    JOIN projects p ON p.id = t.project_id
    JOIN grants g ON g.id = p.grant_id
    LEFT JOIN timesheet_entries te ON te.task_id = a.task_id AND te.user_id = a.user_id
    WHERE 1=1
  `;
  const params = [];
  if (user_id) { query += ' AND a.user_id = ?'; params.push(user_id); }
  if (task_id) { query += ' AND a.task_id = ?'; params.push(task_id); }
  query += ' GROUP BY a.id ORDER BY u.name, t.name';

  const { results } = await env.DB.prepare(query).bind(...params).all();
  return json({ assignments: results });
}

async function handlePost(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const { user_id, task_id, allocated_hours = 0, allocated_pct, start_date, end_date, notes } = body;

  if (!user_id || !task_id) {
    return json({ error: 'user_id and task_id are required' }, 400);
  }

  try {
    const result = await env.DB.prepare(`
      INSERT INTO assignments (user_id, task_id, allocated_hours, allocated_pct, start_date, end_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(user_id, task_id, allocated_hours, allocated_pct || null, start_date || null, end_date || null, notes || null).run();

    const assignment = await env.DB.prepare(`
      SELECT a.*, u.name as user_name, t.name as task_name
      FROM assignments a
      JOIN users u ON u.id = a.user_id
      JOIN tasks t ON t.id = a.task_id
      WHERE a.id = ?
    `).bind(result.meta.last_row_id).first();

    return json({ assignment }, 201);
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      return json({ error: 'This user is already assigned to this task' }, 409);
    }
    throw err;
  }
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  return new Response('Method Not Allowed', { status: 405 });
}
