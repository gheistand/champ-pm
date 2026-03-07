import { json, requireAdmin } from '../../_utils.js';

async function handleGet(context) {
  const { env, data } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { results } = await env.DB.prepare(`
    SELECT u.*,
      COUNT(DISTINCT a.task_id) as assignment_count,
      COALESCE(SUM(a.allocated_hours), 0) as total_allocated_hours
    FROM users u
    LEFT JOIN assignments a ON a.user_id = u.id
    WHERE u.is_active = 1
    GROUP BY u.id
    ORDER BY u.name
  `).all();

  return json({ staff: results });
}

async function handlePost(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const {
    id, email, name,
    role = 'staff', title, classification,
    department = 'CHAMP', start_date,
  } = body;

  if (!id || !email || !name) {
    return json({ error: 'id, email, and name are required' }, 400);
  }

  await env.DB.prepare(`
    INSERT INTO users (id, email, name, role, title, classification, department, start_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      name = excluded.name,
      role = excluded.role,
      title = excluded.title,
      classification = excluded.classification,
      department = excluded.department,
      start_date = excluded.start_date,
      updated_at = datetime('now')
  `).bind(id, email, name, role, title || null, classification || null, department, start_date || null).run();

  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  return json({ user }, 201);
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  return new Response('Method Not Allowed', { status: 405 });
}
