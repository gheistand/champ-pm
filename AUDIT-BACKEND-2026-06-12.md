# CHAMP-PM Backend API Security & Engineering Audit

**Date:** 2026-06-12
**Scope:** `functions/_middleware.js`, `functions/_utils.js`, all 82 route files under `functions/api/`
**Auditor:** CHAMP-PM audit subagent (Backend/API)
**Live verification:** Performed non-destructive probes against `https://champ-pm.app` (dummy tokens only).

---

## Executive Summary

The backend is in better shape than most small-team apps: **every D1 query that takes user data uses parameterized binds (with one exception)**, dynamic `UPDATE` builders use strict field whitelists, `salary_records` append-only and `fringe_rates` immutability are genuinely enforced in code, and admin gating via `requireAdmin()` is applied consistently across ~75 of 82 routes. The F&A rate is consistently 0.317 everywhere it appears.

The most important issues found: **one SQL injection** (`program-schedule`), an **account-linking weakness in the auth middleware** (email-claim binding can re-bind an existing user's identity to a new Clerk account), a **verified-broken PRIDE sync endpoint** (the global Clerk middleware 401s the shared-token request before the endpoint's own auth runs — fails closed, but the feature cannot work as written), **non-timing-safe token comparison** on that same endpoint, and **unvalidated LLM output applied as optimizer constraints** in the AI goals endpoint.

| Severity | Count |
|---|---|
| Critical | 1 |
| High | 5 |
| Medium | 10 |
| Low | 9 |
| Info | 5 |

---

## CRITICAL

### C1. SQL injection via `grant_status` query parameter
**File:** `functions/api/program-schedule/index.js` (~line 15)

```js
let grantWhere = grantStatus === 'all' ? '' : `WHERE g.status = '${grantStatus}'`;
```

`grant_status` comes straight from `url.searchParams.get('grant_status')` and is interpolated into the SQL string. Every other query in the codebase is parameterized — this is the lone exception. An authenticated admin can inject arbitrary SQL, e.g. `?grant_status=x' UNION SELECT id,email,clerk_id,start_date,end_date,role,name FROM users--`. Because D1 `.all()` executes a single statement, exfiltration via UNION and blind injection are both practical. Admin-only mitigates exposure, but admin JWTs can be phished/leaked, and a deputized XSS in the SPA would inherit this.

**Fix:**
```js
const ALLOWED = ['active', 'closed', 'pending', 'all'];
if (!ALLOWED.includes(grantStatus)) return json({ error: 'invalid grant_status' }, 400);
// or parameterize:
const grantWhere = grantStatus === 'all' ? '' : 'WHERE g.status = ?';
```

---

## HIGH

### H1. Email-claim account linking can re-bind an existing user's identity
**File:** `functions/_middleware.js` (~lines 118–127)

When a Clerk `sub` isn't found in D1, the middleware falls back to matching `payload.email` (case-insensitive) and then **writes that Clerk ID onto the matched user row**:

```js
dbUser = await env.DB.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').bind(email).first();
if (dbUser) {
  await env.DB.prepare('UPDATE users SET clerk_id = ? WHERE id = ?').bind(clerkId, dbUser.id).run();
}
```

