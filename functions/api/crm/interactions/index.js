import { json, requireAdmin } from '../../../_utils.js';

async function handleGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const contact_id = url.searchParams.get('contact_id');
  const grant_id = url.searchParams.get('grant_id');
  const limit = parseInt(url.searchParams.get('limit') || '100', 10);

  const conditions = [];
  const values = [];

  if (contact_id) {
    conditions.push('i.contact_id = ?');
    values.push(contact_id);
  }
  if (grant_id) {
    conditions.push('i.grant_id = ?');
    values.push(grant_id);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  values.push(limit);

  const { results } = await env.DB.prepare(`
    SELECT i.*,
      c.first_name || ' ' || c.last_name as contact_name,
      g.name as grant_name
    FROM interactions i
    JOIN contacts c ON c.id = i.contact_id
    LEFT JOIN grants g ON g.id = i.grant_id
    ${where}
    ORDER BY i.interaction_date DESC
    LIMIT ?
  `).bind(...values).all();

  return json({ interactions: results });
}

async function handlePost(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const { contact_id, grant_id, type, interaction_date, notes, next_action, next_action_due } = body;

  if (!contact_id || !type || !interaction_date) {
    return json({ error: 'contact_id, type, and interaction_date are required' }, 400);
  }

  const userId = data.dbUser?.email?.split('@')[0] || data.dbUser?.name || data.userId;

  const result = await env.DB.prepare(`
    INSERT INTO interactions (contact_id, grant_id, user_id, type, interaction_date, notes, next_action, next_action_due)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    contact_id, grant_id || null, userId, type, interaction_date,
    notes || null, next_action || null, next_action_due || null
  ).run();

  const interaction = await env.DB.prepare('SELECT * FROM interactions WHERE id = ?')
    .bind(result.meta.last_row_id).first();

  return json({ interaction }, 201);
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  return new Response('Method Not Allowed', { status: 405 });
}
