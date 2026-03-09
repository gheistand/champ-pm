import { json } from '../../_utils.js';

export async function onRequestGet(context) {
  const { data } = context;
  // data.dbUser is already loaded by middleware — no extra DB query needed
  const user = data.dbUser;
  if (!user) {
    return json({ user: { id: data.userId, role: data.role } });
  }
  return json({ user });
}

export async function onRequestPost(context) {
  // Mark user as onboarded
  const { env, data } = context;
  if (!data.userId || !data.dbUser) return json({ error: 'User not found' }, 404);
  await env.DB.prepare(
    "UPDATE users SET onboarded_at = datetime('now') WHERE id = ?"
  ).bind(data.userId).run();
  return json({ ok: true });
}
