import { json, requireAdmin } from '../../../_utils.js';

async function handleGet(context) {
  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const grant_id = params.id;

  // Get current F&A rate (most recent)
  const current = await env.DB.prepare(`
    SELECT * FROM grant_fa_rates
    WHERE grant_id = ?
    ORDER BY effective_date DESC
    LIMIT 1
  `).bind(grant_id).first();

  // Get full history
  const { results: history } = await env.DB.prepare(`
    SELECT * FROM grant_fa_rates
    WHERE grant_id = ?
    ORDER BY effective_date DESC
  `).bind(grant_id).all();

  return json({ current, history });
}

async function handlePost(context) {
  const { env, data, request, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const grant_id = params.id;
  const body = await request.json();
  const { fa_rate, fa_basis, effective_date, notes } = body;

  if (fa_rate === undefined || !effective_date) {
    return json({ error: 'fa_rate and effective_date are required' }, 400);
  }

  const result = await env.DB.prepare(`
    INSERT INTO grant_fa_rates (grant_id, fa_rate, fa_basis, effective_date, notes)
    VALUES (?, ?, ?, ?, ?)
  `).bind(grant_id, fa_rate, fa_basis || 'mtdc', effective_date, notes || null).run();

  const record = await env.DB.prepare('SELECT * FROM grant_fa_rates WHERE id = ?')
    .bind(result.meta.last_row_id).first();

  return json({ rate: record }, 201);
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  return new Response('Method Not Allowed', { status: 405 });
}
