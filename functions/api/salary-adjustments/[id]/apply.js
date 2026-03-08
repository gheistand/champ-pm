import { json, requireAdmin } from '../../../_utils.js';

export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;

  // Get the adjustment
  const adjustment = await env.DB.prepare('SELECT * FROM salary_adjustments WHERE id = ?').bind(id).first();
  if (!adjustment) return json({ error: 'Adjustment not found' }, 404);

  if (adjustment.status !== 'approved') {
    return json({ error: 'Only approved adjustments can be applied' }, 400);
  }

  // Look up current fringe rate for the user's appointment type
  const currentSalary = await env.DB.prepare(`
    SELECT appointment_type FROM salary_records
    WHERE user_id = ?
    ORDER BY effective_date DESC, id DESC
    LIMIT 1
  `).bind(adjustment.user_id).first();

  const appointmentType = currentSalary?.appointment_type || 'surs';

  const fringeRate = await env.DB.prepare(`
    SELECT rate FROM fringe_rates
    WHERE appointment_type = ?
    ORDER BY effective_date DESC
    LIMIT 1
  `).bind(appointmentType).first();

  const fringe = fringeRate?.rate || 0.451;
  const effectiveDate = adjustment.effective_date || new Date().toISOString().split('T')[0];

  // Create new salary record
  await env.DB.prepare(`
    INSERT INTO salary_records (user_id, annual_salary, fringe_rate, appointment_type, effective_date, change_type, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    adjustment.user_id,
    adjustment.proposed_salary,
    fringe,
    appointmentType,
    effectiveDate,
    adjustment.adjustment_type,
    `Applied from salary adjustment #${id}: ${adjustment.reason || ''}`.trim(),
    data.userId
  ).run();

  // Update adjustment status to reflect it's been applied
  await env.DB.prepare(`
    UPDATE salary_adjustments SET status = 'applied', updated_at = datetime('now') WHERE id = ?
  `).bind(id).run();

  return json({ success: true, message: 'Salary record created and adjustment applied' });
}
