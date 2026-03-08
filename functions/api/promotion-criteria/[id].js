import { json, requireAdmin } from '../../_utils.js';

export async function onRequest(context) {
  const { env, data, request, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;

  if (request.method === 'DELETE') {
    const existing = await env.DB.prepare('SELECT id FROM promotion_criteria WHERE id = ?').bind(id).first();
    if (!existing) return json({ error: 'Criterion not found' }, 404);
    await env.DB.prepare('DELETE FROM promotion_criteria WHERE id = ?').bind(id).run();
    return json({ success: true });
  }

  if (request.method === 'PUT') {
    const body = await request.json();
    const fields = [];
    const values = [];
    const updatable = ['from_classification', 'to_classification', 'min_years_in_role', 'min_years_total', 'notes'];
    for (const field of updatable) {
      if (body[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(body[field]);
      }
    }
    if (fields.length === 0) return json({ error: 'No fields to update' }, 400);
    values.push(id);
    await env.DB.prepare(`UPDATE promotion_criteria SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
    const criterion = await env.DB.prepare('SELECT * FROM promotion_criteria WHERE id = ?').bind(id).first();
    return json({ criterion });
  }

  return new Response('Method Not Allowed', { status: 405 });
}
