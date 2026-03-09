import { json, requireAdmin } from '../../_utils.js';

const BUDGET_WARN = 0.75;
const BUDGET_CRIT = 0.90;
const POP_INFO_DAYS = 90;
const POP_WARN_DAYS = 60;
const POP_CRIT_DAYS = 30;

export async function onRequestGet(context) {
  const { env, data } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // ── 1. All active grants ─────────────────────────────────────────────────
    const { results: grants } = await env.DB.prepare(`
      SELECT id, name, grant_number, funder, total_budget, start_date, end_date
      FROM grants WHERE status = 'active'
    `).all();

    if (!grants.length) return json({ alerts: [], grant_stats: [] });

    // ── 2. Total hours per grant per user (bulk) ─────────────────────────────
    const { results: hourRows } = await env.DB.prepare(`
      SELECT p.grant_id, te.user_id, SUM(te.hours) as hours
      FROM timesheet_entries te
      JOIN tasks t ON t.id = te.task_id
      JOIN projects p ON p.id = t.project_id
      JOIN grants g ON g.id = p.grant_id
      WHERE g.status = 'active'
      GROUP BY p.grant_id, te.user_id
    `).all();

    // ── 3. Latest salary record per user ─────────────────────────────────────
    const { results: salaryRows } = await env.DB.prepare(`
      SELECT sr.user_id, sr.annual_salary, sr.fringe_rate
      FROM salary_records sr
      WHERE sr.effective_date = (
        SELECT MAX(sr2.effective_date) FROM salary_records sr2
        WHERE sr2.user_id = sr.user_id AND sr2.effective_date <= ?
      )
    `).bind(todayStr).all();

    const salaryMap = {};
    for (const s of salaryRows) {
      salaryMap[s.user_id] = { salary: Number(s.annual_salary) || 0, fringe: Number(s.fringe_rate) || 0 };
    }

    // ── 4. F&A rates per grant ───────────────────────────────────────────────
    const { results: faRows } = await env.DB.prepare(`
      SELECT gfr.grant_id, gfr.fa_rate
      FROM grant_fa_rates gfr
      WHERE gfr.effective_date = (
        SELECT MAX(gfr2.effective_date) FROM grant_fa_rates gfr2
        WHERE gfr2.grant_id = gfr.grant_id AND gfr2.effective_date <= ?
      )
    `).bind(todayStr).all();

    const faMap = {};
    for (const f of faRows) faMap[f.grant_id] = Number(f.fa_rate) || 0;

    // ── 5. Compute cost per grant ────────────────────────────────────────────
    const costByGrant = {};
    for (const r of hourRows) {
      const gid = r.grant_id;
      const sal = salaryMap[r.user_id] || { salary: 0, fringe: 0 };
      const hourly = sal.salary > 0 ? (sal.salary / 2080) * (1 + sal.fringe) : 0;
      const personnel = (Number(r.hours) || 0) * hourly;
      const fa = personnel * (faMap[gid] || 0);
      if (!costByGrant[gid]) costByGrant[gid] = { personnel: 0, fa: 0, hours: 0 };
      costByGrant[gid].personnel += personnel;
      costByGrant[gid].fa += fa;
      costByGrant[gid].hours += Number(r.hours) || 0;
    }

    // ── 6. Generate alerts ───────────────────────────────────────────────────
    const alerts = [];
    const grant_stats = [];

    for (const g of grants) {
      const costs = costByGrant[g.id] || { personnel: 0, fa: 0, hours: 0 };
      const total_cost = costs.personnel + costs.fa;
      const budget = Number(g.total_budget) || 0;
      const pct_used = budget > 0 ? total_cost / budget : null;

      // Days remaining in PoP
      const end = g.end_date ? new Date(g.end_date + 'T00:00:00Z') : null;
      const days_remaining = end ? Math.floor((end - today) / 86400000) : null;
      const overdue = days_remaining !== null && days_remaining < 0;

      const stat = {
        grant_id: g.id,
        grant_name: g.name,
        grant_number: g.grant_number,
        total_budget: budget,
        total_cost: Math.round(total_cost * 100) / 100,
        remaining: Math.round((budget - total_cost) * 100) / 100,
        pct_used: pct_used !== null ? Math.round(pct_used * 1000) / 10 : null,
        hours: Math.round(costs.hours * 10) / 10,
        end_date: g.end_date,
        days_remaining,
      };
      grant_stats.push(stat);

      // Budget alerts (only if budget is set)
      if (budget > 0 && pct_used !== null) {
        if (pct_used >= 1.0) {
          alerts.push({
            id: `budget-over-${g.id}`,
            severity: 'critical',
            type: 'budget',
            grant_id: g.id,
            grant_name: g.name,
            grant_number: g.grant_number,
            title: 'Over Budget',
            message: `${g.name} has burned ${Math.round(pct_used * 100)}% of its $${budget.toLocaleString()} budget ($${Math.round(total_cost - budget).toLocaleString()} over).`,
            pct_used: Math.round(pct_used * 1000) / 10,
          });
        } else if (pct_used >= BUDGET_CRIT) {
          alerts.push({
            id: `budget-crit-${g.id}`,
            severity: 'critical',
            type: 'budget',
            grant_id: g.id,
            grant_name: g.name,
            grant_number: g.grant_number,
            title: 'Budget Critical',
            message: `${g.name} has burned ${Math.round(pct_used * 100)}% of budget — only $${Math.round(budget - total_cost).toLocaleString()} remaining.`,
            pct_used: Math.round(pct_used * 1000) / 10,
          });
        } else if (pct_used >= BUDGET_WARN) {
          alerts.push({
            id: `budget-warn-${g.id}`,
            severity: 'warning',
            type: 'budget',
            grant_id: g.id,
            grant_name: g.name,
            grant_number: g.grant_number,
            title: 'Budget Warning',
            message: `${g.name} has burned ${Math.round(pct_used * 100)}% of budget — $${Math.round(budget - total_cost).toLocaleString()} remaining.`,
            pct_used: Math.round(pct_used * 1000) / 10,
          });
        }
      }

      // PoP alerts
      if (days_remaining !== null) {
        if (overdue) {
          alerts.push({
            id: `pop-over-${g.id}`,
            severity: 'critical',
            type: 'pop',
            grant_id: g.id,
            grant_name: g.name,
            grant_number: g.grant_number,
            title: 'Period of Performance Expired',
            message: `${g.name} PoP ended ${g.end_date} — ${Math.abs(days_remaining)} days ago. Verify all charges are allowable.`,
            days_remaining,
          });
        } else if (days_remaining <= POP_CRIT_DAYS) {
          alerts.push({
            id: `pop-crit-${g.id}`,
            severity: 'critical',
            type: 'pop',
            grant_id: g.id,
            grant_name: g.name,
            grant_number: g.grant_number,
            title: 'PoP Ending Soon',
            message: `${g.name} ends in ${days_remaining} days (${g.end_date}). Budget remaining: $${Math.round(budget - total_cost).toLocaleString()}.`,
            days_remaining,
          });
        } else if (days_remaining <= POP_WARN_DAYS) {
          alerts.push({
            id: `pop-warn-${g.id}`,
            severity: 'warning',
            type: 'pop',
            grant_id: g.id,
            grant_name: g.name,
            grant_number: g.grant_number,
            title: 'PoP Ending in 60 Days',
            message: `${g.name} ends in ${days_remaining} days (${g.end_date}). Budget remaining: $${Math.round(budget - total_cost).toLocaleString()}.`,
            days_remaining,
          });
        } else if (days_remaining <= POP_INFO_DAYS) {
          alerts.push({
            id: `pop-info-${g.id}`,
            severity: 'info',
            type: 'pop',
            grant_id: g.id,
            grant_name: g.name,
            grant_number: g.grant_number,
            title: 'PoP Ending in 90 Days',
            message: `${g.name} ends in ${days_remaining} days (${g.end_date}).`,
            days_remaining,
          });
        }
      }
    }

    // Sort: critical first, then warning, then info; within severity by days_remaining/pct_used
    const order = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => {
      if (order[a.severity] !== order[b.severity]) return order[a.severity] - order[b.severity];
      // PoP alerts: sooner = more urgent
      if (a.type === 'pop' && b.type === 'pop') return (a.days_remaining ?? 999) - (b.days_remaining ?? 999);
      // Budget alerts: higher pct = more urgent
      if (a.type === 'budget' && b.type === 'budget') return (b.pct_used ?? 0) - (a.pct_used ?? 0);
      return 0;
    });

    return json({ alerts, grant_stats });
  } catch (err) {
    return json({ error: err.message || 'Internal server error' }, 500);
  }
}
