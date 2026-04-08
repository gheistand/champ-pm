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
    SELECT * FROM schedule_milestones WHERE project_id = ? ORDER BY display_order, target_date
  `).bind(project_id).all();

  return json({ milestones: results });
}

async function handlePost(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const { project_id, label, target_date, is_pop_anchor = 0, is_key_decision = 0, display_order = 0, notes } = body;

  if (!project_id || !label || !target_date) {
    return json({ error: 'project_id, label, and target_date are required' }, 400);
  }

  const grantEnd = await getGrantEndDate(env, project_id);
  if (grantEnd && target_date > grantEnd) {
    return json({ error: `Milestone target date (${target_date}) exceeds the Grant Period of Performance (${grantEnd}).` }, 400);
  }

  // Enforce one PoP anchor per project
  if (Number(is_pop_anchor) === 1) {
    await env.DB.prepare(`UPDATE schedule_milestones SET is_pop_anchor = 0 WHERE project_id = ?`)
      .bind(project_id).run();
  }

  const result = await env.DB.prepare(`
    INSERT INTO schedule_milestones (project_id, label, target_date, is_pop_anchor, is_key_decision, display_order, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(project_id, label, target_date, Number(is_pop_anchor), Number(is_key_decision), display_order, notes || null).run();

  const milestone = await env.DB.prepare('SELECT * FROM schedule_milestones WHERE id = ?')
    .bind(result.meta.last_row_id).first();

  return json({ milestone }, 201);
}

async function handlePut(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return json({ error: 'id is required' }, 400);

  const current = await env.DB.prepare('SELECT * FROM schedule_milestones WHERE id = ?').bind(id).first();
  if (!current) return json({ error: 'Milestone not found' }, 404);

  const target_date = updates.target_date ?? current.target_date;
  const grantEnd = await getGrantEndDate(env, current.project_id);
  if (grantEnd && target_date > grantEnd) {
    return json({ error: `Milestone target date (${target_date}) exceeds the Grant Period of Performance (${grantEnd}).` }, 400);
  }

  // Enforce one PoP anchor per project atomically
  if (updates.is_pop_anchor !== undefined && Number(updates.is_pop_anchor) === 1) {
    await env.DB.prepare(`UPDATE schedule_milestones SET is_pop_anchor = 0 WHERE project_id = ? AND id != ?`)
      .bind(current.project_id, id).run();
  }

  const fields = [];
  const values = [];

  const updatable = ['label', 'target_date', 'is_pop_anchor', 'is_key_decision', 'display_order', 'notes'];
  for (const field of updatable) {
    if (updates[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(updates[field]);
    }
  }

  if (fields.length === 0) return json({ error: 'No fields to update' }, 400);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await env.DB.prepare(`UPDATE schedule_milestones SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values).run();

  const milestone = await env.DB.prepare('SELECT * FROM schedule_milestones WHERE id = ?').bind(id).first();
  return json({ milestone });
}

async function handleDelete(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return json({ error: 'id is required' }, 400);

  await env.DB.prepare('DELETE FROM schedule_milestones WHERE id = ?').bind(id).run();
  return json({ success: true });
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  if (context.request.method === 'PUT') return handlePut(context);
  if (context.request.method === 'DELETE') return handleDelete(context);
  return new Response('Method Not Allowed', { status: 405 });
}
