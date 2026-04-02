import { json, requireAdmin } from '../../../_utils.js';

// POST /api/staff-plans/balances/priority
// Body: { updates: [{full_account_string, priority_rank, is_pinned}] }
// Batch-update priority_rank and is_pinned for multiple grants at once.
export async function onRequest(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

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
      `).bind(
        priority_rank ?? null,
        is_pinned ?? null,
        full_account_string
      ).run();
    } else {
      // Insert a minimal record if not yet tracked
      const fund_number = full_account_string.split('-')[1] ?? null;
      await env.DB.prepare(`
        INSERT INTO staff_plan_grant_balances
          (full_account_string, fund_number, remaining_balance, pop_end_date, as_of_date,
           is_manual_override, priority_rank, is_pinned)
        VALUES (?, ?, 0, '', date('now'), 0, ?, ?)
      `).bind(
        full_account_string, fund_number,
        priority_rank ?? 99, is_pinned ?? 0
      ).run();
    }
    updated++;
  }

  return json({ updated });
}
