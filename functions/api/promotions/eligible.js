import { json, requireAdmin } from '../../_utils.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { env, data } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const today = new Date().toISOString().split('T')[0];

  // Get active staff with salary info
  const { results: staff } = await env.DB.prepare(`
    SELECT
      u.id, u.name, u.email, u.title, u.classification, u.band_classification, u.start_date, u.role_start_date,
      sr.annual_salary, sr.fringe_rate, sr.effective_date as salary_effective
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

  // Get promotion criteria
  const { results: criteria } = await env.DB.prepare(
    'SELECT * FROM promotion_criteria'
  ).all();

  // Get classification bands
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

  // Calculate promotion readiness for each staff member
  const results = [];

  for (const s of staff) {
    const yearsTotal = s.start_date
      ? (new Date(today) - new Date(s.start_date)) / (365.25 * 24 * 60 * 60 * 1000)
      : 0;

    // Years in current role: use role_start_date if set, else salary_effective, else total
    const roleStartDate = s.role_start_date || s.salary_effective;
    const yearsInRole = roleStartDate
      ? (new Date(today) - new Date(roleStartDate)) / (365.25 * 24 * 60 * 60 * 1000)
      : yearsTotal;

    const band = bandMap[s.band_classification] || bandMap[s.classification];
    const compaRatio = band && s.annual_salary ? s.annual_salary / band.band_mid : null;

    // Find applicable promotion criteria
    const applicableCriteria = criteria.filter(c => c.from_classification === (s.band_classification || s.classification));

    for (const criterion of applicableCriteria) {
      let score = 0;
      const checks = [];

      const yearsInRoleMet = yearsInRole >= criterion.min_years_in_role;
      if (yearsInRoleMet) score += 40;
      checks.push({
        label: `Years in role >= ${criterion.min_years_in_role}`,
        met: yearsInRoleMet,
        value: Math.round(yearsInRole * 10) / 10,
        points: 40,
      });

      const yearsTotalMet = yearsTotal >= criterion.min_years_total;
      if (yearsTotalMet) score += 30;
      checks.push({
        label: `Total years >= ${criterion.min_years_total}`,
        met: yearsTotalMet,
        value: Math.round(yearsTotal * 10) / 10,
        points: 30,
      });

      const compaRatioMet = compaRatio !== null && compaRatio >= 0.95;
      if (compaRatioMet) score += 30;
      checks.push({
        label: 'Compa-ratio >= 0.95',
        met: compaRatioMet,
        value: compaRatio !== null ? Math.round(compaRatio * 1000) / 1000 : null,
        points: 30,
      });

      const nextBand = bandMap[criterion.to_classification];

      results.push({
        user_id: s.id,
        name: s.name,
        email: s.email,
        current_classification: s.band_classification || s.classification,
        eligible_for: criterion.to_classification,
        years_in_role: Math.round(yearsInRole * 10) / 10,
        years_total: Math.round(yearsTotal * 10) / 10,
        annual_salary: s.annual_salary,
        compa_ratio: compaRatio !== null ? Math.round(compaRatio * 1000) / 1000 : null,
        readiness_score: score,
        checks,
        next_band_mid: nextBand?.band_mid || null,
        salary_impact: nextBand ? Math.round((nextBand.band_mid - (s.annual_salary || 0)) * 100) / 100 : null,
      });
    }
  }

  // Sort by score descending, filter >= 70
  results.sort((a, b) => b.readiness_score - a.readiness_score);
  const eligible = results.filter(r => r.readiness_score >= 70);
  const all = results;

  return json({ eligible, all });
}
