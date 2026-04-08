import { json, requireAdmin } from '../../_utils.js';

async function getGrantEndDate(env, project_id) {
  const row = await env.DB.prepare(`
    SELECT g.end_date FROM projects p JOIN grants g ON g.id = p.grant_id WHERE p.id = ?
  `).bind(project_id).first();
  return row ? row.end_date : null;
}

async function handleGet(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const url = new URL(request.url);
  const project_id = url.searchParams.get('project_id');
  if (!project_id) return json({ error: 'project_id is required' }, 400);

  const { results } = await env.DB.prepare(`
    SELECT * FROM schedule_phases WHERE project_id = ? ORDER BY display_order, id
  `).bind(project_id).all();

  return json({ phases: results });
}

async function handlePost(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const { project_id, label, start_date, end_date, duration_days, display_order = 0, notes } = body;

  if (!project_id || !label || !start_date || !end_date) {
    return json({ error: 'project_id, label, start_date, and end_date are required' }, 400);
  }

  const grantEnd = await getGrantEndDate(env, project_id);
  if (grantEnd && end_date > grantEnd) {
    return json({ error: `Phase end date (${end_date}) exceeds the Grant Period of Performance (${grantEnd}).` }, 400);
  }

  const result = await env.DB.prepare(`
    INSERT INTO schedule_phases (project_id, label, start_date, end_date, duration_days, display_order, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(project_id, label, start_date, end_date, duration_days || null, display_order, notes || null).run();

  const phase = await env.DB.prepare('SELECT * FROM schedule_phases WHERE id = ?')
    .bind(result.meta.last_row_id).first();

  return json({ phase }, 201);
}

async function handlePut(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return json({ error: 'id is required' }, 400);

  // Get current phase to check project_id for PoP
  const current = await env.DB.prepare('SELECT * FROM schedule_phases WHERE id = ?').bind(id).first();
  if (!current) return json({ error: 'Phase not found' }, 404);

  const end_date = updates.end_date ?? current.end_date;
  const grantEnd = await getGrantEndDate(env, current.project_id);
  if (grantEnd && end_date > grantEnd) {
    return json({ error: `Phase end date (${end_date}) exceeds the Grant Period of Performance (${grantEnd}).` }, 400);
  }

  const fields = [];
  const values = [];

  const updatable = ['label', 'start_date', 'end_date', 'duration_days', 'display_order', 'notes'];
  for (const field of updatable) {
    if (updates[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(updates[field]);
    }
  }

  if (fields.length === 0) return json({ error: 'No fields to update' }, 400);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await env.DB.prepare(`UPDATE schedule_phases SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values).run();

  const phase = await env.DB.prepare('SELECT * FROM schedule_phases WHERE id = ?').bind(id).first();
  return json({ phase });
}

async function handleDelete(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return json({ error: 'id is required' }, 400);

  await env.DB.prepare('DELETE FROM schedule_phases WHERE id = ?').bind(id).run();
  return json({ success: true });
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  if (context.request.method === 'PUT') return handlePut(context);
  if (context.request.method === 'DELETE') return handleDelete(context);
  return new Response('Method Not Allowed', { status: 405 });
}
