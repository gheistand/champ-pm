import { json, requireAdmin } from '../../_utils.js';

async function handleGet(context) {
  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { user_id } = params;

  // Get salary history
  const { results: records } = await env.DB.prepare(`
    SELECT sr.*, u.name as user_name
    FROM salary_records sr
    LEFT JOIN users u ON u.id = sr.user_id
    WHERE sr.user_id = ?
    ORDER BY sr.effective_date DESC, sr.created_at DESC
  `).bind(user_id).all();

  // Get user info
  const user = await env.DB.prepare('SELECT id, name, email, title, classification FROM users WHERE id = ?')
    .bind(user_id).first();

  return json({ records, user });
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  return new Response('Method Not Allowed', { status: 405 });
}
