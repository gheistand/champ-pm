import { json, requireAdmin } from '../../../_utils.js';

export async function onRequest(context) {
  const { env, data, params, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const id = params.id;

  // Handle /balances/priority — batch update priority_rank and is_pinned
  // (Cloudflare routes [id].js before priority.js for static segments)
  if (id === 'priority' && request.method === 'POST') {
    const body = await request.json();
    const { updates } = body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return json({ error: 'updates array is required' }, 400);
    }
    let updated = 0;
    for (const u of updates) {
      const { full_account_string, priority_rank, is_pinned } = u;
      if (!full_account_string) continue;
      const existing = await env.DB.prepare(
        'SELECT id FROM staff_plan_grant_balances WHERE full_account_string=?'
      ).bind(full_account_string).first();
      if (existing) {
        await env.DB.prepare(`
          UPDATE staff_plan_grant_balances
          SET priority_rank=COALESCE(?, priority_rank),
              is_pinned=COALESCE(?, is_pinned),
              updated_at=datetime('now')
          WHERE full_account_string=?
        `).bind(priority_rank ?? null, is_pinned ?? null, full_account_string).run();
      }
      updated++;
    }
    return json({ updated });
  }

  // Handle /balances/sync — delegate to sync logic
  if (id === 'sync' && request.method === 'POST') {
    // Forward to sync handler logic inline
    const { default: syncHandler } = await import('./sync.js');
    return syncHandler ? syncHandler(context) : new Response('Not found', { status: 404 });
  }

  if (context.request.method !== 'DELETE') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { id } = params;
  await env.DB.prepare('DELETE FROM staff_plan_grant_balances WHERE id=?').bind(id).run();
  return json({ ok: true });
}
