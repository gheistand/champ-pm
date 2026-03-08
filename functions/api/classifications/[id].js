import { json, requireAdmin } from '../../_utils.js';

async function handlePut(context) {
  const { env, data, request, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;
  const body = await request.json();

  const fields = [];
  const values = [];
  const updatable = ['classification', 'band_min', 'band_mid', 'band_max', 'typical_years_min', 'typical_years_max', 'notes', 'effective_date'];

  for (const field of updatable) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (fields.length === 0) return json({ error: 'No fields to update' }, 400);

  values.push(id);
  await env.DB.prepare(`UPDATE classification_bands SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values).run();

  const band = await env.DB.prepare('SELECT * FROM classification_bands WHERE id = ?').bind(id).first();
  if (!band) return json({ error: 'Band not found' }, 404);

  return json({ band });
}

async function handleDelete(context) {
  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;
  await env.DB.prepare('DELETE FROM classification_bands WHERE id = ?').bind(id).run();
  return json({ success: true });
}

export async function onRequest(context) {
  if (context.request.method === 'PUT') return handlePut(context);
  if (context.request.method === 'DELETE') return handleDelete(context);
  return new Response('Method Not Allowed', { status: 405 });
}
