import { json, requireAdmin } from '../../_utils.js';

async function handleGet(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const url = new URL(request.url);
  const project_id = url.searchParams.get('project_id');
  if (!project_id) return json({ error: 'project_id is required' }, 400);

  const { results } = await env.DB.prepare(`
    SELECT ss.*, u.name as created_by_name
    FROM schedule_scenarios ss
    LEFT JOIN users u ON u.id = ss.created_by
    WHERE ss.project_id = ?
    ORDER BY ss.created_at DESC
  `).bind(project_id).all();

  return json({ scenarios: results });
}

async function handlePost(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const { project_id, name, description, notes, created_by, status = 'draft' } = body;

  if (!project_id || !name) {
    return json({ error: 'project_id and name are required' }, 400);
  }

  const result = await env.DB.prepare(`
    INSERT INTO schedule_scenarios (project_id, name, description, notes, created_by, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(project_id, name, description || null, notes || null, created_by || null, status).run();

  const scenario = await env.DB.prepare('SELECT * FROM schedule_scenarios WHERE id = ?')
    .bind(result.meta.last_row_id).first();

  return json({ scenario }, 201);
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

  await env.DB.prepare(`UPDATE schedule_scenarios SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values).run();

  const scenario = await env.DB.prepare('SELECT * FROM schedule_scenarios WHERE id = ?').bind(id).first();
  if (!scenario) return json({ error: 'Scenario not found' }, 404);

  return json({ scenario });
}

async function handleDelete(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return json({ error: 'id is required' }, 400);

  // Cascades to scenario_phase_overrides and scenario_milestone_overrides via FK
  await env.DB.prepare('DELETE FROM schedule_scenarios WHERE id = ?').bind(id).run();
  return json({ success: true });
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  if (context.request.method === 'PUT') return handlePut(context);
  if (context.request.method === 'DELETE') return handleDelete(context);
  return new Response('Method Not Allowed', { status: 405 });
}
