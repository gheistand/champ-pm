import { json, requireAdmin } from '../../../_utils.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;

  const snapshot = await env.DB.prepare('SELECT * FROM equity_snapshots WHERE id = ?').bind(id).first();
  if (!snapshot) return json({ error: 'Snapshot not found' }, 404);

  const { results: items } = await env.DB.prepare(`
    SELECT esi.*, u.name, u.email
    FROM equity_snapshot_items esi
    LEFT JOIN users u ON u.id = esi.user_id
    WHERE esi.snapshot_id = ?
    ORDER BY esi.equity_gap DESC
  `).bind(id).all();

  return json({ snapshot, items });
}
