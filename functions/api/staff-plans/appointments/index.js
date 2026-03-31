import { json, requireAdmin } from '../../../_utils.js';

export async function onRequest(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const url = new URL(request.url);
  const user_id = url.searchParams.get('user_id');
  const fund = url.searchParams.get('fund');
  const date_from = url.searchParams.get('date_from');
  const date_to = url.searchParams.get('date_to');

  let query = `
    SELECT sa.*, u.name as user_name
    FROM staff_appointments sa
    LEFT JOIN users u ON u.id = sa.user_id
    WHERE 1=1
  `;
  const binds = [];

  if (user_id) { query += ' AND sa.user_id = ?'; binds.push(user_id); }
  if (fund) { query += ' AND sa.fund_number = ?'; binds.push(fund); }
  if (date_from) { query += ' AND sa.period_end >= ?'; binds.push(date_from); }
  if (date_to) { query += ' AND sa.period_start <= ?'; binds.push(date_to); }

  query += ' ORDER BY sa.user_id, sa.period_start, sa.fund_number';

  const { results } = await env.DB.prepare(query).bind(...binds).all();
  return json({ appointments: results });
}
