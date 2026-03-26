import { json, requireAdmin } from '../../../_utils.js';

async function handleGet(context) {
  const { env, params } = context;
  const { id } = params;

  const org = await env.DB.prepare('SELECT * FROM organizations WHERE id = ?').bind(id).first();
  if (!org) return json({ error: 'Organization not found' }, 404);

  const { results: contacts } = await env.DB.prepare(`
    SELECT c.*, COUNT(cgl.id) as grant_count
    FROM contacts c
    LEFT JOIN contact_grant_links cgl ON cgl.contact_id = c.id
    WHERE c.org_id = ?
    GROUP BY c.id
    ORDER BY c.last_name, c.first_name
  `).bind(id).all();

  return json({ organization: org, contacts });
}

async function handlePut(context) {
  const { env, data, request, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;
  const body = await request.json();

  const fields = [];
  const values = [];

  for (const field of ['name', 'type', 'website', 'notes']) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (fields.length === 0) return json({ error: 'No fields to update' }, 400);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await env.DB.prepare(`UPDATE organizations SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values).run();

  const org = await env.DB.prepare('SELECT * FROM organizations WHERE id = ?').bind(id).first();
  if (!org) return json({ error: 'Organization not found' }, 404);

  return json({ organization: org });
}

async function handleDelete(context) {
  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;

  const { results: contacts } = await env.DB.prepare(
    'SELECT id FROM contacts WHERE org_id = ?'
  ).bind(id).all();

  if (contacts.length > 0) {
    return json({ error: `Cannot delete: this organization has ${contacts.length} contact(s). Remove or reassign them first.` }, 409);
  }

  await env.DB.prepare('DELETE FROM organizations WHERE id = ?').bind(id).run();
  return json({ success: true });
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'PUT') return handlePut(context);
  if (context.request.method === 'DELETE') return handleDelete(context);
  return new Response('Method Not Allowed', { status: 405 });
}
