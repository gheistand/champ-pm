import { json, requireAdmin } from '../../../../../_utils.js';

async function handleDelete(context) {
  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id, grant_id } = params;

  await env.DB.prepare(`
    DELETE FROM contact_grant_links WHERE contact_id = ? AND grant_id = ?
  `).bind(id, grant_id).run();

  return json({ success: true });
}

export async function onRequest(context) {
  if (context.request.method === 'DELETE') return handleDelete(context);
  return new Response('Method Not Allowed', { status: 405 });
}
