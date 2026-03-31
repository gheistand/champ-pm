import { json, requireAdmin } from '../../../../_utils.js';

export async function onRequest(context) {
  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  if (context.request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { userId } = params;

  // Get all distinct funds this user has ever been appointed to,
  // joined with current balance info if available
  const { results } = await env.DB.prepare(`
    SELECT
      sa.fund_number,
      sa.full_account_string,
      sa.chart,
      sa.org,
      sa.program,
      sa.activity,
      MAX(sa.salary_rate) as latest_salary_rate,
      MAX(sa.period_end) as last_appointment_end,
      b.remaining_balance,
      b.pop_end_date,
      b.as_of_date,
      b.id as balance_id
    FROM staff_appointments sa
    LEFT JOIN staff_plan_grant_balances b ON b.fund_number = sa.fund_number
    WHERE sa.user_id = ?
    GROUP BY sa.fund_number, sa.full_account_string, sa.chart, sa.org, sa.program, sa.activity
    ORDER BY sa.fund_number
  `).bind(userId).all();

  return json({ funds: results });
}
