import { json, requireAdmin } from '../../_utils.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { env, data } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  // Get all active grants
  const { results: grants } = await env.DB.prepare(`
    SELECT * FROM grants WHERE status = 'active' ORDER BY name
  `).all();

  const grantBudgets = [];
  let program_total_personnel = 0;
  let program_total_fa = 0;
  let program_total_cost = 0;
  let program_total_budget = 0;

  for (const grant of grants) {
    // Get F&A rate
    const faRate = await env.DB.prepare(`
      SELECT fa_rate FROM grant_fa_rates
      WHERE grant_id = ?
      ORDER BY effective_date DESC
      LIMIT 1
    `).bind(grant.id).first();

    const fa_rate = faRate?.fa_rate || 0;

    // Get all timesheet entries for this grant
    const { results: entries } = await env.DB.prepare(`
      SELECT te.hours, te.entry_date, sr.annual_salary, sr.fringe_rate
      FROM timesheet_entries te
      JOIN tasks t ON t.id = te.task_id
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN salary_records sr ON sr.user_id = te.user_id
        AND sr.effective_date = (
          SELECT MAX(sr2.effective_date)
          FROM salary_records sr2
          WHERE sr2.user_id = te.user_id AND sr2.effective_date <= te.entry_date
        )
      WHERE p.grant_id = ?
    `).bind(grant.id).all();

    let personnel_cost = 0;
    let hours_logged = 0;
    for (const e of entries) {
      const hourly_loaded = ((e.annual_salary || 0) / 2080) * (1 + (e.fringe_rate || 0));
      personnel_cost += (e.hours || 0) * hourly_loaded;
      hours_logged += e.hours || 0;
    }

    const fa_cost = personnel_cost * fa_rate;
    const total_cost = personnel_cost + fa_cost;
    const total_budget = grant.total_budget || 0;

    // Calculate days in PoP
    const start = grant.start_date ? new Date(grant.start_date) : null;
    const end = grant.end_date ? new Date(grant.end_date) : null;
    const now = new Date();
    const days_elapsed = start ? Math.max(0, Math.floor((now - start) / 86400000)) : 0;
    const days_total = start && end ? Math.max(1, Math.floor((end - start) / 86400000)) : 1;
    const days_remaining = end ? Math.max(0, Math.floor((end - now) / 86400000)) : 0;

    grantBudgets.push({
      id: grant.id,
      name: grant.name,
      funder: grant.funder,
      start_date: grant.start_date,
      end_date: grant.end_date,
      status: grant.status,
      fema_budget: total_budget,
      hours_logged: Math.round(hours_logged * 10) / 10,
      personnel_cost: Math.round(personnel_cost * 100) / 100,
      fa_rate,
      fa_cost: Math.round(fa_cost * 100) / 100,
      total_cost: Math.round(total_cost * 100) / 100,
      remaining: Math.round((total_budget - total_cost) * 100) / 100,
      pct_used: total_budget > 0 ? Math.round((total_cost / total_budget) * 1000) / 10 : 0,
      days_elapsed,
      days_total,
      days_remaining,
    });

    program_total_personnel += personnel_cost;
    program_total_fa += fa_cost;
    program_total_cost += total_cost;
    program_total_budget += total_budget;
  }

  return json({
    grants: grantBudgets,
    totals: {
      fema_budget: Math.round(program_total_budget * 100) / 100,
      personnel_cost: Math.round(program_total_personnel * 100) / 100,
      fa_cost: Math.round(program_total_fa * 100) / 100,
      total_cost: Math.round(program_total_cost * 100) / 100,
      remaining: Math.round((program_total_budget - program_total_cost) * 100) / 100,
      pct_used: program_total_budget > 0
        ? Math.round((program_total_cost / program_total_budget) * 1000) / 10 : 0,
    },
  });
}
