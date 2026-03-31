import { json, requireAdmin } from '../../../_utils.js';

// Extract fund_number from Runway grant_number (segment index 1)
// e.g. "1-470736-..." → "470736"
function extractFundNumber(grantNumber) {
  if (!grantNumber) return null;
  const parts = grantNumber.split('-');
  return parts.length >= 2 ? parts[1] : null;
}

// Get all active Runway grants with their latest balance, keyed by fund_number
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

async function handleGet(context) {
  const { env, data } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const runwayByFund = await getRunwayGrantsByFund(env.DB);

  // Get distinct fund_numbers from staff_appointments
  const { results: apptFunds } = await env.DB.prepare(
    'SELECT DISTINCT fund_number FROM staff_appointments'
  ).all();
  const appointmentFundSet = new Set(apptFunds.map(r => r.fund_number));

  // Get all staff_plan_grant_balances override records
  const { results: overrides } = await env.DB.prepare(
    'SELECT * FROM staff_plan_grant_balances'
  ).all();
  const overrideByFund = {};
  for (const o of overrides) {
    overrideByFund[o.fund_number] = o;
  }

  // Auto-sync: if table is empty, populate from Runway for matching appointment funds
  if (overrides.length === 0 && Object.keys(runwayByFund).length > 0) {
    for (const [fund_number, g] of Object.entries(runwayByFund)) {
      if (!appointmentFundSet.has(fund_number)) continue;
      const runway_balance = g.balance ?? null;
      const runway_as_of_date = g.balance_as_of_date ?? null;
      await env.DB.prepare(`
        INSERT INTO staff_plan_grant_balances
          (fund_number, remaining_balance, pop_end_date, as_of_date,
           runway_balance, runway_as_of_date, is_manual_override, grant_name)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?)
      `).bind(
        fund_number,
        runway_balance ?? 0,
        g.end_date ?? '',
        runway_as_of_date ?? new Date().toISOString().slice(0, 10),
        runway_balance,
        runway_as_of_date,
        g.name
      ).run();
      overrideByFund[fund_number] = {
        fund_number,
        remaining_balance: runway_balance ?? 0,
        pop_end_date: g.end_date ?? '',
        as_of_date: runway_as_of_date ?? '',
        runway_balance,
        runway_as_of_date,
        is_manual_override: 0,
        grant_name: g.name,
      };
    }
  }

  const result = [];

  // Runway grants that are in appointments
  for (const [fund_number, g] of Object.entries(runwayByFund)) {
    if (!appointmentFundSet.has(fund_number)) continue;
    const override = overrideByFund[fund_number];
    const runway_balance = g.balance ?? null;
    const runway_as_of_date = g.balance_as_of_date ?? null;
    const is_manual_override = override?.is_manual_override ?? 0;
    const current_balance = is_manual_override ? override.remaining_balance : runway_balance;

    result.push({
      id: override?.id ?? null,
      fund_number,
      grant_name: override?.grant_name ?? g.name,
      full_account_string: override?.full_account_string ?? null,
      runway_balance,
      runway_as_of_date,
      current_balance,
      pop_end_date: override?.pop_end_date ?? g.end_date,
      is_manual_override,
      notes: override?.notes ?? null,
      in_runway: true,
    });
  }

  // Manual-only entries (in staff_plan_grant_balances but NOT in Runway)
  for (const [fund_number, o] of Object.entries(overrideByFund)) {
    if (runwayByFund[fund_number]) continue; // already handled above
    result.push({
      id: o.id,
      fund_number,
      grant_name: o.grant_name ?? null,
      full_account_string: o.full_account_string ?? null,
      runway_balance: null,
      runway_as_of_date: null,
      current_balance: o.remaining_balance,
      pop_end_date: o.pop_end_date,
      is_manual_override: 1,
      notes: o.notes ?? null,
      in_runway: false,
    });
  }

  result.sort((a, b) => {
    if (!a.pop_end_date) return 1;
    if (!b.pop_end_date) return -1;
    return a.pop_end_date.localeCompare(b.pop_end_date);
  });

  return json({ balances: result });
}

async function handlePost(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const { fund_number, remaining_balance, pop_end_date, notes, full_account_string, grant_name } = body;

  if (!fund_number || remaining_balance == null || !pop_end_date) {
    return json({ error: 'fund_number, remaining_balance, pop_end_date are required' }, 400);
  }

  // Check if this fund exists in Runway — get latest runway data
  const runwayByFund = await getRunwayGrantsByFund(env.DB);
  const runwayGrant = runwayByFund[fund_number] ?? null;
  const runway_balance = runwayGrant?.balance ?? null;
  const runway_as_of_date = runwayGrant?.balance_as_of_date ?? null;
  const resolved_grant_name = grant_name ?? runwayGrant?.name ?? null;

  const existing = await env.DB.prepare(
    'SELECT id FROM staff_plan_grant_balances WHERE fund_number=?'
  ).bind(fund_number).first();

  const today = new Date().toISOString().slice(0, 10);

  if (existing) {
    await env.DB.prepare(`
      UPDATE staff_plan_grant_balances
      SET remaining_balance=?, pop_end_date=?, as_of_date=?,
          notes=?, full_account_string=?, grant_name=?,
          runway_balance=?, runway_as_of_date=?,
          is_manual_override=1, updated_at=datetime('now')
      WHERE fund_number=?
    `).bind(
      remaining_balance, pop_end_date, today,
      notes ?? null, full_account_string ?? null, resolved_grant_name,
      runway_balance, runway_as_of_date,
      fund_number
    ).run();
  } else {
    await env.DB.prepare(`
      INSERT INTO staff_plan_grant_balances
        (fund_number, remaining_balance, pop_end_date, as_of_date,
         notes, full_account_string, grant_name,
         runway_balance, runway_as_of_date, is_manual_override)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      fund_number, remaining_balance, pop_end_date, today,
      notes ?? null, full_account_string ?? null, resolved_grant_name,
      runway_balance, runway_as_of_date
    ).run();
  }

  const row = await env.DB.prepare(
    'SELECT * FROM staff_plan_grant_balances WHERE fund_number=?'
  ).bind(fund_number).first();

  return json({ balance: row }, existing ? 200 : 201);
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  return new Response('Method Not Allowed', { status: 405 });
}
