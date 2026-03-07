import { json, requireAdmin } from '../../_utils.js';

async function handlePut(context) {
  const { env, data, request, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;
  const body = await request.json();

  const fields = [];
  const values = [];

  const updatable = ['allocated_hours', 'allocated_pct', 'start_date', 'end_date', 'notes'];
  for (const field of updatable) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (fields.length === 0) return json({ error: 'No fields to update' }, 400);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await env.DB.prepare(`UPDATE assignments SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  const assignment = await env.DB.prepare(`
    SELECT a.*, u.name as user_name, t.name as task_name
    FROM assignments a
    JOIN users u ON u.id = a.user_id
    JOIN tasks t ON t.id = a.task_id
    WHERE a.id = ?
  `).bind(id).first();

  if (!assignment) return json({ error: 'Assignment not found' }, 404);
  return json({ assignment });
}

async function handleDelete(context) {
  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;

  const existing = await env.DB.prepare('SELECT id FROM assignments WHERE id = ?').bind(id).first();
  if (!existing) return json({ error: 'Assignment not found' }, 404);

  await env.DB.prepare('DELETE FROM assignments WHERE id = ?').bind(id).run();
  return json({ success: true });
}

export async function onRequest(context) {
  if (context.request.method === 'PUT') return handlePut(context);
  if (context.request.method === 'DELETE') return handleDelete(context);
  return new Response('Method Not Allowed', { status: 405 });
}
