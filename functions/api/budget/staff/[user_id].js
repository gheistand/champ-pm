import { json, requireAdmin } from '../../../_utils.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { user_id } = params;

  const user = await env.DB.prepare(
    'SELECT id, name, title FROM users WHERE id = ?'
  ).bind(user_id).first();
  if (!user) return json({ error: 'User not found' }, 404);

  const now = new Date();
  const fyStart = now.getMonth() >= 6
    ? `${now.getFullYear()}-07-01`
    : `${now.getFullYear() - 1}-07-01`;

  try {
    const { results: entries } = await env.DB.prepare(`
      SELECT
        te.hours, te.entry_date,
        g.id as grant_id, g.name as grant_name,
        p.id as project_id, p.name as project_name,
        sr.annual_salary, sr.fringe_rate
      FROM timesheet_entries te
      JOIN tasks t ON t.id = te.task_id
      JOIN projects p ON p.id = t.project_id
      JOIN grants g ON g.id = p.grant_id
      LEFT JOIN salary_records sr ON sr.user_id = te.user_id
        AND sr.effective_date = (
          SELECT MAX(sr2.effective_date)
          FROM salary_records sr2
          WHERE sr2.user_id = te.user_id AND sr2.effective_date <= te.entry_date
        )
      WHERE te.user_id = ? AND te.entry_date >= ?
      ORDER BY g.name, p.name
    `).bind(user_id, fyStart).all();

    const grantMap = {};

    for (const e of entries) {
      const hourly_loaded = ((e.annual_salary || 0) / 2080) * (1 + (e.fringe_rate || 0));
      const entry_personnel_cost = (e.hours || 0) * hourly_loaded;

      if (!grantMap[e.grant_id]) {
        grantMap[e.grant_id] = {
          grant_id: e.grant_id,
          grant_name: e.grant_name,
          hours: 0,
          personnel_cost: 0,
          projects: {},
        };
      }

      grantMap[e.grant_id].hours += e.hours || 0;
      grantMap[e.grant_id].personnel_cost += entry_personnel_cost;

      if (!grantMap[e.grant_id].projects[e.project_id]) {
        grantMap[e.grant_id].projects[e.project_id] = {
          project_id: e.project_id,
          project_name: e.project_name,
          hours: 0,
          personnel_cost: 0,
        };
      }
      grantMap[e.grant_id].projects[e.project_id].hours += e.hours || 0;
      grantMap[e.grant_id].projects[e.project_id].personnel_cost += entry_personnel_cost;
    }

    // Fetch all FA rates for the grants that appear in results
    const grantIds = Object.keys(grantMap).map(Number);
    const faMap = {};
    if (grantIds.length > 0) {
      for (const gid of grantIds) {
        const faRate = await env.DB.prepare(`
          SELECT fa_rate FROM grant_fa_rates
          WHERE grant_id = ?
          ORDER BY effective_date DESC LIMIT 1
        `).bind(gid).first();
        faMap[gid] = faRate?.fa_rate || 0;
      }
    }

    const grants = Object.values(grantMap).map((g) => {
      const fa_rate = faMap[g.grant_id] || 0;
      const fa_cost = g.personnel_cost * fa_rate;
      const total_cost = g.personnel_cost + fa_cost;
      return {
        grant_id: g.grant_id,
        grant_name: g.grant_name,
        hours: Math.round(g.hours * 10) / 10,
        personnel_cost: Math.round(g.personnel_cost * 100) / 100,
        fa_rate,
        fa_cost: Math.round(fa_cost * 100) / 100,
        total_cost: Math.round(total_cost * 100) / 100,
        projects: Object.values(g.projects).map((p) => ({
          ...p,
          hours: Math.round(p.hours * 10) / 10,
          personnel_cost: Math.round(p.personnel_cost * 100) / 100,
        })),
      };
    });

    return json({ user, fy_start: fyStart, grants });
  } catch (err) {
    return json({ error: 'Failed to load staff cost data', detail: err.message }, 500);
  }
}
