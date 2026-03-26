import { json, requireAdmin } from '../../../../../_utils.js';

async function handleGet(context) {
  const { env, params } = context;
  const { id } = params;

  const { results } = await env.DB.prepare(`
    SELECT g.id, g.name, g.funder, g.status, cgl.relationship_type
    FROM contact_grant_links cgl
    JOIN grants g ON g.id = cgl.grant_id
    WHERE cgl.contact_id = ?
    ORDER BY g.name
  `).bind(id).all();

  return json({ grants: results });
}

async function handlePost(context) {
  const { env, data, request, params } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { id } = params;
  const body = await request.json();
  const { grant_id, relationship_type } = body;

  if (!grant_id) return json({ error: 'grant_id is required' }, 400);

  try {
    await env.DB.prepare(`
      INSERT INTO contact_grant_links (contact_id, grant_id, relationship_type)
      VALUES (?, ?, ?)
    `).bind(id, grant_id, relationship_type || null).run();
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      return json({ error: 'Contact is already linked to this grant' }, 409);
    }
    throw err;
  }

  return json({ success: true }, 201);
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  return new Response('Method Not Allowed', { status: 405 });
}
