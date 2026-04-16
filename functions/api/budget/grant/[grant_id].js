import { json, requireAdmin } from '../../../_utils.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { grant_id } = params;

  try {
  // Get grant info
  const grant = await env.DB.prepare('SELECT * FROM grants WHERE id = ?').bind(grant_id).first();
  if (!grant) return json({ error: 'Grant not found' }, 404);

  // Get F&A rate
  const faRate = await env.DB.prepare(`
    SELECT fa_rate, fa_basis, effective_date FROM grant_fa_rates
    WHERE grant_id = ?
    ORDER BY effective_date DESC
    LIMIT 1
  `).bind(grant_id).first();

  const fa_rate = faRate?.fa_rate || 0;
  const fa_basis = faRate?.fa_basis || 'mtdc';

  // Get projects for this grant
  const { results: projects } = await env.DB.prepare(`
    SELECT id, name, budget, status FROM projects WHERE grant_id = ?
  `).bind(grant_id).all();

  const projectBudgets = [];
  let grant_total_personnel = 0;
  let grant_total_fa = 0;
  let grant_total_cost = 0;
  let grant_fema_budget = 0;

  // Batch: all entries for this grant across all projects at once
  const { results: allEntries } = await env.DB.prepare(`
    SELECT
      t.project_id,
      te.hours,
      sr.annual_salary, sr.fringe_rate
    FROM timesheet_entries te
    JOIN tasks t ON t.id = te.task_id
    LEFT JOIN salary_records sr ON sr.user_id = te.user_id
      AND sr.effective_date = (
        SELECT MAX(sr2.effective_date)
        FROM salary_records sr2
        WHERE sr2.user_id = te.user_id AND sr2.effective_date <= te.entry_date
      )
    WHERE t.project_id IN (SELECT id FROM projects WHERE grant_id = ?)
  `).bind(grant_id).all();

  // Aggregate by project_id
  const entryByProject = {};
  for (const e of allEntries) {
    const hourly_loaded = ((e.annual_salary || 0) / 2080) * (1 + (e.fringe_rate || 0));
    const cost = (e.hours || 0) * hourly_loaded;
    if (!entryByProject[e.project_id]) entryByProject[e.project_id] = { hours: 0, personnel_cost: 0 };
    entryByProject[e.project_id].hours += e.hours || 0;
    entryByProject[e.project_id].personnel_cost += cost;
  }

  for (const project of projects) {
    const { hours: hours_logged = 0, personnel_cost = 0 } = entryByProject[project.id] || {};
    const project_fa = personnel_cost * fa_rate;
    const total_cost = personnel_cost + project_fa;
    const fema_budget = project.budget || 0;

    projectBudgets.push({
      id: project.id,
      name: project.name,
      status: project.status,
      fema_budget,
      hours_logged: Math.round(hours_logged * 10) / 10,
      personnel_cost: Math.round(personnel_cost * 100) / 100,
      fa_cost: Math.round(project_fa * 100) / 100,
      total_cost: Math.round(total_cost * 100) / 100,
      remaining: Math.round((fema_budget - total_cost) * 100) / 100,
      pct_used: fema_budget > 0 ? Math.round((total_cost / fema_budget) * 1000) / 10 : 0,
    });

    grant_total_personnel += personnel_cost;
    grant_total_fa += project_fa;
    grant_total_cost += total_cost;
    grant_fema_budget += fema_budget;
  }

  // Use grant-level budget if set, otherwise sum of projects
  const total_budget = grant.total_budget || grant_fema_budget;

  return json({
    grant: {
      id: grant.id,
      name: grant.name,
      funder: grant.funder,
      start_date: grant.start_date,
      end_date: grant.end_date,
      total_budget: total_budget,
      status: grant.status,
    },
    fa_rate,
    fa_basis,
    projects: projectBudgets,
    totals: {
      fema_budget: total_budget,
      personnel_cost: Math.round(grant_total_personnel * 100) / 100,
      fa_cost: Math.round(grant_total_fa * 100) / 100,
      total_cost: Math.round(grant_total_cost * 100) / 100,
      remaining: Math.round((total_budget - grant_total_cost) * 100) / 100,
      pct_used: total_budget > 0
        ? Math.round((grant_total_cost / total_budget) * 1000) / 10 : 0,
    },
  });
  } catch (err) {
    return json({ error: 'Grant budget calculation failed', detail: err.message }, 500);
  }
}
