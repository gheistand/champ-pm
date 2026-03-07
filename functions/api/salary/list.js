import { json, requireAdmin } from '../../_utils.js';

// GET /api/salary/list — all staff with their current salary info
export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { env, data } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  // Get all active staff with their most recent salary record
  const { results: staff } = await env.DB.prepare(`
    SELECT
      u.id, u.name, u.email, u.title, u.classification, u.is_active,
      sr.annual_salary, sr.fringe_rate, sr.appointment_type, sr.effective_date,
      sr.change_type
    FROM users u
    LEFT JOIN salary_records sr ON sr.user_id = u.id
      AND sr.effective_date = (
        SELECT MAX(sr2.effective_date)
        FROM salary_records sr2
        WHERE sr2.user_id = u.id
      )
      AND sr.id = (
        SELECT MAX(sr3.id)
        FROM salary_records sr3
        WHERE sr3.user_id = u.id AND sr3.effective_date = sr.effective_date
      )
    WHERE u.is_active = 1
    ORDER BY u.name
  `).all();

  // Compute loaded hourly rate for each
  const staffWithRates = staff.map(s => {
    const hourly_rate = s.annual_salary ? s.annual_salary / 2080 : null;
    const loaded_hourly_rate = hourly_rate ? hourly_rate * (1 + (s.fringe_rate || 0)) : null;
    return {
      ...s,
      hourly_rate: hourly_rate ? Math.round(hourly_rate * 100) / 100 : null,
      loaded_hourly_rate: loaded_hourly_rate ? Math.round(loaded_hourly_rate * 100) / 100 : null,
    };
  });

  return json({ staff: staffWithRates });
}
