import { json, requireAdmin } from '../../_utils.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { env, data } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const url = new URL(context.request.url);
  const grant_id = url.searchParams.get('grant_id');

  // Build query for grants
  let grantsQuery = 'SELECT * FROM grants WHERE status = \'active\'';
  const binds = [];
  if (grant_id) {
    grantsQuery = 'SELECT * FROM grants WHERE id = ?';
    binds.push(grant_id);
  }
  grantsQuery += ' ORDER BY name';

  const stmt = env.DB.prepare(grantsQuery);
  const { results: grants } = binds.length > 0 ? await stmt.bind(...binds).all() : await stmt.all();

  const projections = [];

  for (const grant of grants) {
    // Get F&A rate
    const faRate = await env.DB.prepare(`
      SELECT fa_rate FROM grant_fa_rates
      WHERE grant_id = ?
      ORDER BY effective_date DESC
      LIMIT 1
    `).bind(grant.id).first();

    const fa_rate = faRate?.fa_rate || 0;

    // Get monthly cost data for this grant
    const { results: monthlyCosts } = await env.DB.prepare(`
      SELECT
        strftime('%Y-%m', te.entry_date) as month,
        SUM(te.hours) as hours,
        COUNT(DISTINCT te.user_id) as staff_count
      FROM timesheet_entries te
      JOIN tasks t ON t.id = te.task_id
      JOIN projects p ON p.id = t.project_id
      WHERE p.grant_id = ?
      GROUP BY strftime('%Y-%m', te.entry_date)
      ORDER BY month
    `).bind(grant.id).all();

    // Calculate loaded costs per month
    const monthlyData = [];
    let total_loaded_cost = 0;

    for (const mc of monthlyCosts) {
      // Get the loaded cost for this month
      const { results: monthEntries } = await env.DB.prepare(`
        SELECT te.hours, sr.annual_salary, sr.fringe_rate
        FROM timesheet_entries te
        JOIN tasks t ON t.id = te.task_id
        JOIN projects p ON p.id = t.project_id
        LEFT JOIN salary_records sr ON sr.user_id = te.user_id
          AND sr.effective_date = (
            SELECT MAX(sr2.effective_date)
            FROM salary_records sr2
            WHERE sr2.user_id = te.user_id AND sr2.effective_date <= te.entry_date
          )
        WHERE p.grant_id = ? AND strftime('%Y-%m', te.entry_date) = ?
      `).bind(grant.id, mc.month).all();

      let month_personnel = 0;
      for (const e of monthEntries) {
        const hourly_loaded = ((e.annual_salary || 0) / 2080) * (1 + (e.fringe_rate || 0));
        month_personnel += (e.hours || 0) * hourly_loaded;
      }

      const month_fa = month_personnel * fa_rate;
      const month_total = month_personnel + month_fa;
      total_loaded_cost += month_total;

      monthlyData.push({
        month: mc.month,
        hours: Math.round(mc.hours * 10) / 10,
        personnel_cost: Math.round(month_personnel * 100) / 100,
        fa_cost: Math.round(month_fa * 100) / 100,
        total_cost: Math.round(month_total * 100) / 100,
      });
    }

    // Calculate projections
    const total_budget = grant.total_budget || 0;
    const start = grant.start_date ? new Date(grant.start_date) : null;
    const end = grant.end_date ? new Date(grant.end_date) : null;
    const now = new Date();

    const days_elapsed = start ? Math.max(1, Math.floor((now - start) / 86400000)) : 1;
    const days_remaining = end ? Math.max(0, Math.floor((end - now) / 86400000)) : 0;
    const days_total = start && end ? Math.max(1, Math.floor((end - start) / 86400000)) : 1;

    const daily_burn_rate = total_loaded_cost / days_elapsed;
    const projected_final_cost = total_loaded_cost + (daily_burn_rate * days_remaining);
    const projected_remaining = total_budget - projected_final_cost;

    // Estimate when budget exhausts
    let exhaustion_date = null;
    if (daily_burn_rate > 0 && total_budget > total_loaded_cost) {
      const days_until_exhaustion = (total_budget - total_loaded_cost) / daily_burn_rate;
      const exhaust = new Date(now.getTime() + days_until_exhaustion * 86400000);
      exhaustion_date = exhaust.toISOString().split('T')[0];
    }

    projections.push({
      grant_id: grant.id,
      grant_name: grant.name,
      total_budget,
      cost_to_date: Math.round(total_loaded_cost * 100) / 100,
      daily_burn_rate: Math.round(daily_burn_rate * 100) / 100,
      monthly_burn_rate: Math.round(daily_burn_rate * 30.44 * 100) / 100,
      projected_final_cost: Math.round(projected_final_cost * 100) / 100,
      projected_remaining: Math.round(projected_remaining * 100) / 100,
      pct_budget_projected: total_budget > 0
        ? Math.round((projected_final_cost / total_budget) * 1000) / 10 : 0,
      exhaustion_date,
      days_remaining,
      pop_end: grant.end_date,
      monthly_data: monthlyData,
    });
  }

  return json({ projections });
}
