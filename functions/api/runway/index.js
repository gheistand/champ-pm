import { json, requireAdmin } from '../../_utils.js';

// Grants excluded from runway calculation by name prefix
const EXCLUDED_PREFIXES = ['GRF -', '103 Indirect', '740 Trust'];
function isExcluded(name) {
  return EXCLUDED_PREFIXES.some(p => name.startsWith(p));
}

async function handleGet(context) {
  const { env, data } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const today = new Date().toISOString().split('T')[0];

  // All grants
  const { results: allGrants } = await env.DB.prepare(
    `SELECT g.*, gfr.fa_rate as default_fa_rate
     FROM grants g
     LEFT JOIN grant_fa_rates gfr ON gfr.grant_id = g.id
       AND gfr.effective_date = (SELECT MAX(effective_date) FROM grant_fa_rates WHERE grant_id = g.id)
     WHERE g.status = 'active'
     ORDER BY g.name`
  ).all();

  const grants = allGrants.filter(g => !isExcluded(g.name));

  // Latest balance snapshot per grant
  const { results: latestBalances } = await env.DB.prepare(`
    SELECT gb.*
    FROM grant_balances gb
    INNER JOIN (
      SELECT grant_id, MAX(as_of_date) as max_date
      FROM grant_balances GROUP BY grant_id
    ) lb ON gb.grant_id = lb.grant_id AND gb.as_of_date = lb.max_date
  `).all();

  const balanceMap = {};
  for (const b of latestBalances) balanceMap[b.grant_id] = b;

  // Merge
  const grantsWithBalances = grants.map(g => ({
    ...g,
    current_balance: balanceMap[g.id]?.balance ?? null,
    fa_rate: balanceMap[g.id]?.fa_rate ?? g.default_fa_rate ?? 0.317,
    balance_as_of: balanceMap[g.id]?.as_of_date ?? null,
    balance_notes: balanceMap[g.id]?.notes ?? null,
  }));

  // All active staff with current salary
  const { results: staff } = await env.DB.prepare(`
    SELECT u.id, u.name, u.is_active,
      sr.annual_salary, sr.fringe_rate, sr.appointment_type
    FROM users u
    LEFT JOIN salary_records sr ON sr.user_id = u.id
      AND sr.id = (
        SELECT sr2.id FROM salary_records sr2
        WHERE sr2.user_id = u.id
        ORDER BY sr2.effective_date DESC, sr2.id DESC LIMIT 1
      )
    WHERE u.is_active = 1
    ORDER BY u.name
  `).all();

  // Balance history for chart (all snapshots, summed per date)
  const { results: history } = await env.DB.prepare(`
    SELECT gb.as_of_date,
           SUM(gb.balance) as total_balance,
           COUNT(DISTINCT gb.grant_id) as grant_count
    FROM grant_balances gb
    JOIN grants g ON g.id = gb.grant_id
    GROUP BY gb.as_of_date
    ORDER BY gb.as_of_date ASC
  `).all();

  return json({ grants: grantsWithBalances, staff, history });
}

async function handlePost(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const { entries, as_of_date, notes } = await request.json();
  // entries: [{ grant_id, balance, fa_rate }]
  if (!entries?.length || !as_of_date) {
    return json({ error: 'entries and as_of_date are required' }, 400);
  }

  const stmt = env.DB.prepare(
    `INSERT INTO grant_balances (grant_id, balance, fa_rate, as_of_date, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const inserts = entries.map(e =>
    stmt.bind(e.grant_id, e.balance, e.fa_rate, as_of_date, notes || null, data.userId)
  );

  await env.DB.batch(inserts);
  return json({ success: true, saved: inserts.length });
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  return new Response('Method Not Allowed', { status: 405 });
}
