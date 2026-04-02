import { json, requireAdmin } from '../../../_utils.js';

// Extract fund_number from full_account_string (segment index 1)
// e.g. "1-470736-..." → "470736"
function extractFundNumber(accountString) {
  if (!accountString) return null;
  const parts = accountString.split('-');
  return parts.length >= 2 ? parts[1] : null;
}

// Get all active Runway grants keyed by grant_number (= full_account_string)
async function getRunwayGrantsByAccount(db) {
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
    map[g.grant_number] = g;
  }
  return map;
}

async function handleGet(context) {
  const { env, data } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const runwayByAccount = await getRunwayGrantsByAccount(env.DB);

  // Get distinct full_account_strings from staff_appointments
  const { results: apptAccounts } = await env.DB.prepare(
    'SELECT DISTINCT full_account_string FROM staff_appointments WHERE full_account_string IS NOT NULL'
  ).all();
  const appointmentAccountSet = new Set(apptAccounts.map(r => r.full_account_string));

  // Get all staff_plan_grant_balances records
  const { results: overrides } = await env.DB.prepare(
    'SELECT * FROM staff_plan_grant_balances'
  ).all();
  const overrideByAccount = {};
  for (const o of overrides) {
    overrideByAccount[o.full_account_string] = o;
  }

  // Auto-sync: if table is empty, populate from Runway for matching appointment accounts
  if (overrides.length === 0 && Object.keys(runwayByAccount).length > 0) {
    for (const [full_account_string, g] of Object.entries(runwayByAccount)) {
      if (!appointmentAccountSet.has(full_account_string)) continue;
      const fund_number = extractFundNumber(full_account_string);
      const runway_balance = g.balance ?? null;
      const runway_as_of_date = g.balance_as_of_date ?? null;
      await env.DB.prepare(`
        INSERT INTO staff_plan_grant_balances
          (full_account_string, fund_number, remaining_balance, pop_end_date, as_of_date,
           runway_balance, runway_as_of_date, is_manual_override, grant_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
      `).bind(
        full_account_string,
        fund_number,
        runway_balance ?? 0,
        g.end_date ?? '',
        runway_as_of_date ?? new Date().toISOString().slice(0, 10),
        runway_balance,
        runway_as_of_date,
        g.name
      ).run();
      overrideByAccount[full_account_string] = {
        full_account_string,
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
  for (const [full_account_string, g] of Object.entries(runwayByAccount)) {
    if (!appointmentAccountSet.has(full_account_string)) continue;
    const override = overrideByAccount[full_account_string];
    const runway_balance = g.balance ?? null;
    const runway_as_of_date = g.balance_as_of_date ?? null;
    const is_manual_override = override?.is_manual_override ?? 0;
    const current_balance = is_manual_override ? override.remaining_balance : runway_balance;
    const fund_number = override?.fund_number ?? extractFundNumber(full_account_string);

    result.push({
      id: override?.id ?? null,
      full_account_string,
      fund_number,
      grant_name: override?.grant_name ?? g.name,
      runway_balance,
      runway_as_of_date,
      current_balance,
      pop_end_date: override?.pop_end_date ?? g.end_date,
      is_manual_override,
      notes: override?.notes ?? null,
      in_runway: true,
      priority_rank: override?.priority_rank ?? 99,
      is_pinned: override?.is_pinned ?? 0,
    });
  }

  // Manual-only entries (in staff_plan_grant_balances but NOT in Runway)
  for (const [full_account_string, o] of Object.entries(overrideByAccount)) {
    if (runwayByAccount[full_account_string]) continue; // already handled above
    result.push({
      id: o.id,
      full_account_string,
      fund_number: o.fund_number ?? extractFundNumber(full_account_string),
      grant_name: o.grant_name ?? null,
      runway_balance: null,
      runway_as_of_date: null,
      current_balance: o.remaining_balance,
      pop_end_date: o.pop_end_date,
      is_manual_override: 1,
      notes: o.notes ?? null,
      in_runway: false,
      priority_rank: o.priority_rank ?? 99,
      is_pinned: o.is_pinned ?? 0,
    });
  }

  result.sort((a, b) => {
    const pa = a.priority_rank ?? 99;
    const pb = b.priority_rank ?? 99;
    if (pa !== pb) return pa - pb;
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
  const { full_account_string, remaining_balance, pop_end_date, notes, grant_name, priority_rank, is_pinned } = body;

  if (!full_account_string || remaining_balance == null || !pop_end_date) {
    return json({ error: 'full_account_string, remaining_balance, pop_end_date are required' }, 400);
  }

  // Extract fund_number for display
  const fund_number = full_account_string.split('-')[1] ?? null;

  // Check if this account exists in Runway — get latest runway data
  const runwayByAccount = await getRunwayGrantsByAccount(env.DB);
  const runwayGrant = runwayByAccount[full_account_string] ?? null;
  const runway_balance = runwayGrant?.balance ?? null;
  const runway_as_of_date = runwayGrant?.balance_as_of_date ?? null;
  const resolved_grant_name = grant_name ?? runwayGrant?.name ?? null;

  const existing = await env.DB.prepare(
    'SELECT id FROM staff_plan_grant_balances WHERE full_account_string=?'
  ).bind(full_account_string).first();

  const today = new Date().toISOString().slice(0, 10);

  if (existing) {
    await env.DB.prepare(`
      UPDATE staff_plan_grant_balances
      SET remaining_balance=?, pop_end_date=?, as_of_date=?,
          notes=?, fund_number=?, grant_name=?,
          runway_balance=?, runway_as_of_date=?,
          is_manual_override=1,
          priority_rank=COALESCE(?, priority_rank),
          is_pinned=COALESCE(?, is_pinned),
          updated_at=datetime('now')
      WHERE full_account_string=?
    `).bind(
      remaining_balance, pop_end_date, today,
      notes ?? null, fund_number, resolved_grant_name,
      runway_balance, runway_as_of_date,
      priority_rank ?? null, is_pinned ?? null,
      full_account_string
    ).run();
  } else {
    await env.DB.prepare(`
      INSERT INTO staff_plan_grant_balances
        (full_account_string, fund_number, remaining_balance, pop_end_date, as_of_date,
         notes, grant_name,
         runway_balance, runway_as_of_date, is_manual_override,
         priority_rank, is_pinned)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(
      full_account_string, fund_number, remaining_balance, pop_end_date, today,
      notes ?? null, resolved_grant_name,
      runway_balance, runway_as_of_date,
      priority_rank ?? 99, is_pinned ?? 0
    ).run();
  }

  const row = await env.DB.prepare(
    'SELECT * FROM staff_plan_grant_balances WHERE full_account_string=?'
  ).bind(full_account_string).first();

  return json({ balance: row }, existing ? 200 : 201);
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  return new Response('Method Not Allowed', { status: 405 });
}
