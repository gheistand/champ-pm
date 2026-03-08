import { json, requireAdmin } from '../../_utils.js';

export async function onRequestPut(context) {
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

  await env.DB.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  const task = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
  if (!task) return json({ error: 'Task not found' }, 404);

  return json({ task });
}

export async function onRequestDelete(context) {
  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;
  const { id } = params;
  const { results: entries } = await env.DB.prepare('SELECT id FROM timesheet_entries WHERE task_id = ?').bind(id).all();
  if (entries.length > 0) {
    return json({ error: `Cannot delete: this task has ${entries.length} timesheet entry/entries. Remove them first.` }, 409);
  }
  await env.DB.prepare('DELETE FROM assignments WHERE task_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();
  return json({ success: true });
}
