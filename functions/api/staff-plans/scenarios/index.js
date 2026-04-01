import { json, requireAdmin } from '../../../_utils.js';

async function handleGet(context) {
  const { env, data } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { results } = await env.DB.prepare(`
    SELECT
      s.*,
      u.name as created_by_name,
      COUNT(r.id) as row_count
    FROM staff_plan_scenarios s
    LEFT JOIN users u ON u.id = s.created_by
    LEFT JOIN staff_plan_scenario_rows r ON r.scenario_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `).all();

  return json({ scenarios: results });
}

async function handlePost(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const { name, description, plan_start_date, plan_end_date, terminations } = body;

  if (!name || !plan_start_date || !plan_end_date) {
    return json({ error: 'name, plan_start_date, plan_end_date are required' }, 400);
  }

  // Create scenario record
  const result = await env.DB.prepare(`
    INSERT INTO staff_plan_scenarios (name, description, created_by, plan_start_date, plan_end_date)
    VALUES (?, ?, ?, ?, ?)
  `).bind(name, description ?? null, data.userId, plan_start_date, plan_end_date).run();

  const scenarioId = result.meta.last_row_id;

  // Run optimization engine
  const optimizeResp = await runOptimize(env, {
    scenario_id: scenarioId,
    plan_start: plan_start_date,
    plan_end: plan_end_date,
    terminations: terminations || {},
  });

  if (!optimizeResp.ok) {
    let err = {};
    try { err = await optimizeResp.json(); } catch {}
    console.error('Optimization failed:', JSON.stringify(err));
    // Still return the scenario even if optimization failed — user can recalculate
    const scenario = await env.DB.prepare('SELECT * FROM staff_plan_scenarios WHERE id=?').bind(scenarioId).first();
    return json({ scenario, row_count: 0, warning: 'Optimization failed: ' + (err.error || 'unknown error'), detail: err }, 201);
  }

  const { rows } = await optimizeResp.json();

  // Insert rows
  if (rows && rows.length > 0) {
    const stmt = env.DB.prepare(`
      INSERT INTO staff_plan_scenario_rows
        (scenario_id, user_id, fund_number, full_account_string,
         period_start, period_end, allocation_pct, salary_rate, estimated_cost, flag)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of rows) {
      await stmt.bind(
        scenarioId, r.user_id, r.fund_number, r.full_account_string ?? null,
        r.period_start, r.period_end, r.allocation_pct, r.salary_rate ?? null,
        r.estimated_cost ?? null, r.flag ?? null
      ).run();
    }
  }

  const scenario = await env.DB.prepare('SELECT * FROM staff_plan_scenarios WHERE id=?').bind(scenarioId).first();
  return json({ scenario, row_count: rows?.length ?? 0 }, 201);
}

// Internal call to optimization engine
async function runOptimize(env, payload) {
  // Gather all staff with appointments
  // Use salary_records as authoritative salary source (fallback to appointment salary_rate)
  const { results: staffRows } = await env.DB.prepare(`
    SELECT DISTINCT sa.user_id,
      COALESCE(
        (SELECT sr.annual_salary FROM salary_records sr WHERE sr.user_id = sa.user_id ORDER BY sr.effective_date DESC LIMIT 1),
        MAX(sa.salary_rate),
        0
      ) as salary
    FROM staff_appointments sa
    GROUP BY sa.user_id
  `).all();

  const staff = [];
  for (const s of staffRows) {
    // LEFT JOIN so staff with no balance entries are still included
    const { results: funds } = await env.DB.prepare(`
      SELECT DISTINCT
        sa.fund_number,
        MAX(sa.full_account_string) as full_account_string,
        MAX(sa.chart) as chart,
        MAX(sa.org) as org,
        MAX(sa.program) as program,
        MAX(sa.activity) as activity,
        COALESCE(b.remaining_balance, 0) as remaining_balance,
        b.pop_end_date,
        CASE WHEN b.fund_number IS NULL THEN 1 ELSE 0 END as balance_unknown
      FROM staff_appointments sa
      LEFT JOIN staff_plan_grant_balances b ON b.fund_number = sa.fund_number
      WHERE sa.user_id = ?
      GROUP BY sa.fund_number
    `).bind(s.user_id).all();

    // Include all staff — optimizer handles zero-balance funds gracefully
    staff.push({ userId: s.user_id, salary: s.salary, funds });
  }

  const { results: balances } = await env.DB.prepare(
    'SELECT fund_number, remaining_balance, pop_end_date FROM staff_plan_grant_balances WHERE remaining_balance > 0'
  ).all();

  const optimizePayload = {
    staff,
    balances,
    plan_start: payload.plan_start,
    plan_end: payload.plan_end,
    terminations: payload.terminations || {},
  };

  // Call optimize endpoint internally via module import
  try {
    const { optimizeRows } = await import('../optimize.js');
    const rows = optimizeRows(optimizePayload);
    return new Response(JSON.stringify({ rows }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('optimizeRows error:', err);
    return new Response(JSON.stringify({ error: String(err), stack: err?.stack }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  return new Response('Method Not Allowed', { status: 405 });
}
