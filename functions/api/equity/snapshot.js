import { json, requireAdmin } from '../../_utils.js';

export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const { notes, items } = body;
  const today = new Date().toISOString().split('T')[0];

  if (!items || !Array.isArray(items) || items.length === 0) {
    return json({ error: 'items array is required' }, 400);
  }

  // Create snapshot
  const snapshotResult = await env.DB.prepare(`
    INSERT INTO equity_snapshots (snapshot_date, created_by, notes)
    VALUES (?, ?, ?)
  `).bind(today, data.userId, notes || null).run();

  const snapshotId = snapshotResult.meta.last_row_id;

  // Insert snapshot items
  const stmt = env.DB.prepare(`
    INSERT INTO equity_snapshot_items
      (snapshot_id, user_id, classification, annual_salary, years_of_service,
       band_min, band_mid, band_max, compa_ratio, percentile_in_band, equity_gap, flag)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const batch = items.map(item =>
    stmt.bind(
      snapshotId, item.user_id, item.classification || '', item.annual_salary || 0,
      item.years_of_service || 0, item.band_min, item.band_mid, item.band_max,
      item.compa_ratio, item.percentile_in_band, item.equity_gap, item.flag
    )
  );

  await env.DB.batch(batch);

  return json({ snapshot_id: snapshotId }, 201);
}
