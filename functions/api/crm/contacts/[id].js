import { json, requireAdmin } from '../../../_utils.js';

async function handleGet(context) {
  const { env, params } = context;
  const { id } = params;

  const contact = await env.DB.prepare(`
    SELECT c.*, o.name as org_name, o.type as org_type, o.website as org_website
    FROM contacts c
    LEFT JOIN organizations o ON o.id = c.org_id
    WHERE c.id = ?
  `).bind(id).first();

  if (!contact) return json({ error: 'Contact not found' }, 404);

  const { results: grants } = await env.DB.prepare(`
    SELECT g.id, g.name, g.funder, g.status, cgl.relationship_type
    FROM contact_grant_links cgl
    JOIN grants g ON g.id = cgl.grant_id
    WHERE cgl.contact_id = ?
    ORDER BY g.name
  `).bind(id).all();

  const { results: interactions } = await env.DB.prepare(`
    SELECT i.*, g.name as grant_name
    FROM interactions i
    LEFT JOIN grants g ON g.id = i.grant_id
    WHERE i.contact_id = ?
    ORDER BY i.interaction_date DESC
    LIMIT 50
  `).bind(id).all();

  return json({ contact, grants, interactions });
}

async function handlePut(context) {
  const { env, data, request, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;
  const body = await request.json();

  const fields = [];
  const values = [];

  for (const field of ['org_id', 'first_name', 'last_name', 'email', 'phone', 'role', 'notes']) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (fields.length === 0) return json({ error: 'No fields to update' }, 400);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await env.DB.prepare(`UPDATE contacts SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values).run();

  const contact = await env.DB.prepare('SELECT * FROM contacts WHERE id = ?').bind(id).first();
  if (!contact) return json({ error: 'Contact not found' }, 404);

  return json({ contact });
}

async function handleDelete(context) {
  const { env, data, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;
  await env.DB.prepare('DELETE FROM contacts WHERE id = ?').bind(id).run();
  return json({ success: true });
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'PUT') return handlePut(context);
  if (context.request.method === 'DELETE') return handleDelete(context);
  return new Response('Method Not Allowed', { status: 405 });
}
