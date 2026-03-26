import { json, requireAdmin } from '../../../_utils.js';

async function handlePut(context) {
  const { env, data, request, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;
  const body = await request.json();

  const fields = [];
  const values = [];

  for (const field of ['type', 'interaction_date', 'grant_id', 'notes', 'next_action', 'next_action_due', 'next_action_done']) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (fields.length === 0) return json({ error: 'No fields to update' }, 400);

  values.push(id);

  await env.DB.prepare(`UPDATE interactions SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values).run();

  const interaction = await env.DB.prepare('SELECT * FROM interactions WHERE id = ?').bind(id).first();
  if (!interaction) return json({ error: 'Interaction not found' }, 404);

  return json({ interaction });
}

async function handleDelete(context) {
  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;
  await env.DB.prepare('DELETE FROM interactions WHERE id = ?').bind(id).run();
  return json({ success: true });
}

export async function onRequest(context) {
  if (context.request.method === 'PUT') return handlePut(context);
  if (context.request.method === 'DELETE') return handleDelete(context);
  return new Response('Method Not Allowed', { status: 405 });
}
