import { json, requireAdmin } from '../../../../_utils.js';

export async function onRequestPost(context) {
  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;

  const week = await env.DB.prepare('SELECT * FROM timesheet_weeks WHERE id = ?').bind(id).first();
  if (!week) return json({ error: 'Week not found' }, 404);

  await env.DB.prepare(`
    UPDATE timesheet_weeks SET
      status = 'approved',
      reviewed_by = ?,
      reviewed_at = datetime('now')
    WHERE id = ?
  `).bind(data.userId, id).run();

  const updated = await env.DB.prepare('SELECT * FROM timesheet_weeks WHERE id = ?').bind(id).first();
  return json({ week: updated });
}
