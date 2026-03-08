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
  const updatable = ['adjustment_type', 'current_salary', 'proposed_salary', 'reason', 'status', 'effective_date'];

  for (const field of updatable) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (fields.length === 0) return json({ error: 'No fields to update' }, 400);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await env.DB.prepare(`UPDATE salary_adjustments SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values).run();

  const adjustment = await env.DB.prepare('SELECT * FROM salary_adjustments WHERE id = ?').bind(id).first();
  if (!adjustment) return json({ error: 'Adjustment not found' }, 404);

  return json({ adjustment });
}
