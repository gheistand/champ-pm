import { json, requireAdmin } from '../../_utils.js';

async function handleGet(context) {
  const { env, data } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  // Get current rates (most recent effective_date per appointment_type)
  const { results: rates } = await env.DB.prepare(`
    SELECT fr1.*
    FROM fringe_rates fr1
    INNER JOIN (
      SELECT appointment_type, MAX(effective_date) as max_date
      FROM fringe_rates
      GROUP BY appointment_type
    ) fr2 ON fr1.appointment_type = fr2.appointment_type AND fr1.effective_date = fr2.max_date
    ORDER BY fr1.appointment_type
  `).all();

  // Also get full history
  const { results: history } = await env.DB.prepare(`
    SELECT * FROM fringe_rates ORDER BY effective_date DESC, appointment_type
  `).all();

  return json({ rates, history });
}

async function handlePost(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const { appointment_type, rate, effective_date, notes } = body;

  if (!appointment_type || rate === undefined || !effective_date) {
    return json({ error: 'appointment_type, rate, and effective_date are required' }, 400);
  }

  const result = await env.DB.prepare(`
    INSERT INTO fringe_rates (appointment_type, rate, effective_date, notes)
    VALUES (?, ?, ?, ?)
  `).bind(appointment_type, rate, effective_date, notes || null).run();

  const record = await env.DB.prepare('SELECT * FROM fringe_rates WHERE id = ?')
    .bind(result.meta.last_row_id).first();

  return json({ rate: record }, 201);
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  return new Response('Method Not Allowed', { status: 405 });
}
