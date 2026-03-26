import { json, requireAdmin } from '../../../_utils.js';

async function handleGet(context) {
  const { env } = context;
  const { results } = await env.DB.prepare(`
    SELECT o.*, COUNT(c.id) as contact_count
    FROM organizations o
    LEFT JOIN contacts c ON c.org_id = o.id
    GROUP BY o.id
    ORDER BY o.name
  `).all();
  return json({ organizations: results });
}

async function handlePost(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const { name, type, website, notes } = body;

  if (!name) return json({ error: 'name is required' }, 400);

  const result = await env.DB.prepare(`
    INSERT INTO organizations (name, type, website, notes)
    VALUES (?, ?, ?, ?)
  `).bind(name, type || null, website || null, notes || null).run();

  const org = await env.DB.prepare('SELECT * FROM organizations WHERE id = ?')
    .bind(result.meta.last_row_id).first();

  return json({ organization: org }, 201);
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  return new Response('Method Not Allowed', { status: 405 });
}
