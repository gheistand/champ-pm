import { json, requireAdmin } from '../../_utils.js';

async function handleGet(context) {
  const { env, data } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { results: bands } = await env.DB.prepare(`
    SELECT cb1.*
    FROM classification_bands cb1
    INNER JOIN (
      SELECT classification, MAX(effective_date) as max_date
      FROM classification_bands
      GROUP BY classification
    ) cb2 ON cb1.classification = cb2.classification AND cb1.effective_date = cb2.max_date
    ORDER BY cb1.band_mid ASC
  `).all();

  return json({ bands });
}

async function handlePost(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const { classification, band_min, band_mid, band_max, typical_years_min, typical_years_max, notes, effective_date } = body;

  if (!classification || band_min === undefined || band_mid === undefined || band_max === undefined || !effective_date) {
    return json({ error: 'classification, band_min, band_mid, band_max, and effective_date are required' }, 400);
  }

  const result = await env.DB.prepare(`
    INSERT INTO classification_bands (classification, band_min, band_mid, band_max, typical_years_min, typical_years_max, notes, effective_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    classification, band_min, band_mid, band_max,
    typical_years_min || null, typical_years_max || null,
    notes || null, effective_date
  ).run();

  const record = await env.DB.prepare('SELECT * FROM classification_bands WHERE id = ?')
    .bind(result.meta.last_row_id).first();

  return json({ band: record }, 201);
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  return new Response('Method Not Allowed', { status: 405 });
}
