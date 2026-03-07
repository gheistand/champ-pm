import { json, requireAdmin } from '../../_utils.js';

async function handleGet(context) {
  const { env, data } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { results } = await env.DB.prepare(`
    SELECT g.*,
      COUNT(DISTINCT p.id) as project_count,
      COALESCE(SUM(te.hours), 0) as hours_logged
    FROM grants g
    LEFT JOIN projects p ON p.grant_id = g.id
    LEFT JOIN tasks t ON t.project_id = p.id
    LEFT JOIN timesheet_entries te ON te.task_id = t.id
    GROUP BY g.id
    ORDER BY g.name
  `).all();

  return json({ grants: results });
}

async function handlePost(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const {
    name, funder, grant_number,
    start_date, end_date,
    total_budget = 0, status = 'active', notes,
  } = body;

  if (!name || !funder || !start_date || !end_date) {
    return json({ error: 'name, funder, start_date, and end_date are required' }, 400);
  }

  const result = await env.DB.prepare(`
    INSERT INTO grants (name, funder, grant_number, start_date, end_date, total_budget, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(name, funder, grant_number || null, start_date, end_date, total_budget, status, notes || null).run();

  const grant = await env.DB.prepare('SELECT * FROM grants WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first();

  return json({ grant }, 201);
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  return new Response('Method Not Allowed', { status: 405 });
}
