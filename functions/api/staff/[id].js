import { json, requireAdmin } from '../../_utils.js';

export async function onRequestPut(context) {
  const { env, data, request, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;
  const body = await request.json();

  const fields = [];
  const values = [];

  const updatable = ['name', 'email', 'role', 'title', 'classification', 'band_classification', 'department', 'start_date', 'role_start_date', 'is_active'];
  for (const field of updatable) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (fields.length === 0) return json({ error: 'No fields to update' }, 400);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  if (!user) return json({ error: 'User not found' }, 404);

  return json({ user });
}
