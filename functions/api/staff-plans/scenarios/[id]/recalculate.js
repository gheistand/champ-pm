import { json, requireAdmin } from '../../../../_utils.js';
import { optimizeRows } from '../../optimize.js';

export async function onRequest(context) {
  const { env, data, params, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { id: scenarioId } = params;
  const body = await request.json().catch(() => ({}));
  const { terminations } = body;

  const scenario = await env.DB.prepare('SELECT * FROM staff_plan_scenarios WHERE id=?').bind(scenarioId).first();
  if (!scenario) return json({ error: 'Not found' }, 404);

  // Get overridden rows to preserve them
  const { results: overrides } = await env.DB.prepare(`
    SELECT * FROM staff_plan_scenario_rows WHERE scenario_id=? AND is_override=1
  `).bind(scenarioId).all();
  const overrideMap = new Map(overrides.map(r => [`${r.user_id}|${r.fund_number}|${r.period_start}`, r]));

  // Gather staff + funds
  const { results: staffRows } = await env.DB.prepare(`
    SELECT DISTINCT sa.user_id, MAX(sa.salary_rate) as salary
    FROM staff_appointments sa
    WHERE sa.salary_rate IS NOT NULL AND sa.salary_rate > 0
    GROUP BY sa.user_id
  `).all();

  const staff = [];
  for (const s of staffRows) {
    const { results: funds } = await env.DB.prepare(`
      SELECT DISTINCT sa.fund_number, sa.full_account_string, sa.chart, sa.org, sa.program, sa.activity,
        b.remaining_balance, b.pop_end_date
      FROM staff_appointments sa
      INNER JOIN staff_plan_grant_balances b ON b.fund_number = sa.fund_number
      WHERE sa.user_id = ? AND b.remaining_balance > 0
    `).bind(s.user_id).all();
    if (funds.length > 0) staff.push({ userId: s.user_id, salary: s.salary, funds });
  }

  const { results: balances } = await env.DB.prepare(
    'SELECT fund_number, remaining_balance, pop_end_date FROM staff_plan_grant_balances WHERE remaining_balance > 0'
  ).all();

  const newRows = optimizeRows({
    staff, balances,
    plan_start: scenario.plan_start_date,
    plan_end: scenario.plan_end_date,
    terminations: terminations || {},
  });

  // Apply overrides
  for (const r of newRows) {
    const key = `${r.user_id}|${r.fund_number}|${r.period_start}`;
    if (overrideMap.has(key)) {
      const ov = overrideMap.get(key);
      r.allocation_pct = ov.allocation_pct;
      r.estimated_cost = ov.estimated_cost;
      r.is_override = 1;
      r.flag = ov.flag;
      r.notes = ov.notes;
    }
  }

  // Replace all non-override rows
  await env.DB.prepare(`DELETE FROM staff_plan_scenario_rows WHERE scenario_id=? AND is_override=0`).bind(scenarioId).run();

  const stmt = env.DB.prepare(`
    INSERT INTO staff_plan_scenario_rows
      (scenario_id, user_id, fund_number, full_account_string,
       period_start, period_end, allocation_pct, salary_rate, estimated_cost, is_override, flag, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const r of newRows) {
    if (!overrideMap.has(`${r.user_id}|${r.fund_number}|${r.period_start}`)) {
      await stmt.bind(
        scenarioId, r.user_id, r.fund_number, r.full_account_string ?? null,
        r.period_start, r.period_end, r.allocation_pct, r.salary_rate ?? null,
        r.estimated_cost ?? null, r.is_override ?? 0, r.flag ?? null, r.notes ?? null
      ).run();
    }
  }

  await env.DB.prepare(`UPDATE staff_plan_scenarios SET updated_at=datetime('now') WHERE id=?`).bind(scenarioId).run();

  const { results: rows } = await env.DB.prepare(
    'SELECT * FROM staff_plan_scenario_rows WHERE scenario_id=? ORDER BY user_id, period_start, fund_number'
  ).bind(scenarioId).all();

  return json({ ok: true, row_count: rows.length, rows });
}
