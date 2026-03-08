import { json, requireAdmin } from '../../../_utils.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { user_id } = params;
  const today = new Date().toISOString().split('T')[0];

  // Get user info
  const user = await env.DB.prepare(
    'SELECT id, name, email, title, classification, band_classification, start_date FROM users WHERE id = ?'
  ).bind(user_id).first();

  if (!user) return json({ error: 'User not found' }, 404);

  // Get salary history
  const { results: salaryHistory } = await env.DB.prepare(`
    SELECT * FROM salary_records WHERE user_id = ?
    ORDER BY effective_date DESC, id DESC
  `).bind(user_id).all();

  const currentSalary = salaryHistory[0] || null;

  const yearsTotal = user.start_date
    ? (new Date(today) - new Date(user.start_date)) / (365.25 * 24 * 60 * 60 * 1000)
    : 0;

  const yearsInRole = currentSalary?.effective_date
    ? (new Date(today) - new Date(currentSalary.effective_date)) / (365.25 * 24 * 60 * 60 * 1000)
    : yearsTotal;

  // Get band
  const band = await env.DB.prepare(`
    SELECT * FROM classification_bands
    WHERE classification = ?
    ORDER BY effective_date DESC
    LIMIT 1
  `).bind(user.classification || '').first();

  const compaRatio = band && currentSalary ? currentSalary.annual_salary / band.band_mid : null;

  // Get promotion criteria for current classification
  const { results: criteria } = await env.DB.prepare(`
    SELECT * FROM promotion_criteria WHERE from_classification = ?
  `).bind(user.band_classification || user.classification || '').all();

  const promotionPaths = criteria.map(c => {
    let score = 0;
    const checks = [];

    const yirMet = yearsInRole >= c.min_years_in_role;
    if (yirMet) score += 40;
    checks.push({ label: `Years in role >= ${c.min_years_in_role}`, met: yirMet, value: Math.round(yearsInRole * 10) / 10, points: 40 });

    const ytMet = yearsTotal >= c.min_years_total;
    if (ytMet) score += 30;
    checks.push({ label: `Total years >= ${c.min_years_total}`, met: ytMet, value: Math.round(yearsTotal * 10) / 10, points: 30 });

    const crMet = compaRatio !== null && compaRatio >= 0.95;
    if (crMet) score += 30;
    checks.push({ label: 'Compa-ratio >= 0.95', met: crMet, value: compaRatio !== null ? Math.round(compaRatio * 1000) / 1000 : null, points: 30 });

    return {
      to_classification: c.to_classification,
      readiness_score: score,
      checks,
      notes: c.notes,
    };
  });

  return json({
    user,
    current_salary: currentSalary,
    salary_history: salaryHistory,
    years_total: Math.round(yearsTotal * 10) / 10,
    years_in_role: Math.round(yearsInRole * 10) / 10,
    band,
    compa_ratio: compaRatio !== null ? Math.round(compaRatio * 1000) / 1000 : null,
    promotion_paths: promotionPaths,
  });
}
