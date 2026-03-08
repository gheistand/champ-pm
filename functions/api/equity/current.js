import { json, requireAdmin } from '../../_utils.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { env, data } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const today = new Date().toISOString().split('T')[0];

  // Get all active staff with most recent salary record
  const { results: staff } = await env.DB.prepare(`
    SELECT
      u.id, u.name, u.email, u.title, u.classification, u.band_classification, u.start_date, u.is_active,
      sr.annual_salary, sr.fringe_rate, sr.appointment_type, sr.effective_date as salary_effective
    FROM users u
    LEFT JOIN salary_records sr ON sr.user_id = u.id
      AND sr.id = (
        SELECT sr2.id FROM salary_records sr2
        WHERE sr2.user_id = u.id
        ORDER BY sr2.effective_date DESC, sr2.id DESC
        LIMIT 1
      )
    WHERE u.is_active = 1
    ORDER BY u.name
  `).all();

  // Get current classification bands (most recent per classification)
  const { results: bands } = await env.DB.prepare(`
    SELECT cb1.*
    FROM classification_bands cb1
    INNER JOIN (
      SELECT classification, MAX(effective_date) as max_date
      FROM classification_bands
      GROUP BY classification
    ) cb2 ON cb1.classification = cb2.classification AND cb1.effective_date = cb2.max_date
  `).all();

  const bandMap = {};
  for (const b of bands) {
    bandMap[b.classification] = b;
  }

  // Calculate equity metrics for each staff member
  const analysis = staff.map(s => {
    const yearsOfService = s.start_date
      ? (new Date(today) - new Date(s.start_date)) / (365.25 * 24 * 60 * 60 * 1000)
      : 0;

    const band = bandMap[s.band_classification] || bandMap[s.classification];
    const salary = s.annual_salary || 0;

    let compa_ratio = null;
    let percentile_in_band = null;
    let equity_gap = null;
    let flag = null;

    if (band && salary > 0) {
      compa_ratio = salary / band.band_mid;

      // Percentile in band (0 = at min, 1 = at max)
      const range = band.band_max - band.band_min;
      percentile_in_band = range > 0 ? (salary - band.band_min) / range : 0.5;

      // Expected salary by tenure (linear interpolation)
      const typicalYearsMax = band.typical_years_max || 10;
      const tenurePct = Math.min(yearsOfService / typicalYearsMax, 1.0);
      const expectedSalary = band.band_min + (tenurePct * (band.band_max - band.band_min));
      equity_gap = expectedSalary - salary;

      // Flag
      if (compa_ratio < 0.85) {
        flag = 'underpaid';
      } else if (compa_ratio <= 1.15) {
        flag = 'at_market';
      } else {
        flag = 'above_market';
      }
    }

    return {
      user_id: s.id,
      name: s.name,
      email: s.email,
      title: s.title,
      classification: s.band_classification || s.classification,
      start_date: s.start_date,
      years_of_service: Math.round(yearsOfService * 10) / 10,
      annual_salary: salary,
      appointment_type: s.appointment_type,
      band_min: band?.band_min || null,
      band_mid: band?.band_mid || null,
      band_max: band?.band_max || null,
      compa_ratio: compa_ratio !== null ? Math.round(compa_ratio * 1000) / 1000 : null,
      percentile_in_band: percentile_in_band !== null ? Math.round(percentile_in_band * 1000) / 1000 : null,
      equity_gap: equity_gap !== null ? Math.round(equity_gap * 100) / 100 : null,
      flag,
    };
  });

  // Sort by equity gap descending (most underpaid first)
  analysis.sort((a, b) => (b.equity_gap || 0) - (a.equity_gap || 0));

  // Summary counts
  const summary = {
    total: analysis.length,
    underpaid: analysis.filter(a => a.flag === 'underpaid').length,
    at_market: analysis.filter(a => a.flag === 'at_market').length,
    above_market: analysis.filter(a => a.flag === 'above_market').length,
    no_band: analysis.filter(a => a.flag === null).length,
    needing_attention: analysis.filter(a => a.equity_gap !== null && a.equity_gap > 3000).length,
  };

  return json({ analysis, summary, bands });
}
