import { json, requireAdmin } from '../../_utils.js';

async function handleGet(context) {
  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;

  const project = await env.DB.prepare(`
    SELECT p.*, g.name as grant_name
    FROM projects p
    JOIN grants g ON g.id = p.grant_id
    WHERE p.id = ?
  `).bind(id).first();

  if (!project) return json({ error: 'Project not found' }, 404);

  const { results: tasks } = await env.DB.prepare(`
    SELECT t.*,
      COALESCE(SUM(te.hours), 0) as hours_logged,
      COUNT(DISTINCT a.user_id) as assigned_count
    FROM tasks t
    LEFT JOIN timesheet_entries te ON te.task_id = t.id
    LEFT JOIN assignments a ON a.task_id = t.id
    WHERE t.project_id = ?
    GROUP BY t.id
    ORDER BY t.name
  `).bind(id).all();

  return json({ project, tasks });
}

async function handlePut(context) {
  const { env, data, request, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;
  const body = await request.json();

  const fields = [];
  const values = [];

  const updatable = ['name', 'description', 'start_date', 'end_date', 'budget', 'estimated_hours', 'status'];
  for (const field of updatable) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (fields.length === 0) return json({ error: 'No fields to update' }, 400);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await env.DB.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
  if (!project) return json({ error: 'Project not found' }, 404);

  return json({ project });
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'PUT') return handlePut(context);
  if (context.request.method === 'DELETE') return handleDelete(context);
  return new Response('Method Not Allowed', { status: 405 });
}

async function handleDelete(context) {
  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;
  const { id } = params;
  const { results: tasks } = await env.DB.prepare('SELECT id FROM tasks WHERE project_id = ?').bind(id).all();
  if (tasks.length > 0) {
    return json({ error: `Cannot delete: this project has ${tasks.length} task(s). Delete them first.` }, 409);
  }
  await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
  return json({ success: true });
}
