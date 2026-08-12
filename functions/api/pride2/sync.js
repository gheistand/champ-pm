import { json } from '../../_utils.js';

// UIN → CHAMP-PM user_id map, shared with PRIDE 1.0's sync.js.
// PRIDE 2.0's /staff-plan/plans response includes `uin` directly on every
// person record, so this map plugs in unchanged. Kept as a separate literal
// (not imported from ../pride/sync.js) so each endpoint stays independently
// deployable/rollback-able, matching the existing PRIDE 1.0 file's style.
const UIN_MAP = {
  '656625028': 'carnold3',
  '678026881': 'arpitab2',
  '651471355': 'gbuckley',
  '656782942': 'byard',
  '651194553': 'bchaille',
  '658082067': 'mlfuller',
  '677369379': 'fghiami',
  '656335506': 'hanstad',
  '671373662': 'heistand',
  '664080818': 'nazmul',
  '651893236': 'mrjeffer',
  '667694639': 'asjobe',
  '656840055': 'tannerj',
  '660559576': 'marnilaw',
  '660875246': 'clebeda',
  '676728334': 'makdah2',
  '656414988': 'bmcvay',
  '674585367': 'rmeekma',
  '654853452': 'smilton',
  '674360335': 'spantha',
  '654781180': 'spaudel',
  '658397873': 'powell',
  '664194340': 'sangwan2',
  '665996363': 'astillwell',
  '665286055': 'abthomas',
  '656003841': 'zaloudek',
  // Confirmed present + active in D1 as of the 2026-08-11 PRIDE 2.0 capture,
  // but not yet in the PRIDE 1.0 map — add there too if PRIDE 1.0 sync is
  // still in use for this person.
  '655940198': 'jbyard',
};

