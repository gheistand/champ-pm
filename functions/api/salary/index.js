import { json, requireAdmin } from '../../_utils.js';

async function handlePost(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const { user_id, annual_salary, appointment_type, effective_date, change_type, classification, notes } = body;

  if (!user_id || !annual_salary || !appointment_type || !effective_date || !change_type) {
    return json({ error: 'user_id, annual_salary, appointment_type, effective_date, and change_type are required' }, 400);
  }

  // Look up current fringe rate for the appointment type
  const fringeRate = await env.DB.prepare(`
    SELECT rate FROM fringe_rates
    WHERE appointment_type = ? AND effective_date <= ?
    ORDER BY effective_date DESC
    LIMIT 1
  `).bind(appointment_type, effective_date).first();

  if (!fringeRate) {
    return json({ error: `No fringe rate found for appointment type "${appointment_type}"` }, 400);
  }

  const result = await env.DB.prepare(`
    INSERT INTO salary_records (user_id, annual_salary, fringe_rate, appointment_type, effective_date, change_type, classification, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    user_id, annual_salary, fringeRate.rate, appointment_type,
    effective_date, change_type, classification || null, notes || null, data.userId
  ).run();

  const record = await env.DB.prepare('SELECT * FROM salary_records WHERE id = ?')
    .bind(result.meta.last_row_id).first();

  return json({ record }, 201);
}

export async function onRequest(context) {
  if (context.request.method === 'POST') return handlePost(context);
  return new Response('Method Not Allowed', { status: 405 });
}
