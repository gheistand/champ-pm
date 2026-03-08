import { json, requireAdmin } from '../../../_utils.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { env, data } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { results: snapshots } = await env.DB.prepare(`
    SELECT es.*, COUNT(esi.id) as item_count
    FROM equity_snapshots es
    LEFT JOIN equity_snapshot_items esi ON esi.snapshot_id = es.id
    GROUP BY es.id
    ORDER BY es.snapshot_date DESC
  `).all();

  return json({ snapshots });
}