// PRIDE 2.0's nonr_date (non-renewal date) shape is unconfirmed — every
// person in the 2026-08-11 capture had it null. Accept a few plausible
// formats defensively; anything unrecognized is skipped (logged, not
// thrown) rather than risk writing a bad users.end_date.
function parseNonrDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // already ISO
  // "Feb 25, 2027" (PRIDE 1.0 style, in case PRIDE 2.0 matches it)
  const months = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 };
  let m = s.match(/^(\w{3})\w*\s+(\d+),?\s+(\d{4})$/);
  if (m) {
    const [, mon, day, year] = m;
    if (months[mon]) return `${year}-${String(months[mon]).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }
  // M/D/YYYY
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, mo, day, year] = m;
    return `${year}-${mo.padStart(2,'0')}-${day.padStart(2,'0')}`;
  }
  return null; // unrecognized format — caller should log + skip, not guess
}

// Real sync logic for the confirmed /staff-plan/plans person-record shape.
// Mirrors functions/api/pride/sync.js's salary + end-date rules exactly:
//   - salary_records is append-only — INSERT new record, never UPDATE
//   - PRIDE higher than CHAMP-PM → auto-insert; PRIDE lower → flag for review
// Deliberately does NOT touch staff_appointments / allocations yet:
//   1. staff_appointments.period_start/period_end currently has a confirmed
//      data bug (years off by 2000, e.g. "0025-10-01") from the import.js
//      normalizer — needs a fix + Glenn's sign-off before more code writes
//      into that table.
//   2. Grant-balance / commitment endpoint on PRIDE 2.0 still unconfirmed.
// Wire up allocation sync (from each person's `cfopas`/`plans[].cfopas`,
// which already carry `account_number` in exact full_account_string format)
// once both of those are resolved.
async function syncPeople(env, people, dryRun = false) {
  const today = new Date().toISOString().slice(0, 10);
  const results = {
    dry_run: dryRun,
    salary_updates: [],
    salary_matches: [],
    salary_discrepancies: [],
    end_date_updates: [],
    unknown_uins: [],
    skipped: [],
    runway_flags: [], // days_until_underfunded < 90, informational only — not written anywhere yet
  };

  for (const person of people) {
    const { uin, first_name, last_name, salary, nonr_date, days_until_underfunded } = person;
    const name = [first_name, last_name].filter(Boolean).join(' ');
    const userId = UIN_MAP[uin];

    if (!userId) {
      results.unknown_uins.push({ uin, name });
      continue;
    }

    if (typeof days_until_underfunded === 'number' && days_until_underfunded <= 90) {
      results.runway_flags.push({ user_id: userId, name, days_until_underfunded });
    }

    // ── Salary sync ───────────────────────────────────────────────────
    if (typeof salary === 'number') {
      const currentSalary = await env.DB.prepare(`
        SELECT annual_salary, effective_date
        FROM salary_records
        WHERE user_id = ?
        ORDER BY effective_date DESC
        LIMIT 1
      `).bind(userId).first();

      if (!currentSalary) {
        results.skipped.push({ user_id: userId, name, reason: 'no existing salary records' });
      } else if (Math.abs(currentSalary.annual_salary - salary) <= 1) {
        results.salary_matches.push({ user_id: userId, name, salary });
      } else {
        const diff = salary - currentSalary.annual_salary;
        const pride_higher = diff > 0;

        if (!pride_higher) {
          results.salary_discrepancies.push({
            user_id: userId,
            name,
            champ_pm_salary: currentSalary.annual_salary,
            pride2_salary: salary,
            diff,
            note: 'CHAMP-PM is higher than PRIDE 2.0 — review before updating',
          });
        } else {
          if (!dryRun) {
            await env.DB.prepare(`
              INSERT INTO salary_records
                (user_id, annual_salary, fringe_rate, appointment_type, effective_date, change_type, notes, created_by)
              VALUES (?, ?, 0.451, 'surs', ?, 'annual_increase', ?, 'pride2-sync')
            `).bind(
              userId,
              salary,
              today,
              `Synced from PRIDE 2.0 staff-plan/plans on ${today}. Previous: $${currentSalary.annual_salary.toLocaleString()}`
            ).run();
          }

          results.salary_updates.push({
            user_id: userId,
            name,
            old_salary: currentSalary.annual_salary,
            new_salary: salary,
            diff,
            would_write: dryRun || undefined,
          });
        }
      }
    }

    // ── End date (nonr_date) sync ──────────────────────────────────
    if (nonr_date) {
      const isoDate = parseNonrDate(nonr_date);
      if (isoDate) {
        const user = await env.DB.prepare('SELECT end_date FROM users WHERE id=?').bind(userId).first();
        if (user && user.end_date !== isoDate) {
          if (!dryRun) {
            await env.DB.prepare('UPDATE users SET end_date=? WHERE id=?').bind(isoDate, userId).run();
          }
          results.end_date_updates.push({ user_id: userId, name, end_date: isoDate, would_write: dryRun || undefined });
        }
      } else {
        results.skipped.push({ user_id: userId, name, reason: `unrecognized nonr_date format: "${nonr_date}"` });
      }
    }
  }

  return results;
}

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

  // ── REAL SYNC MODE ───────────────────────────────────────────────────────
  // Body shape: { mode: 'sync', people: [ ...raw /staff-plan/plans array... ] }
  // Explicit mode:'sync' required (not just presence of `people`) so this
  // never fires by accident from a stray/legacy request shape.
  // Handles salary + nonr_date (end date) sync only. Does NOT touch
  // staff_appointments/allocations — see syncPeople() comment for why
  // (staff_appointments has a confirmed period_start/period_end date bug,
  // years off by 2000, e.g. "0025-10-01" — needs a fix + Glenn's sign-off
  // first) — and grant-balance sync is still unconfirmed/unbuilt.
  if (body.mode === 'sync' && Array.isArray(body.people)) {
    // dryRun defaults to true — callers must explicitly pass dryRun:false to
    // actually write. Safer default for a scaffold endpoint no one has run
    // in write mode yet.
    const dryRun = body.dryRun !== false;
    const results = await syncPeople(env, body.people, dryRun);
    return new Response(JSON.stringify({ mode: 'sync', ...results }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  }

  return json({ error: 'Unrecognized request body — expected { captures: [...] } or { mode: "sync", people: [...] }' }, 400);
}
