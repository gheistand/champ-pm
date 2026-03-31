import { json, requireAdmin } from '../../../_utils.js';

export async function onRequest(context) {
  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  if (context.request.method !== 'DELETE') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { id } = params;
  await env.DB.prepare('DELETE FROM staff_plan_grant_balances WHERE id=?').bind(id).run();
  return json({ ok: true });
}
