import { json, requireAdmin } from '../../../_utils.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { project_id } = params;

  try {
  // Get project info
  const project = await env.DB.prepare(`
    SELECT p.*, g.name as grant_name, g.id as grant_id
    FROM projects p
    JOIN grants g ON g.id = p.grant_id
    WHERE p.id = ?
  `).bind(project_id).first();

  if (!project) return json({ error: 'Project not found' }, 404);

  // Get F&A rate for the grant
  const faRate = await env.DB.prepare(`
    SELECT fa_rate, fa_basis FROM grant_fa_rates
    WHERE grant_id = ?
    ORDER BY effective_date DESC
    LIMIT 1
  `).bind(project.grant_id).first();

  const fa_rate = faRate?.fa_rate || 0;

  // Get tasks for this project
  const { results: tasks } = await env.DB.prepare(`
    SELECT id, name, budget, estimated_hours, status FROM tasks WHERE project_id = ?
  `).bind(project_id).all();

  // Calculate costs per task
  const taskBudgets = [];
  let project_total_personnel = 0;
  let project_total_fa = 0;
  let project_total_cost = 0;
  let project_fema_budget = 0;

  // Batch: all entries for this project across all tasks
  const { results: allEntries } = await env.DB.prepare(`
    SELECT
      te.task_id, te.hours,
      sr.annual_salary, sr.fringe_rate
    FROM timesheet_entries te
    LEFT JOIN salary_records sr ON sr.user_id = te.user_id
      AND sr.effective_date = (
        SELECT MAX(sr2.effective_date)
        FROM salary_records sr2
        WHERE sr2.user_id = te.user_id AND sr2.effective_date <= te.entry_date
      )
    WHERE te.task_id IN (SELECT id FROM tasks WHERE project_id = ?)
  `).bind(project_id).all();

  // Aggregate by task_id
  const entryByTask = {};
  for (const e of allEntries) {
    const hourly_loaded = ((e.annual_salary || 0) / 2080) * (1 + (e.fringe_rate || 0));
    const cost = (e.hours || 0) * hourly_loaded;
    if (!entryByTask[e.task_id]) entryByTask[e.task_id] = { hours: 0, personnel_cost: 0 };
    entryByTask[e.task_id].hours += e.hours || 0;
    entryByTask[e.task_id].personnel_cost += cost;
  }

  for (const task of tasks) {
    const { hours: hours_logged = 0, personnel_cost = 0 } = entryByTask[task.id] || {};
    const task_fa = personnel_cost * fa_rate;
    const total_cost = personnel_cost + task_fa;
    const fema_budget = task.budget || 0;

    taskBudgets.push({
      id: task.id,
      name: task.name,
      status: task.status,
      fema_budget,
      hours_logged: Math.round(hours_logged * 10) / 10,
      personnel_cost: Math.round(personnel_cost * 100) / 100,
      fa_cost: Math.round(task_fa * 100) / 100,
      total_cost: Math.round(total_cost * 100) / 100,
      remaining: Math.round((fema_budget - total_cost) * 100) / 100,
      pct_used: fema_budget > 0 ? Math.round((total_cost / fema_budget) * 1000) / 10 : 0,
    });

    project_total_personnel += personnel_cost;
    project_total_fa += task_fa;
    project_total_cost += total_cost;
    project_fema_budget += fema_budget;
  }

  return json({
    project: {
      id: project.id,
      name: project.name,
      grant_name: project.grant_name,
      grant_id: project.grant_id,
      budget: project.budget,
    },
    fa_rate,
    tasks: taskBudgets,
    totals: {
      fema_budget: Math.round(project_fema_budget * 100) / 100,
      personnel_cost: Math.round(project_total_personnel * 100) / 100,
      fa_cost: Math.round(project_total_fa * 100) / 100,
      total_cost: Math.round(project_total_cost * 100) / 100,
      remaining: Math.round((project_fema_budget - project_total_cost) * 100) / 100,
      pct_used: project_fema_budget > 0
        ? Math.round((project_total_cost / project_fema_budget) * 1000) / 10 : 0,
    },
  });
  } catch (err) {
    return json({ error: 'Project budget calculation failed', detail: err.message }, 500);
  }
}
