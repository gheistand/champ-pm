import { json, requireAdmin } from '../../_utils.js';

async function handleGet(context) {
  const { env, data } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { results: adjustments } = await env.DB.prepare(`
    SELECT sa.*, u.name as user_name, u.email as user_email, u.classification as user_classification
    FROM salary_adjustments sa
    LEFT JOIN users u ON u.id = sa.user_id
    ORDER BY
      CASE sa.status WHEN 'draft' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
      sa.created_at DESC
  `).all();

  return json({ adjustments });
}

async function handlePost(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const { user_id, adjustment_type, current_salary, proposed_salary, reason, effective_date, status } = body;

  if (!user_id || !adjustment_type || current_salary === undefined || proposed_salary === undefined) {
    return json({ error: 'user_id, adjustment_type, current_salary, and proposed_salary are required' }, 400);
  }

  const result = await env.DB.prepare(`
    INSERT INTO salary_adjustments (user_id, adjustment_type, current_salary, proposed_salary, reason, recommended_by, status, effective_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    user_id, adjustment_type, current_salary, proposed_salary,
    reason || null, data.userId, status || 'draft', effective_date || null
  ).run();

  const record = await env.DB.prepare('SELECT * FROM salary_adjustments WHERE id = ?')
    .bind(result.meta.last_row_id).first();

  return json({ adjustment: record }, 201);
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  return new Response('Method Not Allowed', { status: 405 });
}
