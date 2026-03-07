import { json, requireAdmin } from '../../_utils.js';

async function handleGet(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const url = new URL(request.url);
  const grant_id = url.searchParams.get('grant_id');

  let query = `
    SELECT p.*,
      g.name as grant_name,
      COALESCE(SUM(te.hours), 0) as hours_logged
    FROM projects p
    JOIN grants g ON g.id = p.grant_id
    LEFT JOIN tasks t ON t.project_id = p.id
    LEFT JOIN timesheet_entries te ON te.task_id = t.id
  `;
  const params = [];
  if (grant_id) {
    query += ' WHERE p.grant_id = ?';
    params.push(grant_id);
  }
  query += ' GROUP BY p.id ORDER BY p.name';

  const { results } = await env.DB.prepare(query).bind(...params).all();
  return json({ projects: results });
}

async function handlePost(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const {
    grant_id, name, description,
    start_date, end_date,
    budget = 0, estimated_hours = 0, status = 'active',
  } = body;

  if (!grant_id || !name) {
    return json({ error: 'grant_id and name are required' }, 400);
  }

  const result = await env.DB.prepare(`
    INSERT INTO projects (grant_id, name, description, start_date, end_date, budget, estimated_hours, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(grant_id, name, description || null, start_date || null, end_date || null, budget, estimated_hours, status).run();

  const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first();

  return json({ project }, 201);
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  return new Response('Method Not Allowed', { status: 405 });
}
