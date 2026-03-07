import { json, requireAdmin } from '../../_utils.js';

async function handleGet(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const url = new URL(request.url);
  const project_id = url.searchParams.get('project_id');

  let query = `
    SELECT t.*,
      p.name as project_name,
      g.name as grant_name,
      g.id as grant_id,
      COALESCE(SUM(te.hours), 0) as hours_logged,
      GROUP_CONCAT(u.name, ', ') as assigned_staff
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN grants g ON g.id = p.grant_id
    LEFT JOIN timesheet_entries te ON te.task_id = t.id
    LEFT JOIN assignments a ON a.task_id = t.id
    LEFT JOIN users u ON u.id = a.user_id
  `;
  const params = [];
  if (project_id) {
    query += ' WHERE t.project_id = ?';
    params.push(project_id);
  }
  query += ' GROUP BY t.id ORDER BY t.name';

  const { results } = await env.DB.prepare(query).bind(...params).all();
  return json({ tasks: results });
}

async function handlePost(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const {
    project_id, name, description,
    start_date, end_date,
    budget = 0, estimated_hours = 0, status = 'active',
  } = body;

  if (!project_id || !name) {
    return json({ error: 'project_id and name are required' }, 400);
  }

  const result = await env.DB.prepare(`
    INSERT INTO tasks (project_id, name, description, start_date, end_date, budget, estimated_hours, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(project_id, name, description || null, start_date || null, end_date || null, budget, estimated_hours, status).run();

  const task = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first();

  return json({ task }, 201);
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  return new Response('Method Not Allowed', { status: 405 });
}