Problems:
1. There is no check that the email claim is **verified** by Clerk.
2. There is no check that the row's `clerk_id` is currently NULL — wait, the rebind only happens when lookup-by-clerk_id misses, but a *second* Clerk account with the same email would silently **overwrite the legitimate user's `clerk_id`**, hijacking the D1 identity (timesheets, `tasks/my`, `staff/me`, submit/ownership checks all key off `data.userId`).
3. If the Clerk instance ever permits public sign-up (or a misconfigured social provider that doesn't verify email), an attacker who registers `someadmin@illinois.edu` binds to that D1 row. Role still comes from the token (see H3), so this is identity theft of the *data* identity, not automatic admin — but timesheet forgery and PII reads as that person follow.

**Fix:** Only link when `payload.email_verified === true` (add it to the Clerk JWT template), only link when `clerk_id IS NULL` (`UPDATE users SET clerk_id=? WHERE id=? AND clerk_id IS NULL`), log/alert on link events, and confirm Clerk sign-ups are restricted to invited/allow-listed users.

### H2. PRIDE sync endpoint is unreachable as written — global middleware swallows its auth (verified live)
**Files:** `functions/_middleware.js` (applies to all `/api/*`), `functions/api/pride/sync.js` (~lines 70–95)

The middleware demands a **valid Clerk JWT** on every `/api/*` request. `pride/sync.js` expects `Authorization: Bearer <PRIDE_SYNC_TOKEN>` — a shared secret, not a JWT. Live test confirms:

```
POST /api/pride/sync  (Bearer dummy)  → 401 {"error":"Invalid or expired token","detail":"Invalid JWT format"}
```

That error string comes from the **middleware**, not from sync.js's own `'Invalid or missing sync token'` — meaning the handler's token check, UIN mapping, and salary-insert logic are dead code in production. This fails **closed** (good), but:
- The sync feature cannot work; if salary data appears synced, it is arriving via some other path worth investigating.
- The likely "quick fix" (excluding `/api/pride/` from the middleware) must be done narrowly and deliberately — see H3/H4 before doing so.

**Fix:** Add a narrow carve-out in the middleware (`if (url.pathname === '/api/pride/sync') return next();`) so the endpoint's own token auth governs, and pair it with H4's timing-safe comparison. Do **not** broaden the carve-out beyond the exact path.

### H3. JWT verification gaps in middleware
**File:** `functions/_middleware.js` (~lines 49–86)

The signature verification itself is sound (RS256 via JWKS, exp checked), but:
- **No `iss` (issuer) validation** — any token signed by any key in that JWKS passes; fine today, but cheap to add.
- **No `azp`/`aud` validation** — Clerk recommends checking `azp` against your origin to prevent token reuse from other apps on the same Clerk instance.
- **No `nbf` check.**
- **`header.alg` is never checked.** The key is imported as RSASSA-PKCS1-v1_5 so classic `alg:none`/HS256 confusion doesn't directly work, but if Clerk's JWKS ever contains a non-RSA key matching a `kid`, `importKey` behavior becomes the only guard. Pin `header.alg === 'RS256'`.
- **JWKS rotation outage:** if `kid` isn't found in the cached JWKS, the code throws instead of re-fetching. After a Clerk key rotation, all logins break for up to 1 hour (cache TTL). Standard practice: on kid miss, bust cache and refetch once.
- **Role comes entirely from token claims** (`payload.role || payload.public_metadata?.role || ... || 'staff'`). This is acceptable *only* if Clerk public metadata is admin-managed (default). Note `public_metadata` is user-visible; consider `private_metadata` exposure via a custom claim, and consider cross-checking against `users.role` in D1 (which already exists and is loaded as `data.dbUser`) so a single source of truth governs admin access.

**Fix:** validate `iss` against the Clerk domain derived from the publishable key, pin `alg`, check `azp`, refetch JWKS on kid miss, and prefer `data.dbUser.role` (D1) as the authority for `requireAdmin`.

### H4. PRIDE sync token comparison is not timing-safe; endpoint capabilities if token leaks
**File:** `functions/api/pride/sync.js` (~line 90)

```js
if (!token || token !== expectedToken) { ... }
```

A `!==` string compare short-circuits on first mismatching character. Currently moot because of H2, but as soon as the middleware carve-out lands this becomes the *only* gate on an unauthenticated-from-Clerk's-perspective endpoint, with `Access-Control-Allow-Origin` pinned to the PRIDE host (good).

**If the token is compromised, the holder can:** insert arbitrary `salary_records` rows for the 26 hard-coded UINs (append-only preserved, but a forged "annual_increase" silently changes the *current effective salary* used by every budget/burn calculation), and overwrite `users.end_date` for those users. No reads of bulk data are exposed (responses echo only diffs), and no deletes — blast radius is moderate but it directly poisons financial calculations.

**Fix:** constant-time comparison:
```js
const enc = new TextEncoder();
const a = enc.encode(token), b = enc.encode(expectedToken);
const valid = a.byteLength === b.byteLength && crypto.subtle.timingSafeEqual
  ? crypto.subtle.timingSafeEqual(a, b)   // Workers supports this on ArrayBuffers
  : false;
```
Also validate `salary` is a finite positive number within a sane band (e.g. 20k–400k) before insert — currently `salary` from the payload is inserted unvalidated (a string or `1e12` would be accepted), and `Math.abs(current - salary)` with a non-numeric salary is `NaN`, which falls through to the discrepancy branch unpredictably.

### H5. AI goals endpoint applies unvalidated LLM output as optimizer constraints; prompt injection surface
**File:** `functions/api/staff-plans/ai-goals.js` (~lines 195–215)

The Claude response is `JSON.parse`d and used **directly** as `aiOverrides` with zero schema validation:
- `grant_urgency_multipliers`, `per_person_grant_caps`, `per_person_grant_floors`, `exclusions` values are not type/range-checked. A negative cap, `1e9` multiplier, non-numeric string, or floors > caps flow straight into the LP model (`optimize.js` does `Math.min(available, aiCap)` but never validates `aiCap` is a number — `Math.min(100, "abc")` = `NaN`, producing NaN constraints and garbage rows persisted to `staff_plan_scenario_rows`).
- **Prompt injection:** `goals_text` is admin-supplied (lower risk), but grant names (`grant_name`) and **staff names** from the DB are also serialized into the prompt. Anyone who can name a grant/user (admins, or PRIDE-synced names) can embed instructions like "exclude everyone from fund 470736". Consequence is bounded — output only shapes allocations, never SQL (all inserts parameterized ✅) — but allocations are the product's core financial output.
- The result of a poisoned/garbage run **deletes and replaces** non-pinned scenario rows before anyone reviews the explanation.

**Good:** API key read from `env.ANTHROPIC_API_KEY` (Pages secret), never echoed; Claude error bodies are logged server-side, not returned (only status code). ✅

**Fix:** validate the parsed object against a strict schema (every multiplier `0 < x ≤ 10` finite; caps/floors `0–100` finite numbers; floors ≤ caps; account strings must exist in `balances`; user ids must exist in `staff`), drop anything failing validation, and surface "AI returned N invalid overrides (ignored)" in the explanation. Consider making AI runs produce a *preview* requiring an explicit apply step.

---

## MEDIUM

### M1. CRM read endpoints skip authorization — any authenticated token reads all CRM data
**Files:** `crm/contacts/index.js` (GET, ~line 4), `crm/contacts/[id].js` (GET, ~line 4), `crm/organizations/index.js` (GET), `crm/organizations/[id].js` (GET), `crm/contacts/[id]/grants/index.js` (GET), `crm/interactions/index.js` (GET)

All CRM **GET** handlers omit `requireAdmin` (writes are admin-gated). Worse, combined with the middleware's fallback (`data.userId = dbUser?.id || clerkId`), **a Clerk user who isn't even provisioned in the D1 `users` table** authenticates as role `staff` and can dump every contact, phone number, email, org note, and full interaction history. If CRM-for-all-staff is intended, document it; the unprovisioned-Clerk-user case almost certainly is not.

**Fix:** add `requireAdmin` (or a `requireKnownUser` check: `if (!data.dbUser) return 403`) to CRM GETs; at minimum reject requests where `data.dbUser` is null on every route that isn't `staff/me`.

### M2. Unprovisioned Clerk users can write timesheet data
**Files:** `_middleware.js` (~line 130), `timesheets/index.js` POST, `timesheets/submit.js`

Same root cause as M1: with no D1 row, `data.userId` becomes the Clerk `sub` (`user_2ab...`), and `timesheets/index.js` POST happily inserts `timesheet_entries` rows with that as `user_id` (no FK rejection observed in code path; if FK constraints exist this becomes a 500 instead). Either way, unknown principals should be rejected, not given a synthetic identity.

**Fix:** in middleware, if no `dbUser` resolves, either 403 API requests outright (except a provisioning/onboarding endpoint) or set an explicit `data.unprovisioned = true` that routes must opt into.

### M3. `replace` import deletes all appointments *before* validating the payload
**File:** `staff-plans/appointments/import.js` (~lines 78–84)

```js
if (replace) { await env.DB.prepare('DELETE FROM staff_appointments').run(); }
if (!Array.isArray(rows) || rows.length === 0) { return json({ error: ... }, 400); }
```

A malformed request with `replace: true` and a bad/empty `rows` wipes the table and then errors out — guaranteed data loss with nothing imported. Inserts also run row-by-row (no batch/transaction), so a mid-import failure leaves a half-imported table.

**Fix:** validate first; perform delete + inserts in a single `env.DB.batch([...])` so the operation is atomic.

### M4. Resubmitting a week silently erases approval audit trail
**File:** `timesheets/submit.js` (~lines 25–34)

`ON CONFLICT ... DO UPDATE SET status='submitted', review_notes=NULL, reviewed_by=NULL, reviewed_at=NULL` — a staff member can resubmit an **already-approved** week, flipping it back to `submitted` and destroying who approved it and when. Entries stay locked (lock checks `submitted` too), but for a grant-compliance system, approval records should never be clobberable by the submitter.

**Fix:** reject resubmission when current status is `approved` (require an admin "reopen"/reject first), or preserve prior review fields in history.

### M5. Stack trace leaked to client on optimizer failure
**File:** `staff-plans/scenarios/index.js` (~lines 60 and 140)

`runOptimize`'s catch returns `{ error: String(err), stack: err?.stack }`, and `handlePost` then sends that whole object to the client as `detail: err` in the 201 response. Stack traces reveal internal file paths and library internals. Numerous other routes return raw `err.message` as `detail` (alerts, budget/*, workload, dashboard, import/*) — messages from D1 can reveal schema details (table/column names). The middleware also returns JWT-parsing internals in its 401 `detail`.

**Fix:** log details server-side (`console.error`), return generic messages to clients. Strip `stack` everywhere.

### M6. Date strings are never format-validated, weakening PoP ceiling checks
**Files:** `schedule/phases.js` (~lines 40, 78), `schedule/milestones.js` (~lines 38, 73), `schedule/scenario-overrides.js`, and all date inputs generally

PoP enforcement is done with **lexicographic string comparison** (`end_date > grantEnd`), which is correct *only* for `YYYY-MM-DD`. Nothing validates the format, so a client sending `12/31/2035` or `2035-9-1` bypasses the ceiling (e.g. `'12/31/2035' > '2027-06-30'` is `false` → passes) and stores an unsortable date that corrupts downstream comparisons. Also: `phases.js` checks only `end_date` against PoP — a phase `start_date` after grant end is accepted.

**Fix:** shared validator `/^\d{4}-\d{2}-\d{2}$/` + `!isNaN(Date.parse(s))` on every date input; also check `start_date <= end_date <= grantEnd`.

### M7. Numeric inputs not coerced/range-checked across write endpoints
**Files:** broad — `timesheets/index.js` (hours: type-checked as number ✅ but no range: `-50` or `9999` accepted), `grants/index.js`/`[id].js` (`total_budget` can be any JSON type), `classifications` (band values), `assignments` (`allocated_hours`), `runway/index.js` POST (`balance`, `fa_rate` unvalidated), `equity/snapshot.js` (stores client-computed analysis numbers wholesale), `salary-adjustments` (`proposed_salary` unvalidated, then becomes a real salary record on apply), `interactions/index.js` (`limit` → `parseInt` can yield `NaN` → D1 bind error 500; no upper bound)

SQLite's dynamic typing means a string lands in a REAL column silently and later arithmetic (`salary / 2080`) yields `NaN` that propagates into budget rollups.

**Fix:** small shared helpers (`num(v, {min, max})`, `dateStr(v)`) used at every write boundary; cap `limit` params (`Math.min(parseInt(x)||100, 500)`).

### M8. CSV formula injection + broken quoting in timesheet report export
**File:** `reports/timesheet.js` (~lines 150–165)

CSV cells are built as `"${r.grant_name}"` with no escaping: a name containing `"` breaks the row, and a name beginning with `=`, `+`, `-`, or `@` executes as a formula when opened in Excel (classic CSV injection — names are admin-entered today, but PRIDE/import flows feed names too). The CSV response also sets `Access-Control-Allow-Origin: *` while the rest of the API correctly returns no CORS headers.

**Fix:** escape `"` → `""`, prefix `'` to cells starting with `=+-@`, drop the wildcard CORS header.

### M9. Middleware CORS preflight is wide open relative to actual policy
**File:** `_middleware.js` (~lines 95–104)

`OPTIONS` returns `Access-Control-Allow-Origin: *` with `Authorization` allowed, telling browsers any origin may send authenticated requests; actual responses (except the CSV above) carry no ACAO header, so reads fail — the net effect is mostly harmless inconsistency, but it permits cross-origin *writes whose responses are unreadable* if a token leaks into a third-party page, and it advertises a more permissive policy than intended.

**Fix:** reflect only `https://champ-pm.app` (and the PRIDE origin solely on `/api/pride/sync`).

### M10. University UINs and full employee names hard-coded in source
**Files:** `pride/sync.js` (~lines 4–31, `UIN_MAP`), `staff-plans/appointments/import.js` (~lines 4–35, `STAFF_MAP`)

26 university ID numbers tied to named individuals live in the repo. UINs are quasi-sensitive identifiers (used for identity verification at the university); the repo also outlives staff. Maintenance burden too — every hire/departure needs a code deploy.

**Fix:** move both maps into D1 tables (`users.uin` column / `staff_name_aliases`), admin-editable.

---

## LOW

### L1. `staff-plans/balances/[id].js` sync delegation is dead code
(~line 38) `const { default: syncHandler } = await import('./sync.js')` — `sync.js` has **no default export** (it exports `onRequest`), so `syncHandler` is `undefined` and the route returns 404. Harmless because `balances/sync.js` handles the real path, but the `id === 'priority'` / `id === 'sync'` shims in `[id].js` duplicate logic (priority logic exists in *both* `[id].js` and `priority.js` — they can drift). Pick one routing strategy and delete the shims.

### L2. `DELETE /api/staff-plans/appointments` truncates the whole table with zero friction
(~line 9) Admin-only, but a single stray DELETE request irreversibly clears all appointments (no soft-delete, no count returned, no confirmation token). Consider requiring `?confirm=true` or returning a backup count, and/or writing an audit log row.

### L3. Missing `try/catch` on JSON body parsing and write paths
Most POST/PUT handlers call `await request.json()` bare — malformed JSON throws and surfaces as a generic CF 1101/500. Routes with no try/catch at all include: `assignments/[id].js`, `classifications/*`, `crm/*` writes, `equity/snapshot.js`, `fringe-rates/*`, `grants/*`, `projects/*`, `salary*`, `schedule/*`, `staff-plans/*` (most), `staff/*`, `tasks/*`, `timesheets/*`. Not exploitable, but noisy and inconsistent with the budget routes which do this well. A tiny `safeJson(request)` helper + top-level wrapper would normalize this.

### L4. N+1 / sequential query patterns
- `staff-plans/scenarios/index.js`, `recalculate.js`, `ai-goals.js`: per-staff funds query in a loop, plus **per-row INSERTs** for scenario rows (can be hundreds of sequential D1 round-trips; use `env.DB.batch`).
- `budget/staff/[user_id].js` (~line 80): per-grant F&A lookups in a loop.
- `budget/projections.js`: per-grant FA + entries queries in a loop.
- `pride/sync.js`: 2–4 queries per employee sequentially.
- `staff-plans/balances/priority.js` & `index.js` auto-sync: SELECT+UPDATE per item (use UPSERT in a batch).
- `import/batch.js` weeks loop: row-at-a-time (entries are correctly batched ✅).
Small org keeps this tolerable, but D1 latency per round-trip makes recalculate/AI-goals noticeably slow as data grows.

### L5. No pagination on list endpoints
`grants`, `staff`, `tasks`, `contacts`, `interactions` (default limit 100 ✅), `salary-adjustments`, `timesheets/weeks` (admin variant returns *all* weeks ever), `appointments`, `scenarios`. Fine at current scale (~30 staff); flag for `timesheet_entries`-joined aggregations which grow unboundedly.

### L6. No application-level rate limiting
No route implements rate limiting; protection is whatever Cloudflare zone settings provide. The expensive endpoints (`alerts`, `budget/program`, `ai-goals` — which spends Anthropic tokens per call) would benefit from a per-user limiter (Workers Rate Limiting binding or KV counter), especially `ai-goals`.

### L7. `equity/snapshot.js` stores client-supplied computed metrics
The snapshot trusts `items[]` (salaries, gaps, ratios) from the request body rather than recomputing server-side from `equity/current` logic. An admin could persist a falsified equity record. Recompute server-side; accept only `notes`.

### L8. `runway` default F&A fallback embeds policy in code
`balanceMap[g.id]?.fa_rate ?? g.default_fa_rate ?? 0.317` — correct value (0.317 ✓) but the literal appears in 4 files plus `optimize.js`'s `FRINGE = 0.451`. `salary-adjustments/[id]/apply.js` and `pride/sync.js` also default fringe to 0.451 in code. If the negotiated rates change, five files must change in lockstep; the fringe_rates/grant_fa_rates tables already exist as the source of truth. Centralize.

### L9. `assignments/index.js` & `workload.js` `hours_remaining` join fan-out
`LEFT JOIN timesheet_entries te ON te.task_id = a.task_id AND te.user_id = a.user_id` with `GROUP BY a.id` is correct, but `hours_logged` counts *all-time* entries vs. assignment windows (start/end dates exist on assignments but aren't applied). Functional correctness note rather than security.

---

## INFO

### I1. `tasks/my.js`, `timesheets/submit.js`, `staff/me.js` are correctly self-scoped
These three non-admin routes bind everything to `data.userId` from the verified JWT — staff cannot read or submit for others (admin override in `timesheets/index.js` POST is explicit and intentional). Ownership check in `timesheets/[id].js` DELETE (`entry.user_id !== data.userId` + week-lock check) is the right pattern.

### I2. Salary read paths are admin-only — verified
Every route exposing `annual_salary`/salary history (`salary/*`, `budget/*`, `equity/*`, `promotions/*`, `runway`, `reports/timesheet`, `alerts`, `staff-plans/*`) calls `requireAdmin`. Staff A cannot read staff B's salary. ✅

### I3. `salary_records` append-only — verified by grep
No `UPDATE salary_records` or `DELETE FROM salary_records` exists anywhere in `functions/`. All changes flow through INSERTs (`salary/index.js`, `salary-adjustments/[id]/apply.js`, `pride/sync.js`). ✅

### I4. `fringe_rates` immutability — verified
Only write paths: INSERT of new dated rates (`fringe-rates/index.js` POST) and `UPDATE fringe_rates SET notes = ?` (`[id].js`, notes only, with an explicit comment about audit integrity). No DELETE. ✅

### I5. Grant PoP ceiling enforcement present on schedule endpoints
`schedule/phases.js`, `schedule/milestones.js`, and `schedule/scenario-overrides.js` all fetch the grant `end_date` and reject dates beyond PoP (subject to M6's format caveat). Milestone PoP-anchor uniqueness is enforced. ✅

---

## Things Done Well

1. **Parameterized SQL everywhere but one spot.** 200+ queries reviewed; all use `.bind()` placeholders except the single `program-schedule` interpolation (C1). Dynamic UPDATE builders interpolate only **whitelisted column names**, never values — a correct and consistent pattern.
2. **Real JWT signature verification.** The middleware verifies RS256 signatures against Clerk's JWKS with WebCrypto — it does not merely decode the token. Expiry is checked. JWKS is cached sensibly.
3. **Domain invariants enforced in code, not convention.** Salary append-only, fringe-rate immutability (notes-only PUT with explanatory comment), PoP ceilings on schedule writes, one-PoP-anchor-per-project, referential guards before deletes (grants→projects, projects→tasks, tasks→entries, orgs→contacts, study-areas→projects) all return clean 409s.
4. **Consistent admin gating.** `requireAdmin()` is applied uniformly across financial, HR, CRM-write, and planning routes; the three exceptions (`tasks/my`, `timesheets/submit`, `staff/me`) are correctly self-scoped by design.
5. **Timesheet week locking.** Submitted/approved weeks block staff edits and deletes on both POST and DELETE paths, with explicit admin override.
6. **Thoughtful performance work already done.** Several budget endpoints carry comments like "replaces per-month N+1" and use single batched queries with JS-side aggregation; `import/batch.js` chunks into D1 batches respecting the ~100-statement limit; `program-schedule` deliberately avoids D1's 100-param bind limit.
7. **Secrets discipline.** `wrangler.toml` contains only the publishable key; `CLERK_SECRET_KEY`, `ANTHROPIC_API_KEY`, `PRIDE_SYNC_TOKEN` are Pages secrets read from `env` and never echoed in responses.
8. **AI endpoint degrades gracefully.** Claude failures return 502 without leaking the upstream error body; unparseable AI JSON falls back to standard optimization with a user-facing note; pinned/overridden rows are preserved across recalculation.
9. **PRIDE sync designed conservatively.** Append-only salary inserts, "PRIDE lower than CHAMP-PM" flagged for human review instead of auto-applied, CORS pinned to the PRIDE origin, unknown UINs reported not guessed.
10. **F&A rate 0.317 is correct and consistent** at every occurrence (`runway` fallback, `optimize.js`, `rows/[rowId].js`).

---

## Priority Remediation Order

1. **C1** — patch the `grant_status` injection (5-minute fix, do it today).
2. **H1** — require verified email + never overwrite an existing `clerk_id`; confirm Clerk sign-up restrictions.
3. **H2 + H4** — decide PRIDE sync's fate: add the narrow middleware carve-out **with** timing-safe comparison and payload validation, or delete the dead endpoint.
4. **H5** — schema-validate AI overrides before they touch the optimizer/DB.
5. **M1/M2** — reject unprovisioned Clerk users in middleware; admin-gate (or knowingly document) CRM reads.
6. **M3, M4, M5** — import-wipe ordering, approval-audit preservation, stack-trace leak.
7. Sweep: shared date/number validators (M6/M7), CSV escaping (M8), error-detail scrubbing, batch inserts in scenario writes (L4).
