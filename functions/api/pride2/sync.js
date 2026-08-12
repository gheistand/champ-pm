import { json } from '../../_utils.js';

// ─────────────────────────────────────────────────────────────────────────────
// PRIDE 2.0 sync endpoint — SCAFFOLD / DISCOVERY MODE
//
// PRIDE 2.0 (pride2.prairie.illinois.edu) is a Laravel/React SPA with clean
// JSON REST-style endpoints (unlike PRIDE 1.0's server-rendered HTML tables).
// Still session+CSRF gated — no public API keys — so sync still requires an
// authenticated browser + bookmarklet, same trust model as the PRIDE 1.0
// integration in functions/api/pride/sync.js.
//
// Known/expected source endpoints (confirm exact shapes with Glenn's live
// session before finalizing):
//   1. GET /staff-plan/plans?start_date=&end_date=&people=&org_group_id=...
//      → staff plan rows (salary, allocation % by account/category, maybe end dates)
//   2. Salary / change history endpoint — URL not yet confirmed
//   3. Grant balance / commitment burndown endpoint — URL not yet confirmed
//
// CURRENT MODE: "capture" — this endpoint just logs whatever raw JSON the
// bookmarklet POSTs (per source endpoint) into pride2_capture_log so we can
// inspect real field names together, then design the mapping logic
// (UIN/employee-id → CHAMP-PM user_id, salary diffing, end-date sync, grant
// balance updates) the same way sync.js does for PRIDE 1.0.
//
// Once shapes are confirmed:
//   - Replace the capture branch below with real parsing per endpoint
//   - Reuse the UIN_MAP pattern from functions/api/pride/sync.js (or fetch by
//     employee id if PRIDE 2.0 exposes a different stable identifier)
//   - Reuse the append-only salary_records insert + end_date update pattern
//   - Add grant balance sync against staff_plan_grant_balances
//     (keyed on full_account_string — NOT fund_number, see MEMORY.md)
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGIN = 'https://pride2.prairie.illinois.edu';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function onRequest(context) {
  const { env, request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  // Auth via pre-shared token, mirroring PRIDE 1.0 sync.
  // NOTE: PRIDE 1.0's sync.js does a plain string compare here — the
  // 2026-06-12 backend audit flagged that as non-timing-safe. Not fixing it
  // here since this is a discovery scaffold, but carry the fix over to both
  // endpoints together when this goes to production mode.
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/, '').trim();
  const expectedToken = env.PRIDE2_SYNC_TOKEN;

  if (!expectedToken) {
    return json({ error: 'PRIDE2_SYNC_TOKEN is not configured' }, 503);
  }
  if (!token || token !== expectedToken) {
    return json({ error: 'Invalid or missing sync token' }, 401);
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  // ── DISCOVERY / CAPTURE MODE ────────────────────────────────────────────
  // Expected body shape from the pride2-discovery bookmarklet:
  //   { captures: [ { endpoint: 'staff-plan/plans', params: {...}, response: {...} }, ... ] }
  if (Array.isArray(body.captures)) {
    const saved = [];
    for (const cap of body.captures) {
      if (!cap?.endpoint || cap.response === undefined) continue;
      await env.DB.prepare(`
        INSERT INTO pride2_capture_log (endpoint, params, raw_response)
        VALUES (?, ?, ?)
      `).bind(
        cap.endpoint,
        cap.params ? JSON.stringify(cap.params) : null,
        typeof cap.response === 'string' ? cap.response : JSON.stringify(cap.response)
      ).run();
      saved.push(cap.endpoint);
    }
    return new Response(JSON.stringify({ mode: 'capture', saved }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  }

  // ── REAL SYNC MODE (not yet implemented) ────────────────────────────────
  // Once /staff-plan/plans (and any grant-balance / salary-history endpoint)
  // response shapes are confirmed against pride2_capture_log entries, replace
  // this stub with real parsing + the same salary_records / users.end_date /
  // staff_plan_grant_balances sync logic used in functions/api/pride/sync.js.
  if (body.employees || body.staff_plan) {
    return json({
      error: 'PRIDE 2.0 real sync not implemented yet — response shapes not confirmed. ' +
        'Use the discovery bookmarklet (captures[]) to log raw responses first.',
    }, 501);
  }

  return json({ error: 'Unrecognized request body — expected { captures: [...] }' }, 400);
}
