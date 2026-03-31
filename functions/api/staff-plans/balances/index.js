import { json, requireAdmin } from '../../../_utils.js';

async function handleGet(context) {
  const { env, data } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { results } = await env.DB.prepare(`
    SELECT * FROM staff_plan_grant_balances ORDER BY pop_end_date ASC
  `).all();

  return json({ balances: results });
}

async function handlePost(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const {
    id, fund_number, chart, org, program, activity,
    full_account_string, remaining_balance, pop_end_date, as_of_date, notes
  } = body;

  if (!fund_number || remaining_balance == null || !pop_end_date || !as_of_date) {
    return json({ error: 'fund_number, remaining_balance, pop_end_date, as_of_date are required' }, 400);
  }

  if (id) {
    // Update existing
    await env.DB.prepare(`
      UPDATE staff_plan_grant_balances
      SET fund_number=?, chart=?, org=?, program=?, activity=?,
          full_account_string=?, remaining_balance=?, pop_end_date=?,
          as_of_date=?, notes=?, updated_at=datetime('now')
      WHERE id=?
    `).bind(
      fund_number, chart ?? 1, org ?? null, program ?? null, activity ?? null,
      full_account_string ?? null, remaining_balance, pop_end_date,
      as_of_date, notes ?? null, id
    ).run();

    const row = await env.DB.prepare('SELECT * FROM staff_plan_grant_balances WHERE id=?').bind(id).first();
    return json({ balance: row });
  } else {
    // Insert new
    const result = await env.DB.prepare(`
      INSERT INTO staff_plan_grant_balances
        (fund_number, chart, org, program, activity, full_account_string,
         remaining_balance, pop_end_date, as_of_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      fund_number, chart ?? 1, org ?? null, program ?? null, activity ?? null,
      full_account_string ?? null, remaining_balance, pop_end_date,
      as_of_date, notes ?? null
    ).run();

    const row = await env.DB.prepare('SELECT * FROM staff_plan_grant_balances WHERE id=?')
      .bind(result.meta.last_row_id).first();
    return json({ balance: row }, 201);
  }
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  return new Response('Method Not Allowed', { status: 405 });
}
