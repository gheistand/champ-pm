# CHAMP-PM Infrastructure / Config / Schema Audit

**Date:** 2026-06-12
**Auditor:** CHAMP-PM audit subagent (Infra/Config/Migrations scope)
**Scope:** `wrangler.toml`, `package.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `.env`, `index.html`, `public/` bookmarklet files, migrations `0001`–`0024` (excl. `0016_timesheet_import_*` data files). Supporting evidence pulled from `functions/api/pride/sync.js`, `functions/_middleware.js`, `functions/_utils.js`, `package-lock.json`, `npm audit`, git tracking state, and a live check of https://champ-pm.app.

Severity scale: **Critical** (exploitable now / auth or data integrity at stake) → **High** → **Medium** → **Low** → **Info**.

---

## CRITICAL

### C1. Clerk SDK in vulnerable range — known auth-bypass advisories (fix available)
- **File:** `package.json` (deps), `package-lock.json` (`@clerk/clerk-react` 5.61.3, `@clerk/shared` in vulnerable range)
- **Description:** `npm audit` reports:
  - **Critical — GHSA-vqx2-fgx2-5wq9**: "Official Clerk JavaScript SDKs: Middleware-based route protection bypass" (`@clerk/shared`).
  - **High — GHSA-w24r-5266-9c3c**: "Authorization bypass when combining organization, billing, or reverification checks" (`@clerk/clerk-react` 5.9.0–5.61.5).
  - Plus transitive **high** `js-cookie` (cookie-attribute injection via prototype hijack).
- **Mitigating context:** CHAMP-PM does *not* use Clerk's server middleware — `functions/_middleware.js` does its own JWKS-based JWT verification — so the middleware-bypass advisory likely doesn't apply to the API layer directly. But the client SDK advisory and js-cookie issue do apply to the bundle, and staying in a vulnerable range of an *auth* SDK is unacceptable risk posture.
- **Fix:** `npm audit fix` resolves all Clerk-related advisories without breaking changes (stays in v5 line). Do this first; re-run `npm audit` to confirm.

### C2. Migrations are not replayable; production schema has drifted from the migrations directory
- **Files:** `migrations/0003_fy24_projects.sql` (et al.), `migrations/0017_import_maps.sql`, `migrations/0023_staff_plans_priority.sql`, `functions/api/pride/sync.js:153`
- **Description:** This is a disaster-recovery problem, not a today-it's-broken problem, but it's severe:
  1. **No migration creates the grants** that seed migrations depend on. `0003_fy24_projects.sql` inserts projects with `grant_id = 7`; `0009_fa_seed.sql` references grants 7, 8, 11–14; `0015_import_structures.sql` references grants 5, 9, 10, 15–17. Nothing in the migrations directory inserts those `grants` rows — they were evidently created ad hoc in D1. A replay on a fresh database fails (D1 enforces FKs) or silently creates orphans.
  2. **`users.end_date` does not exist in any migration**, yet `functions/api/pride/sync.js` runs `UPDATE users SET end_date=?`. The column was added directly to production D1. Anyone rebuilding from `migrations/` gets a schema that the deployed code crashes against.
  3. `0023_staff_plans_priority.sql` literally says *"Already applied directly to D1 (local + remote)"* — confirming the ad-hoc-first, migration-file-second workflow. If wrangler's migration tracker ever replays it, `ALTER TABLE ... ADD COLUMN` will error on duplicate column.
  4. `0017_import_maps.sql` hard-codes **environment-specific task IDs** (338, 340, 350, …) and `0007_fy21_projects.sql` runs `UPDATE projects ... WHERE id=1`. These only mean something against the exact production row history.
- **Impact:** If the D1 database is lost or you need a staging copy, the migrations directory **cannot reproduce production**. Backup/restore is your only line of defense, and D1 time-travel is limited (30 days).
- **Fix:**
  - Take a full export now: `npx wrangler d1 export champ-pm --remote --output=backup-$(date +%F).sql` and store it (and schedule periodic exports).
  - Add a catch-up migration (e.g., `0025_schema_truth.sql`) that records the real current schema deltas: `ALTER TABLE users ADD COLUMN end_date TEXT;` plus the grants seed rows (or document grants as data, not schema).
  - Going forward: write the migration file *first*, apply it via `wrangler d1 migrations apply champ-pm --remote`, never via ad-hoc `d1 execute` for schema changes.

---

## HIGH

### H1. `xlsx` 0.18.5 — high-severity Prototype Pollution + ReDoS, **no fix available on npm**
- **File:** `package.json` (`"xlsx": "^0.18.5"`)
- **Description:** GHSA-4r6h-8v6p-xvw6 (prototype pollution, fixed only in 0.19.3+) and GHSA-5pgg-2g8v-p4x9 (ReDoS, fixed in 0.20.2+). The npm registry copy of SheetJS is abandoned at 0.18.5; `npm audit fix` cannot resolve it. This library parses **user-supplied spreadsheets** in the import features — exactly the attack surface these CVEs target.
- **Fix:** Switch the dependency to the vendor's official distribution: `npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (API-compatible), or migrate to `exceljs`. Exposure is mitigated by all importers being authenticated admins, but prototype pollution in a Worker/browser context is still worth eliminating.

