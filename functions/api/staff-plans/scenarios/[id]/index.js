import { json, requireAdmin } from '../../../../_utils.js';

async function handleGet(context) {
  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;

  const scenario = await env.DB.prepare(`
    SELECT s.*, u.name as created_by_name
    FROM staff_plan_scenarios s
    LEFT JOIN users u ON u.id = s.created_by
    WHERE s.id = ?
  `).bind(id).first();

  if (!scenario) return json({ error: 'Not found' }, 404);

  const { results: rows } = await env.DB.prepare(`
    SELECT r.*, u.name as user_name
    FROM staff_plan_scenario_rows r
    LEFT JOIN users u ON u.id = r.user_id
    WHERE r.scenario_id = ?
    ORDER BY r.user_id, r.period_start, r.fund_number
  `).bind(id).all();

  return json({ scenario, rows });
}

async function handleDelete(context) {
  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;
  await env.DB.prepare('DELETE FROM staff_plan_scenarios WHERE id=?').bind(id).run();
  return json({ ok: true });
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'DELETE') return handleDelete(context);
  return new Response('Method Not Allowed', { status: 405 });
}
