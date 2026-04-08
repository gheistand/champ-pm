import { json, requireAdmin } from '../_utils.js';

async function handleGet(context) {
  const { env, data } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { results } = await env.DB.prepare(`
    SELECT sa.*, COUNT(p.id) as project_count
    FROM study_areas sa
    LEFT JOIN projects p ON p.study_area_id = sa.id
    GROUP BY sa.id
    ORDER BY sa.name
  `).all();

  return json({ study_areas: results });
}

async function handlePost(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const { name, description, status = 'in_progress', notes } = body;

  if (!name) return json({ error: 'name is required' }, 400);

  const result = await env.DB.prepare(`
    INSERT INTO study_areas (name, description, status, notes)
    VALUES (?, ?, ?, ?)
  `).bind(name, description || null, status, notes || null).run();

  const study_area = await env.DB.prepare('SELECT * FROM study_areas WHERE id = ?')
    .bind(result.meta.last_row_id).first();

  return json({ study_area }, 201);
}

async function handlePut(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) return json({ error: 'id is required' }, 400);

  const fields = [];
  const values = [];

  const updatable = ['name', 'description', 'status', 'notes'];
  for (const field of updatable) {
    if (updates[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(updates[field]);
    }
  }

  if (fields.length === 0) return json({ error: 'No fields to update' }, 400);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await env.DB.prepare(`UPDATE study_areas SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values).run();

  const study_area = await env.DB.prepare('SELECT * FROM study_areas WHERE id = ?').bind(id).first();
  if (!study_area) return json({ error: 'Study area not found' }, 404);

  return json({ study_area });
}

async function handleDelete(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return json({ error: 'id is required' }, 400);

  const { results: projects } = await env.DB.prepare(
    'SELECT id FROM projects WHERE study_area_id = ?'
  ).bind(id).all();

  if (projects.length > 0) {
    return json({ error: `Cannot delete: ${projects.length} project(s) reference this study area. Reassign them first.` }, 409);
  }

  await env.DB.prepare('DELETE FROM study_areas WHERE id = ?').bind(id).run();
  return json({ success: true });
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  if (context.request.method === 'PUT') return handlePut(context);
  if (context.request.method === 'DELETE') return handleDelete(context);
  return new Response('Method Not Allowed', { status: 405 });
}
