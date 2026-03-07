import { json, requireAdmin } from '../../../_utils.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { user_id } = params;

  // Get most recent salary record
  const record = await env.DB.prepare(`
    SELECT sr.*, u.name as user_name
    FROM salary_records sr
    LEFT JOIN users u ON u.id = sr.user_id
    WHERE sr.user_id = ?
    ORDER BY sr.effective_date DESC, sr.created_at DESC
    LIMIT 1
  `).bind(user_id).first();

  if (!record) {
    return json({ error: 'No salary record found' }, 404);
  }

  const hourly_rate = record.annual_salary / 2080;
  const loaded_hourly_rate = hourly_rate * (1 + record.fringe_rate);

  return json({
    record,
    hourly_rate: Math.round(hourly_rate * 100) / 100,
    loaded_hourly_rate: Math.round(loaded_hourly_rate * 100) / 100,
  });
}
