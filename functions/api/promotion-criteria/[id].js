import { json, requireAdmin } from '../../_utils.js';

export async function onRequest(context) {
  if (context.request.method !== 'PUT') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { env, data, request, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;
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
  await env.DB.prepare(`UPDATE promotion_criteria SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values).run();

  const criterion = await env.DB.prepare('SELECT * FROM promotion_criteria WHERE id = ?').bind(id).first();
  if (!criterion) return json({ error: 'Criterion not found' }, 404);

  return json({ criterion });
}
