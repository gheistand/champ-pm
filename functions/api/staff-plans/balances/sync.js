import { json, requireAdmin } from '../../../_utils.js';

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

export async function onRequest(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const body = await request.json();
  const { full_account_string, all: syncAll } = body;

  if (!full_account_string && !syncAll) {
    return json({ error: 'full_account_string or all:true is required' }, 400);
  }

  const runwayByAccount = await getRunwayGrantsByAccount(env.DB);

  // Determine which accounts to sync
  let accountsToSync = [];
  if (syncAll) {
    // Sync all active Runway grants that have matching full_account_string in staff_appointments
    const { results: apptAccounts } = await env.DB.prepare(
      'SELECT DISTINCT full_account_string FROM staff_appointments WHERE full_account_string IS NOT NULL'
    ).all();
    const appointmentAccountSet = new Set(apptAccounts.map(r => r.full_account_string));
    accountsToSync = Object.keys(runwayByAccount).filter(a => appointmentAccountSet.has(a));
  } else {
    accountsToSync = [full_account_string];
  }

  const updated = [];

  for (const account of accountsToSync) {
    const g = runwayByAccount[account];
    if (!g) continue; // Not in Runway — skip

    const fund_number = extractFundNumber(account);
    const runway_balance = g.balance ?? null;
    const runway_as_of_date = g.balance_as_of_date ?? null;
    const today = new Date().toISOString().slice(0, 10);

    const existing = await env.DB.prepare(
      'SELECT id FROM staff_plan_grant_balances WHERE full_account_string=?'
    ).bind(account).first();

    if (existing) {
      await env.DB.prepare(`
        UPDATE staff_plan_grant_balances
        SET remaining_balance=?, pop_end_date=?, as_of_date=?,
            runway_balance=?, runway_as_of_date=?,
            is_manual_override=0, grant_name=?, fund_number=?,
            updated_at=datetime('now')
        WHERE full_account_string=?
      `).bind(
        runway_balance ?? 0,
        g.end_date ?? '',
        runway_as_of_date ?? today,
        runway_balance,
        runway_as_of_date,
        g.name,
        fund_number,
        account
      ).run();
    } else {
      await env.DB.prepare(`
        INSERT INTO staff_plan_grant_balances
          (full_account_string, fund_number, remaining_balance, pop_end_date, as_of_date,
           runway_balance, runway_as_of_date, is_manual_override, grant_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
      `).bind(
        account,
        fund_number,
        runway_balance ?? 0,
        g.end_date ?? '',
        runway_as_of_date ?? today,
        runway_balance,
        runway_as_of_date,
        g.name
      ).run();
    }

    updated.push({
      full_account_string: account,
      fund_number,
      balance: runway_balance,
      as_of_date: runway_as_of_date,
    });
  }

  return json({ synced: updated.length, updated });
}
