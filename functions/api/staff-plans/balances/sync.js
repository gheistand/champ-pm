import { json, requireAdmin } from '../../../_utils.js';

function extractFundNumber(grantNumber) {
  if (!grantNumber) return null;
  const parts = grantNumber.split('-');
  return parts.length >= 2 ? parts[1] : null;
}

async function getRunwayGrantsByFund(db) {
  const { results } = await db.prepare(`
    SELECT g.id, g.name, g.grant_number, g.end_date,
           gb.balance, gb.as_of_date AS balance_as_of_date
    FROM grants g
    LEFT JOIN grant_balances gb ON gb.grant_id = g.id
      AND gb.id = (
        SELECT id FROM grant_balances
        WHERE grant_id = g.id
        ORDER BY as_of_date DESC, id DESC
        LIMIT 1
      )
    WHERE g.status = 'active' AND g.grant_number IS NOT NULL
  `).all();

  const map = {};
  for (const g of results) {
    const fund = extractFundNumber(g.grant_number);
    if (fund) map[fund] = g;
  }
  return map;
}

export async function onRequest(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const body = await request.json();
  const { fund_number, all: syncAll } = body;

  if (!fund_number && !syncAll) {
    return json({ error: 'fund_number or all:true is required' }, 400);
  }

  const runwayByFund = await getRunwayGrantsByFund(env.DB);

  // Determine which fund_numbers to sync
  let fundsToSync = [];
  if (syncAll) {
    // Sync all Runway grants that match appointment funds
    const { results: apptFunds } = await env.DB.prepare(
      'SELECT DISTINCT fund_number FROM staff_appointments'
    ).all();
    const apptFundSet = new Set(apptFunds.map(r => r.fund_number));
    fundsToSync = Object.keys(runwayByFund).filter(f => apptFundSet.has(f));
  } else {
    fundsToSync = [fund_number];
  }

  const updated = [];

  for (const fund of fundsToSync) {
    const g = runwayByFund[fund];
    if (!g) continue; // Not in Runway — skip

    const runway_balance = g.balance ?? null;
    const runway_as_of_date = g.balance_as_of_date ?? null;
    const today = new Date().toISOString().slice(0, 10);

    const existing = await env.DB.prepare(
      'SELECT id FROM staff_plan_grant_balances WHERE fund_number=?'
    ).bind(fund).first();

    if (existing) {
      await env.DB.prepare(`
        UPDATE staff_plan_grant_balances
        SET remaining_balance=?, pop_end_date=?, as_of_date=?,
            runway_balance=?, runway_as_of_date=?,
            is_manual_override=0, grant_name=?,
            updated_at=datetime('now')
        WHERE fund_number=?
      `).bind(
        runway_balance ?? 0,
        g.end_date ?? '',
        runway_as_of_date ?? today,
        runway_balance,
        runway_as_of_date,
        g.name,
        fund
      ).run();
    } else {
      await env.DB.prepare(`
        INSERT INTO staff_plan_grant_balances
          (fund_number, remaining_balance, pop_end_date, as_of_date,
           runway_balance, runway_as_of_date, is_manual_override, grant_name)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?)
      `).bind(
        fund,
        runway_balance ?? 0,
        g.end_date ?? '',
        runway_as_of_date ?? today,
        runway_balance,
        runway_as_of_date,
        g.name
      ).run();
    }

    updated.push({
      fund_number: fund,
      balance: runway_balance,
      as_of_date: runway_as_of_date,
    });
  }

  return json({ synced: updated.length, updated });
}