### H2. Production source maps are publicly served
- **File:** `vite.config.js` (`sourcemap: true`); verified live: `https://champ-pm.app/assets/index-*.js.map` returns **HTTP 200, ~6.3 MB**.
- **Description:** The full, commented client source (every page, API call pattern, business logic, internal naming, salary/equity feature internals) is downloadable by anyone who can reach the site. No secrets are embedded in the bundle (Clerk publishable key is public by design), but this hands an attacker a perfect map of the app and removes any obscurity around the API surface.
- **Fix:** Set `sourcemap: false` (or `'hidden'` if you want maps for error tooling without serving them — note Pages will still deploy the files if they're in `dist/`, so prefer `false`, or delete `*.map` in the build script).

### H3. Employee PII committed to the git repository
- **Files:** `migrations/0008_salary_seed.sql` (29 named individuals with exact annual salaries), `migrations/0002_staff_import.sql` (full roster: names, emails, titles, hire dates), `migrations/0016_timesheet_import_*.sql` (~7 MB of per-person timesheet history), `functions/api/pride/sync.js` (**26 real university UINs** mapped to netIDs, hard-coded in source)
- **Description:** All of these are git-tracked and pushed to GitHub. UINs are protected identifiers under University of Illinois policy; salary-by-name is sensitive HR data. The protection of all of it currently rests entirely on the repo staying private and the access list staying tight. Git history makes removal-after-the-fact expensive (history rewrite + force push).
- **Fix:**
  - Confirm the repo is **private** and audit collaborators + any PAT scopes. (Note: the agent's own `gh` token returned `HTTP 401: Bad credentials` during this audit — it has expired and should be rotated; visibility could not be verified programmatically.)
  - Move the UIN map out of source into a D1 table or a Pages secret/KV.
  - Accept-and-document, or purge: if the seed files must stay (they're load-bearing for migration replay), document the PII exposure in KNOWLEDGE.md as a standing risk; if not, replace with sanitized seeds and rewrite history.

### H4. PRIDE sync: one shared static token guards salary-mutating endpoint
- **Files:** `functions/api/pride/sync.js` (~line 66–75), `public/pride-bookmarklet.js`
- **Description:** `/api/pride/sync` **bypasses Clerk entirely** (its own bearer check runs in the function; verify `_middleware.js` actually exempts it — if middleware requires a Clerk JWT first, the bookmarklet would 401, implying an exemption exists). Weaknesses:
  - One shared, non-expiring secret (`PRIDE_SYNC_TOKEN`) authorizes **inserts into `salary_records`** and **updates to `users.end_date`**.
  - Comparison is `token !== expectedToken` — non-constant-time (timing side channel; low practical risk but free to fix).
  - The token is persisted in **localStorage of a third-party origin** (`pride.prairie.illinois.edu`). Any XSS on that university app exfiltrates the token. localStorage is also readable by any script that origin ever runs (analytics, injected content).
  - No rate limiting, no audit log of sync calls beyond inserted rows, no token rotation story.
- **Mitigating factors:** Token never appears in the repo (verified — only references to its *name*); the endpoint can't lower salaries (PRIDE-lower goes to discrepancy review); writes are append-only inserts.
- **Fix:** (1) constant-time compare (hash both sides with SHA-256 and compare digests, or `crypto.subtle.timingSafeEqual` pattern); (2) document and calendar token rotation; (3) consider scoping: require sync requests to also carry a short-lived Clerk JWT, or at minimum log source IP + timestamp to a sync_log table; (4) add basic per-IP rate limiting (Cloudflare WAF rule is the cheap option).

---

## MEDIUM

### M1. Remaining `npm audit` findings beyond Clerk/xlsx
- **File:** `package.json` / lockfile
- **Description:** 11 total vulnerabilities (1 critical, 6 high, 4 moderate):
  - `esbuild` ≤0.28.0 (high, GHSA-67mh-4wv8-2f99 — dev-server request forgery) via `vite` 5.4.21. **Dev-time only**, but the published fix requires `vite@8` (breaking).
  - `lodash` (high, `_.template` code injection + prototype pollution) — transitive via `recharts`.
  - `picomatch` (high, ReDoS/method injection) — build-time.
  - `postcss` <8.5.10 (moderate XSS in stringify) — build-time.
  - `react-router` 6.x (moderate, open redirect via `//` protocol-relative path, GHSA-2j2x-hqr9-3h42) — **runtime**, relevant if any redirect uses user-influenced paths.
- **Fix:** Run `npm audit fix` (non-breaking; clears lodash/picomatch/postcss/react-router/js-cookie/clerk). Plan a separate, tested upgrade to Vite 6/7/8 to clear esbuild — don't `audit fix --force` blindly.

### M2. No security headers anywhere: no CSP, no `_headers` file, no X-Frame-Options/HSTS
- **Files:** `index.html` (no CSP meta), `public/` (no `_headers` file), `functions/_middleware.js` (sets none)
- **Description:** `index.html` itself is clean (no inline scripts, no external script/font loads — good), but the deployed site sends no `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, or `X-Content-Type-Options`. For an app displaying salary/HR data, clickjacking and injected-script blast radius matter.
- **Fix:** Add `public/_headers`:
  ```
  /*
    X-Frame-Options: DENY
    X-Content-Type-Options: nosniff
    Referrer-Policy: strict-origin-when-cross-origin
    Content-Security-Policy: default-src 'self'; script-src 'self' https://*.clerk.accounts.dev https://clerk.champ-pm.app; connect-src 'self' https://*.clerk.accounts.dev https://clerk.champ-pm.app; img-src 'self' data: https://img.clerk.com; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'
  ```
  (Tune the Clerk hostnames against what the prod bundle actually loads before enforcing; consider starting with `Content-Security-Policy-Report-Only`.)

### M3. Duplicate migration prefixes (0002, 0003, 0016, 0019) — fragile ordering
- **Files:** `migrations/0002_salary_budget.sql` + `0002_staff_import.sql`; `0003_equity.sql` + `0003_fy24_projects.sql`; 17× `0016_timesheet_import_*`; `0019_crm.sql` + `0019_schedule_feature.sql`
- **Description:** `wrangler d1 migrations apply` orders by full filename and tracks applied migrations by name, so duplicates *work* — order within a prefix is alphabetical by suffix (`0002_salary_budget` → `0002_staff_import`; `0003_equity` → `0003_fy24_projects`). Risks: (a) the comment in `0002_salary_budget.sql` says "Run BEFORE 0008" and `0003_equity` says "Run AFTER 0002" — correctness now depends on accidental alphabetics; (b) two devs creating "the next number" collide; (c) humans reading the directory misjudge application order. The 0016 series is intentional sharding and is fine.
- **Fix:** Don't renumber already-applied files (the tracker stores names). Adopt strictly increasing numbers going forward, and add a one-line README in `migrations/` noting the historical duplicates and the actual applied order.

### M4. `ON DELETE CASCADE` from `contacts` destroys interaction history
- **File:** `migrations/0019_crm.sql` (`interactions.contact_id ... ON DELETE CASCADE`, `contact_grant_links ... ON DELETE CASCADE`)
- **Description:** Deleting one contact silently deletes every logged call/meeting/email note and pending next-actions for that contact. For a CRM, interactions are audit history — a fat-fingered contact delete is unrecoverable data loss. (`contact_grant_links` cascade is fine; it's a pure join table. The `schedule_*` cascades on project delete in `0019_schedule_feature.sql` are defensible but worth knowing: deleting a project wipes its phases, milestones, and scenarios.)
- **Fix:** Prefer soft-delete for contacts (`is_active` flag), or change to `ON DELETE RESTRICT` and require explicit archive. At minimum, make the UI confirm with a count of interactions that will be destroyed.

### M5. No immutability enforcement on `salary_records` / `fringe_rates` — convention only
- **File:** `migrations/0002_salary_budget.sql`
- **Description:** AGENTS.md declares these tables immutable by design, but nothing in the database enforces it. Any function with a bug (or any future endpoint) can `UPDATE`/`DELETE` them. SQLite/D1 supports triggers, which is the architecture-level guard that's missing.
- **Fix:** Add in a new migration:
  ```sql
  CREATE TRIGGER salary_records_no_update BEFORE UPDATE ON salary_records
    BEGIN SELECT RAISE(ABORT, 'salary_records is append-only'); END;
  CREATE TRIGGER salary_records_no_delete BEFORE DELETE ON salary_records
    BEGIN SELECT RAISE(ABORT, 'salary_records is append-only'); END;
  ```
  …and the same pair for `fringe_rates`. (Keep an admin escape hatch documented: drop trigger → fix → recreate, with Glenn's sign-off.)

### M6. Missing foreign keys on user/grant references added after 0001
- **Files:** `migrations/0002_salary_budget.sql`, `0003_equity.sql`, `0019_crm.sql`, `0020_staff_plans.sql`
- **Description:** `0001_init.sql` consistently declares FKs; later tables don't: `salary_records.user_id`, `salary_adjustments.user_id`, `grant_fa_rates.grant_id`, `task_budget_lines.task_id`, `equity_snapshot_items.user_id`, `interactions.user_id`, `staff_plan_grant_balances` (no link to `grants` at all — by design since it keys on PRIDE account strings, but worth stating). Orphaned salary rows for a mistyped `user_id` would silently corrupt budget math.
- **Fix:** SQLite can't add FKs to existing tables without a rebuild; where a rebuild is too risky, add app-level validation plus a periodic integrity query (e.g., `SELECT * FROM salary_records WHERE user_id NOT IN (SELECT id FROM users)`).

### M7. No CHECK constraints on percentages, rates, and dollar fields
- **Files:** `0001_init.sql` (`assignments.allocated_pct`), `0020_staff_plans.sql` (`allocation_pct REAL NOT NULL -- 0-100` comment but no constraint), `0002_salary_budget.sql` (`rate`, `fa_rate`, `annual_salary`), `0001` (`hours`)
- **Description:** Nothing stops `allocation_pct = 4700`, negative `hours`, or `fringe_rate = 45.1` (vs 0.451 — a unit mistake that would inflate every cost calculation 100×). The comment in `staff_appointments` even documents the intended 0–100 range without enforcing it.
- **Fix:** New tables: add `CHECK (allocation_pct BETWEEN 0 AND 100)`, `CHECK (hours >= 0 AND hours <= 24)`, `CHECK (rate >= 0 AND rate < 1)` as appropriate. Existing tables: enforce in `functions/` handlers + add an integrity-check query to the ops runbook.

---

## LOW

### L1. Global CORS `Access-Control-Allow-Origin: *` on API preflight, and `*` on `/api/reports/timesheet`
- **Files:** `functions/_middleware.js:99`, `functions/api/reports/timesheet.js:174`
- **Description:** Wildcard ACAO with bearer-token auth is *not* an immediate vulnerability (browsers don't attach the Authorization header ambiently, and `*` forbids credentials), but it means any website can probe your API shape, and if auth ever moves to cookies the wildcard becomes a CSRF-grade hole. The reports endpoint returning `*` on actual responses deserves a second look at what it serves to unauthenticated callers.
- **Fix:** Restrict ACAO to `https://champ-pm.app` (and the PRIDE origin only on `/api/pride/sync`).

### L2. `compatibility_date = "2024-01-01"` is stale
- **File:** `wrangler.toml`
- **Description:** Pinning is correct practice, but a 2.5-year-old date means new Workers runtime fixes/behaviors are opted out. No observability/logging config is present either (Pages has limited options, but `wrangler pages deployment tail` is your only visibility today).
- **Fix:** Bump to a recent date in a controlled deploy and smoke-test; consider enabling Pages Functions metrics/Logpush if on a plan that supports it.

### L3. `0022` table rebuild uses double-quoted string literal `datetime("now")`
- **File:** `migrations/0022_staff_plans_account_key.sql`
- **Description:** Double quotes denote identifiers in SQL; this only works via SQLite's deprecated double-quoted-string fallback (and D1 can disable that misfeature). The column-order-sensitive `INSERT ... SELECT` in the same file is correct today but is the classic place a future column addition silently shears data.
- **Fix:** Use single quotes: `DEFAULT (datetime('now'))`; prefer explicit column lists in rebuild inserts.

### L4. Inconsistent timestamp discipline
- **Files:** `0019_crm.sql` (`created_at`/`updated_at` nullable, no defaults), `0001_init.sql` (`timesheet_weeks` has no `updated_at`), `0020` (`staff_appointments` no `updated_at`)
- **Description:** Most tables default `datetime('now')`; the CRM tables rely on app code to populate timestamps, so a missed code path leaves NULLs. `timesheet_weeks` status changes (submit/approve/reject) aren't timestamped beyond the specific `submitted_at`/`reviewed_at` fields (acceptable, but `updated_at` would be cheap).
- **Fix:** Add defaults in a future rebuild or set in handlers consistently.

### L5. Missing indexes on newer query paths
- **Files:** `0019_crm.sql`, `0019_schedule_feature.sql`
- **Description:** No indexes on `interactions.contact_id`, `interactions.next_action_due` (the "what's due" query), `contacts.org_id`, `schedule_phases.project_id`, `schedule_milestones.project_id`, `projects.study_area_id`, `contact_grant_links.grant_id` (UNIQUE covers contact-first lookups only). At current row counts D1 won't care; they're cheap insurance.
- **Fix:** One small index migration covering the above.

### L6. `index.html` references `/favicon.svg` but `public/` contains only the two bookmarklet files
- **Files:** `index.html:5`, `public/`
- **Description:** Every page load 404s the favicon (cosmetic; verify — it may be served from a different deploy artifact).
- **Fix:** Add the SVG to `public/` or drop the link tag.

### L7. PRIDE sync hard-codes fringe/appointment on salary updates
- **File:** `functions/api/pride/sync.js` (INSERT uses `0.451, 'surs'` for every update)
- **Description:** If a non-SURS employee ever lands in `UIN_MAP`, a PRIDE-driven raise records the wrong fringe rate, corrupting cost projections. Also `'astillwell'` in UIN_MAP doesn't match the seeded user id `'ashlynn'` — that UIN will insert salary rows for a nonexistent user (no FK to stop it — see M6).
- **Fix:** Look up the user's latest `appointment_type`/`fringe_rate` and carry it forward; fix or remove the `astillwell` mapping.

---

## INFO

- **I1. `.env` is clean.** Contains only `VITE_CLERK_PUBLISHABLE_KEY=pk_test_...` (a *publishable* key — public by design, dev instance). It is in `.gitignore` (listed twice, lines 6 & 8 — trivial dupe), and `git log --all -- .env` confirms it was **never committed**. ✅
- **I2. `wrangler.toml` secrets hygiene is correct.** `CLERK_SECRET_KEY` is referenced only as a comment pointing to `wrangler pages secret put`; only publishable keys live in `[vars]`. D1 binding is `DB` with correct database name/id. ✅
- **I3. Bookmarklet design is sound for what it is.** Token is **user-entered, never embedded** in the distributed `bookmarklet.txt`/`pride-bookmarklet.js` (verified both). DOM writes use `textContent` only — no injection sink even if the server response were hostile. It collects: UIN, name, salary, employment type, job end date, and monthly account-allocation percentages — i.e., exactly the PRIDE PII discussed in H3/H4; transmitted over HTTPS with bearer auth. Residual risks are covered in H4 (shared token, third-party localStorage). The minified `bookmarklet.txt` matches the readable source.
- **I4. `vite.config.js` has no proxy and no `define` blocks** — nothing routes secrets toward the bundle; only `VITE_`-prefixed vars can leak by Vite's rules, and the only one used is the publishable key. (Sole config issue is sourcemaps — H2.)
- **I5. Duplicate-prefix mechanics confirmed:** D1's migration tracker records full filenames, so the existing duplicates won't double-apply or skip; this is an ordering/maintainability risk (M3), not a correctness bug today.
- **I6. Agent GitHub token is dead.** `~/.openclaw/agents/champ-pm/.gh-token` returns `HTTP 401: Bad credentials`. Rotate it — this also blocked programmatic verification of repo visibility for H3.

---

## Things Done Well

1. **Secrets discipline** — no secret key has ever touched git (`.env` untracked and clean; `CLERK_SECRET_KEY` only via Pages secrets; PRIDE token only via env).
2. **Append-only salary architecture** — `salary_records` as effective-dated history with `created_by` attribution is the right model for auditability (it just needs trigger enforcement, M5).
3. **Server-side JWT verification** — `_middleware.js` verifies Clerk JWTs against JWKS with real RSA signature checks and expiry validation rather than trusting decoded claims, and insulates the API from the Clerk middleware CVE class.
4. **`0001_init.sql` is genuinely good schema** — NOT NULL discipline, sensible UNIQUE constraints (`user/task/date` on entries), FKs throughout, and indexes on every join path.
5. **Bookmarklet XSS hygiene** — exclusive use of `textContent`, origin check before scraping, token cleared on 401.
6. **`0022` migration did a proper SQLite table rebuild** (new table → copy → drop → rename → reindex) instead of fighting ALTER TABLE limitations.
7. **Snapshot pattern for volatile financials** — `grant_balances` storing `fa_rate` per snapshot ("so history is accurate") and `staff_plan_grant_balances` keyed on full account strings show real domain care.
8. **CORS on the PRIDE endpoint is origin-pinned** to `https://pride.prairie.illinois.edu`, not wildcarded.
9. **Clean `index.html`** — no inline scripts, no third-party script/font/CDN loads; the entire app surface is first-party.

---

## Recommended Action Order

| # | Action | Effort | Closes |
|---|--------|--------|--------|
| 1 | `npm audit fix` (non-breaking), redeploy | 15 min | C1, M1 (most) |
| 2 | `sourcemap: false`, redeploy | 5 min | H2 |
| 3 | `wrangler d1 export` backup now + schedule | 15 min | C2 (mitigation) |
| 4 | Catch-up migration (`users.end_date`, document grants seed) | 1 hr | C2 |
| 5 | Append-only triggers on `salary_records`/`fringe_rates` | 30 min | M5 |
| 6 | Replace `xlsx` with SheetJS CDN tarball 0.20.3 | 1 hr + test | H1 |
| 7 | `public/_headers` with CSP (report-only first) | 1 hr | M2 |
| 8 | Rotate agent gh token; verify repo private; move UIN map out of source | 1 hr | H3, I6 |
| 9 | PRIDE token: constant-time compare + rotation + logging | 1 hr | H4 |
| 10 | Plan Vite 6+ upgrade | scheduled | M1 (esbuild) |
