export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function requireAdmin(data) {
  if (data.role !== 'admin') {
    return json({ error: 'Forbidden' }, 403);
  }
  return null;
}
