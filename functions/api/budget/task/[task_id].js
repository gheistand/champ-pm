import { json, requireAdmin } from '../../../_utils.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { task_id } = params;

  // Get task info with grant reference
  const task = await env.DB.prepare(`
    SELECT t.*, p.name as project_name, p.grant_id, g.name as grant_name
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN grants g ON g.id = p.grant_id
    WHERE t.id = ?
  `).bind(task_id).first();

  if (!task) return json({ error: 'Task not found' }, 404);

  // Get F&A rate for the grant
  const faRate = await env.DB.prepare(`
    SELECT fa_rate, fa_basis FROM grant_fa_rates
    WHERE grant_id = ?
    ORDER BY effective_date DESC
    LIMIT 1
  `).bind(task.grant_id).first();

  const fa_rate = faRate?.fa_rate || 0;

  // Get all timesheet entries for this task with loaded cost calculation
  // Join each entry to the salary record effective at that entry's date
  const { results: entries } = await env.DB.prepare(`
    SELECT
      te.id, te.user_id, te.hours, te.entry_date,
      u.name as user_name,
      tw.status as week_status,
      sr.annual_salary, sr.fringe_rate, sr.appointment_type
    FROM timesheet_entries te
    JOIN users u ON u.id = te.user_id
    LEFT JOIN timesheet_weeks tw ON tw.user_id = te.user_id
      AND tw.week_start = date(te.entry_date, 'weekday 0', '-6 days')
    LEFT JOIN salary_records sr ON sr.user_id = te.user_id
      AND sr.effective_date = (
        SELECT MAX(sr2.effective_date)
        FROM salary_records sr2
        WHERE sr2.user_id = te.user_id AND sr2.effective_date <= te.entry_date
      )
    WHERE te.task_id = ?
    ORDER BY te.entry_date
  `).bind(task_id).all();

  // Calculate costs
  let total_hours = 0;
  let approved_hours = 0;
  let total_loaded_cost = 0;
  let approved_loaded_cost = 0;
  const staffCosts = {};

  for (const entry of entries) {
    const hours = entry.hours || 0;
    const salary = entry.annual_salary || 0;
    const fringe = entry.fringe_rate || 0;
    const hourly_loaded = (salary / 2080) * (1 + fringe);
    const entry_cost = hours * hourly_loaded;

    total_hours += hours;
    total_loaded_cost += entry_cost;

    if (entry.week_status === 'approved') {
      approved_hours += hours;
      approved_loaded_cost += entry_cost;
    }

    // Accumulate per-staff
    if (!staffCosts[entry.user_id]) {
      staffCosts[entry.user_id] = {
        user_id: entry.user_id,
        user_name: entry.user_name,
        hours: 0,
        loaded_cost: 0,
        loaded_hourly_rate: hourly_loaded,
      };
    }
    staffCosts[entry.user_id].hours += hours;
    staffCosts[entry.user_id].loaded_cost += entry_cost;
  }

  const fa_cost = total_loaded_cost * fa_rate;
  const total_cost = total_loaded_cost + fa_cost;
  const fema_budget = task.budget || 0;
  const budget_remaining = fema_budget - total_cost;
  const pct_budget_used = fema_budget > 0 ? (total_cost / fema_budget) * 100 : 0;

  return json({
    task: {
      id: task.id,
      name: task.name,
      project_name: task.project_name,
      grant_name: task.grant_name,
      grant_id: task.grant_id,
    },
    fema_budget: fema_budget,
    hours_logged: Math.round(total_hours * 10) / 10,
    hours_approved: Math.round(approved_hours * 10) / 10,
    loaded_cost_logged: Math.round(total_loaded_cost * 100) / 100,
    loaded_cost_approved: Math.round(approved_loaded_cost * 100) / 100,
    fa_rate,
    fa_cost: Math.round(fa_cost * 100) / 100,
    total_cost: Math.round(total_cost * 100) / 100,
    budget_remaining: Math.round(budget_remaining * 100) / 100,
    pct_budget_used: Math.round(pct_budget_used * 10) / 10,
    staff: Object.values(staffCosts).map(s => ({
      ...s,
      hours: Math.round(s.hours * 10) / 10,
      loaded_cost: Math.round(s.loaded_cost * 100) / 100,
      loaded_hourly_rate: Math.round(s.loaded_hourly_rate * 100) / 100,
    })),
  });
}
