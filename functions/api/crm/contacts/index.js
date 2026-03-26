import { json, requireAdmin } from '../../../_utils.js';

async function handleGet(context) {
  const { env } = context;
  const { results } = await env.DB.prepare(`
    SELECT c.*,
      o.name as org_name,
      COUNT(DISTINCT cgl.id) as grant_count,
      MAX(i.interaction_date) as last_interaction_date
    FROM contacts c
    LEFT JOIN organizations o ON o.id = c.org_id
    LEFT JOIN contact_grant_links cgl ON cgl.contact_id = c.id
    LEFT JOIN interactions i ON i.contact_id = c.id
    GROUP BY c.id
    ORDER BY c.last_name, c.first_name
  `).all();
  return json({ contacts: results });
}

async function handlePost(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const { org_id, first_name, last_name, email, phone, role, notes } = body;

  if (!first_name || !last_name) {
    return json({ error: 'first_name and last_name are required' }, 400);
  }

  const result = await env.DB.prepare(`
    INSERT INTO contacts (org_id, first_name, last_name, email, phone, role, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    org_id || null, first_name, last_name,
    email || null, phone || null, role || null, notes || null
  ).run();

  const contact = await env.DB.prepare('SELECT * FROM contacts WHERE id = ?')
    .bind(result.meta.last_row_id).first();

  return json({ contact }, 201);
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  return new Response('Method Not Allowed', { status: 405 });
}
