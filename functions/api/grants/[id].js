import { json, requireAdmin } from '../../_utils.js';

async function handleGet(context) {
  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;

  const grant = await env.DB.prepare('SELECT * FROM grants WHERE id = ?').bind(id).first();
  if (!grant) return json({ error: 'Grant not found' }, 404);

  const { results: projects } = await env.DB.prepare(`
    SELECT p.*,
      COALESCE(SUM(te.hours), 0) as hours_logged
    FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id
    LEFT JOIN timesheet_entries te ON te.task_id = t.id
    WHERE p.grant_id = ?
    GROUP BY p.id
    ORDER BY p.name
  `).bind(id).all();

  return json({ grant, projects });
}

async function handlePut(context) {
  const { env, data, request, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;
  const body = await request.json();

  const fields = [];
  const values = [];

  const updatable = ['name', 'funder', 'grant_number', 'start_date', 'end_date', 'total_budget', 'status', 'notes'];
  for (const field of updatable) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (fields.length === 0) return json({ error: 'No fields to update' }, 400);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await env.DB.prepare(`UPDATE grants SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  const grant = await env.DB.prepare('SELECT * FROM grants WHERE id = ?').bind(id).first();
  if (!grant) return json({ error: 'Grant not found' }, 404);

  return json({ grant });
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'PUT') return handlePut(context);
  return new Response('Method Not Allowed', { status: 405 });
}
