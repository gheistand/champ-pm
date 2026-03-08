import { json, requireAdmin } from '../../_utils.js';

async function handleGet(context) {
  const { env, data } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { results: criteria } = await env.DB.prepare(
    'SELECT * FROM promotion_criteria ORDER BY from_classification, to_classification'
  ).all();

  return json({ criteria });
}

async function handlePost(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const { from_classification, to_classification, min_years_in_role, min_years_total, notes } = body;

  if (!from_classification || !to_classification) {
    return json({ error: 'from_classification and to_classification are required' }, 400);
  }

  const result = await env.DB.prepare(`
    INSERT INTO promotion_criteria (from_classification, to_classification, min_years_in_role, min_years_total, notes)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    from_classification, to_classification,
    min_years_in_role || 3, min_years_total || 0, notes || null
  ).run();

  const record = await env.DB.prepare('SELECT * FROM promotion_criteria WHERE id = ?')
    .bind(result.meta.last_row_id).first();

  return json({ criterion: record }, 201);
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  return new Response('Method Not Allowed', { status: 405 });
}
