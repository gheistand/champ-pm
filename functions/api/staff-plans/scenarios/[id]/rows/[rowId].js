import { json, requireAdmin } from '../../../../../_utils.js';

const FRINGE = 0.451;
const FA = 0.317;

export async function onRequest(context) {
  const { env, data, params, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  if (request.method !== 'PUT') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { id: scenarioId, rowId } = params;
  const body = await request.json();
  const { allocation_pct, notes, flag, is_pinned } = body;

  if (allocation_pct == null && is_pinned == null) {
    return json({ error: 'allocation_pct or is_pinned is required' }, 400);
  }

  // Recalculate estimated_cost
  const existing = await env.DB.prepare(
    'SELECT * FROM staff_plan_scenario_rows WHERE id=? AND scenario_id=?'
  ).bind(rowId, scenarioId).first();

  if (!existing) return json({ error: 'Not found' }, 404);

  const newPct = allocation_pct ?? existing.allocation_pct;
  const salary = existing.salary_rate || 0;
  const months = monthsBetween(existing.period_start, existing.period_end);
  const estimated_cost = (salary / 12) * (newPct / 100) * months * (1 + FRINGE) * (1 + FA);

  const newFlag = newPct < 5 ? 'low_pct' : (flag ?? existing.flag ?? null);
  const newIsPinned = is_pinned ?? existing.is_pinned ?? 0;

  await env.DB.prepare(`
    UPDATE staff_plan_scenario_rows
    SET allocation_pct=?, estimated_cost=?, is_override=1, flag=?, notes=?, is_pinned=?
    WHERE id=? AND scenario_id=?
  `).bind(newPct, estimated_cost, newFlag, notes ?? existing.notes, newIsPinned, rowId, scenarioId).run();

  // Update scenario updated_at
  await env.DB.prepare(`UPDATE staff_plan_scenarios SET updated_at=datetime('now') WHERE id=?`).bind(scenarioId).run();

  const row = await env.DB.prepare('SELECT * FROM staff_plan_scenario_rows WHERE id=?').bind(rowId).first();
  return json({ row });
}

function monthsBetween(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) +
    (e.getDate() - s.getDate()) / 30;
}
