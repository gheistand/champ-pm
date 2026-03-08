import { json, requireAdmin } from '../../_utils.js';

export async function onRequest(context) {
  const { env, data, request, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;

  if (request.method === 'PUT') {
    const body = await request.json();
    // Only allow editing notes — rate and effective_date are immutable for audit integrity
    const notes = body.notes ?? null;
    await env.DB.prepare('UPDATE fringe_rates SET notes = ? WHERE id = ?').bind(notes, id).run();
    const record = await env.DB.prepare('SELECT * FROM fringe_rates WHERE id = ?').bind(id).first();
    if (!record) return json({ error: 'Not found' }, 404);
    return json({ rate: record });
  }

  return new Response('Method Not Allowed', { status: 405 });
}
