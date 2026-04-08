import { json, requireAdmin } from '../../../_utils.js';

const VALID_PROJECT_TYPES = ['data_development', 'mapping', 'custom'];

async function handlePut(context) {
  const { env, data, request, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;
  const body = await request.json();
  const { project_type, study_area_id } = body;

  if (project_type !== undefined && !VALID_PROJECT_TYPES.includes(project_type)) {
    return json({ error: `project_type must be one of: ${VALID_PROJECT_TYPES.join(', ')}` }, 400);
  }

  const project = await env.DB.prepare(`
    SELECT p.*, g.end_date as grant_end_date
    FROM projects p
    JOIN grants g ON g.id = p.grant_id
    WHERE p.id = ?
  `).bind(id).first();

  if (!project) return json({ error: 'Project not found' }, 404);

  const fields = [];
  const values = [];

  if (project_type !== undefined) {
    fields.push('project_type = ?');
    values.push(project_type);
  }
  if (study_area_id !== undefined) {
    fields.push('study_area_id = ?');
    values.push(study_area_id || null);
  }

  if (fields.length === 0) return json({ error: 'No fields to update' }, 400);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await env.DB.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values).run();

  const updated = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
  return json({ project: updated });
}

export async function onRequest(context) {
  if (context.request.method === 'PUT') return handlePut(context);
  return new Response('Method Not Allowed', { status: 405 });
}
