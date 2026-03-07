import { json, requireAdmin } from '../../../../_utils.js';

export async function onRequestPost(context) {
  const { env, data, request, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;
  const body = await request.json().catch(() => ({}));
  const review_notes = body.notes || '';

  const week = await env.DB.prepare('SELECT * FROM timesheet_weeks WHERE id = ?').bind(id).first();
  if (!week) return json({ error: 'Week not found' }, 404);

  await env.DB.prepare(`
    UPDATE timesheet_weeks SET
      status = 'rejected',
      reviewed_by = ?,
      reviewed_at = datetime('now'),
      review_notes = ?
    WHERE id = ?
  `).bind(data.userId, review_notes, id).run();

  const updated = await env.DB.prepare('SELECT * FROM timesheet_weeks WHERE id = ?').bind(id).first();
  return json({ week: updated });
}
