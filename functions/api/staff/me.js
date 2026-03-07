import { json } from '../../_utils.js';

export async function onRequestGet(context) {
  const { env, data } = context;

  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(data.userId)
    .first();

  if (!user) {
    return json({ user: { id: data.userId, role: data.role } });
  }

  return json({ user });
}
