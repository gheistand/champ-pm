# CLAUDE.md

## Project identity
- Project name: CHAMP PM
- Short description: Program management tool for the Illinois State Water Survey (ISWS) CHAMP section — manages a ~$15M FEMA grant portfolio: timesheets, budget burndown, staff assignments/salary, schedule/Gantt, equity analysis, staff plan optimization, and CRM.
- Primary owner: Glenn Heistand (ISWS, CHAMP Section Lead)
- Primary users/audience: CHAMP staff (Glenn's direct reports plus a few peers) — an internal tool, not public-facing. ~25 staff.
- Business or organizational purpose: Track and manage FEMA/DHS grant-funded staff time, budgets, and schedules for the Illinois State Water Survey's CHAMP program (flood mapping / hazard mitigation work).
- Current status: active / production (live, daily use by CHAMP staff)

## What success looks like
- The main jobs this project must do well:
  - Accurate timesheet tracking per staff/task/grant
  - Correct budget burndown and F&A calculations (FEMA compliance-sensitive)
  - Reliable, auditable salary/fringe history (append-only, immutable where required)
  - Schedule/Gantt tracking that respects hard grant period-of-performance (PoP) ceilings
- The most important workflows users need:
  - Staff: log daily hours → submit week → admin approves/rejects
  - Admin: manage grants → projects → tasks → staff assignments; review budget/runway; build staff plans; manage schedules
- The top priorities when making changes:
  - Reliability and correctness over speed — this feeds real budget/compliance numbers
  - Minimal regression risk — production tool used daily by real staff
  - Preserve backward compatibility — many features (staff plans, schedule) have "base data must never be silently modified" guarantees (e.g., what-if scenarios store deltas only, never touch base tables)
  - Data immutability rules must never be violated (see Project-specific rules)

## Tech stack
- Frontend: React 18 + Vite (8.0.16) + Tailwind CSS 3.4, Recharts for charts, react-router-dom 6
- Backend: Cloudflare Pages Functions (edge workers, file-based routing under `functions/api/`)
- Database: Cloudflare D1 (SQLite), binding name `DB`, database name `champ-pm`
- Hosting/platform: Cloudflare Pages (auto-deploys on push to `main`)
- Auth: Clerk (production instance, domain `champ-pm.app`; roles via `publicMetadata.role` = `admin` | `staff`)
- Payments/subscriptions: none
- APIs/services used: Clerk API (user/invite management), Anthropic API (Claude Haiku — AI-Assisted Goals feature), PRIDE (Illinois NCSA staff-plan system, via browser bookmarklet sync, not a real API)
- CI/CD: Cloudflare Pages auto-build on push to `main` (~60–90s); no separate GitHub Actions pipeline currently in use for deploy
- Repo URL: https://github.com/gheistand/champ-pm
- Main branches: `main` (only branch in normal use; pushes to `main` trigger deploy)
- Package manager: npm
- Key frameworks/libraries: `@clerk/clerk-react`, `javascript-lp-solver` (linear programming for Staff Plan optimizer), `xlsx` (SheetJS, for import/export), `date-fns`, `clsx`

## Repository structure
- Important root folders and what they do:
  - `src/` — React frontend (`components/`, `pages/admin/`, `pages/staff/`, `hooks/`, `utils/`, `docs/`, `help/`)
  - `functions/` — Cloudflare Pages Functions backend; `_middleware.js` (Clerk JWT auth for all `/api/*`), `_utils.js` (shared helpers), `api/` (route handlers, folder-per-feature: staff, grants, projects, tasks, timesheets, budget, runway, salary, salary-adjustments, fringe-rates, schedule, program-schedule, study-areas, staff-plans, promotions, promotion-criteria, equity, classifications, crm, import, reports, alerts, dashboard, pride)
  - `migrations/` — D1 SQL migrations, currently 47 files (0001 through 0028+ with some sub-numbered), applied individually via `wrangler d1 execute` (see below — do NOT use `wrangler d1 migrations apply`)
  - `public/` — static assets, including `pride-bookmarklet.js` and `bookmarklet.txt` served at `/bookmarklet.txt`
  - `dist/` — build output (gitignored)
- App entry points: `index.html` → `src/main.jsx` → `src/App.jsx` (frontend); `functions/_middleware.js` is the backend auth entry point for all API routes
- Configuration files: `wrangler.toml` (Cloudflare Pages + D1 binding + non-secret vars), `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `.env` (frontend `VITE_CLERK_PUBLISHABLE_KEY`)
- Test locations: none currently established (no test framework configured in package.json as of this writing)
- Scripts folder(s): none dedicated; ad hoc data-fix/import scripts have historically been run via one-off Python/Node scripts against remote D1, not committed as a permanent scripts/ folder
- Infrastructure/deployment files: `wrangler.toml`
- Content/data directories: none beyond D1 itself; large local-only artifacts (backups, business plan docs, audit reports, MAS analysis, promotion package) live in repo root but are gitignored or otherwise not meant for general agent editing
- Files or directories that should be treated carefully:
  - `migrations/` — production D1 schema; changes must be reviewed before executing against remote
  - Anything touching `salary_records` (append-only) or `fringe_rates` (immutable after creation)
  - `functions/api/pride/sync.js` — contains hardcoded UIN→user_id map for ~25 staff; also gated by `PRIDE_SYNC_TOKEN`
  - `backup-*.sql` files — gitignored production DB dumps, may contain PII; never commit

## Run, build, test, deploy
### Setup
- Local setup steps: `npm install`; create D1 database with `npx wrangler d1 create champ-pm` (already done — see `wrangler.toml` for existing `database_id`); run migrations against `--local` or `--remote` as needed
- Environment file(s) used: `.env` (frontend: `VITE_CLERK_PUBLISHABLE_KEY`)
- Required secrets or credentials (describe, do not store secrets here):
  - `CLERK_SECRET_KEY` — Cloudflare Pages secret, required for backend Clerk JWT verification / Clerk API calls
  - `ANTHROPIC_API_KEY` — Cloudflare Pages secret, enables AI-Assisted Goals in Staff Plans (Claude Haiku)
  - `PRIDE_SYNC_TOKEN` — Cloudflare Pages secret, pre-shared token authenticating the PRIDE sync bookmarklet endpoint
  - `PRIDE2_SYNC_TOKEN` — Cloudflare Pages secret (not yet set), pre-shared token for the PRIDE 2.0 discovery/sync scaffold endpoint (`/api/pride2/sync`)

### Common commands
- Install: `npm install`
- Dev: `npm run dev` (Vite only) or `npm run pages:dev` (full stack via `wrangler pages dev`, http://localhost:8788)
- Build: `npm run build`
- Test: no test suite configured
- Lint: not configured in package.json
- Typecheck: not configured (project is JS/JSX, not TypeScript)
- Format: not configured
- Database migrate: `npx wrangler d1 execute champ-pm --file=migrations/NNNN_name.sql --remote` (or `--local` for local dev). **Do not use `wrangler d1 migrations apply`** — the migration tracker has never been used; all migrations were applied via direct `d1 execute` and the tracker would show all of them as unapplied, causing conflicts if run.
- Database seed: no formal seed script; data entered via UI or targeted `d1 execute` inserts
- Deploy: `git push` to `main` → Cloudflare Pages auto-builds and deploys (~60–90s); or manually `npm run pages:deploy`
- Rollback, if any: via Cloudflare Pages dashboard (redeploy a previous build); no scripted rollback

## Architecture notes
- High-level system design: SPA (React + Vite) served as static assets from Cloudflare Pages, backed by Cloudflare Pages Functions (edge workers) as the API layer, with Cloudflare D1 (SQLite) as the database. Clerk handles auth; JWTs verified in `functions/_middleware.js` on every `/api/*` request.
- Key components/modules: grants → projects → tasks hierarchy; timesheet entries/weeks; salary_records (append-only) + fringe_rates (immutable); staff plan LP optimizer (`javascript-lp-solver`); schedule module (phases, milestones, dependencies, what-if scenarios); CRM (contacts/organizations/interactions with soft-delete); PRIDE sync bookmarklet integration.
- Important data flows:
  - Timesheet entries roll up into budget burndown and reports using `(annual_salary / 2080) × (1 + fringe_rate)` loaded-rate formula, with F&A (0.317 MTDC) applied separately at the grant level.
  - PRIDE bookmarklet → `POST /api/pride/sync` → compares PRIDE salary/end-date data to D1, auto-inserts salary_records when PRIDE is higher, flags for review when CHAMP-PM is higher.
  - Staff Plan AI Goals: natural-language goal text → `POST /api/staff-plans/ai-goals` → Claude Haiku → JSON constraint overrides → fed into existing `optimize.js` LP solver (opt-in, fully backward compatible when omitted).
- External dependencies: Clerk (auth), Anthropic API (optional AI goals feature), PRIDE (Illinois NCSA system — no real API, browser bookmarklet only)
- Stateful parts of the system: D1 database is the sole source of truth; schedule what-if scenarios store override deltas only and never mutate base `schedule_phases`/`schedule_milestones` tables.
- Performance-sensitive areas: D1 SQL patterns — **D1 does not support correlated subqueries in SELECT with GROUP BY** (silently fails/returns wrong results); the established pattern is to split into separate queries and combine results in JavaScript (see `functions/api/reports/timesheet.js` for the reference pattern).
- Security-sensitive areas: `functions/_middleware.js` (Clerk JWT verification for all API routes), `requireAdmin()` guard in `functions/_utils.js` used across all admin-only endpoints, `functions/api/pride/sync.js` (CORS locked to `https://pride.prairie.illinois.edu` origin only, plus pre-shared token).
- Known technical constraints:
  - Grant period-of-performance (`grants.end_date`) is a hard ceiling — no schedule phase or milestone may exceed it (enforced both API-side with a 400 and UI-side with a warning/block).
  - `fund_number` is NOT a unique identifier (one fund number can map to 8+ distinct accounts) — always use `full_account_string` as the canonical grant key.

## Coding standards
- Preferred languages and versions: JavaScript/JSX (no TypeScript in this repo), Node ESM (`"type": "module"` in package.json)
- Style rules: not formally documented; follow existing file conventions (functional React components, hooks-based state)
- Naming conventions: D1 `users.id` uses email-prefix format (e.g. `heistand`, `dianad`), not Clerk `user_xxx` IDs — do not conflate the two ID spaces
- File organization conventions: `functions/api/<feature>/` folders mirror `src/pages/admin/<Feature>.jsx` — one API folder per feature area; index.js for collection routes, `[id].js` for single-resource routes (Cloudflare Pages Functions file-based routing)
- Commenting style: not formally documented
- Error handling expectations: server-side referential-integrity checks with friendly error messages; delete-protection to block cascading deletes; confirmation dialogs required in UI for destructive actions
- Logging expectations: not formally documented
- Testing expectations: no automated test suite exists; verification has historically been done via direct remote D1 queries against real data, not just code inspection
- Accessibility expectations: not formally documented
- UI/UX expectations: internal tool for a small known staff group — clarity for non-technical FEMA/grant-admin users is valued (in-app documentation system is a backlog item specifically to explain business rules/formulas/gotchas to staff)
- Documentation expectations: keep this CLAUDE.md and any equivalent knowledge base current when schema or major features change

## Change rules for Claude
- Always make the smallest safe change that solves the problem.
- Prefer editing existing patterns over inventing new ones.
- Preserve current architecture unless explicitly asked to redesign.
- Before large edits, explain the plan first.
- Before destructive changes, ask for confirmation.
- Do not remove existing functionality unless explicitly directed.
- When touching multiple files, explain why each file is changing.
- If requirements are ambiguous, ask clarifying questions.
- If there is a tradeoff, state it clearly.

## Project-specific rules
- Never edit `salary_records` — always INSERT a new record (append-only history by design).
- Never edit `fringe_rates` values or `effective_date` after creation — notes are editable, the rate value is immutable.
- F&A rate is fixed at 0.317 MTDC for all FEMA/DHS grants — no exceptions.
- Never use `fund_number` alone to join/match grants — always use `full_account_string`; `fund_number` is display-only.
- Never write D1 queries with correlated subqueries inside a SELECT that also has GROUP BY — split into separate queries and combine in JavaScript.
- No schedule phase or milestone may be scheduled beyond its grant's `end_date` (PoP ceiling) — this must be enforced, not just warned about.
- Schedule what-if scenarios must never modify base schedule tables — overrides only, stored as deltas.
- Do not run `wrangler d1 migrations apply` against production — the migration tracker has never been initialized for this project; apply schema changes individually via `wrangler d1 execute --command=` or `--file=`.
- Do not commit secrets (`CLERK_SECRET_KEY`, `ANTHROPIC_API_KEY`, `PRIDE_SYNC_TOKEN`) into the repo — Cloudflare Pages secrets only.
- Confirm with Glenn before running destructive SQL (DROP, DELETE without WHERE, UPDATE without WHERE) against production D1.
- Glenn's own hours are intentionally not tracked on timesheets (since ~Apr 2022, when he became Section Lead) — this is expected, not a data gap.

## Integrations
- GitHub workflows used: none currently configured for CI; deploy is Cloudflare Pages' own build-on-push, not a GitHub Actions workflow
- Cloudflare usage: Pages (hosting + Functions for API), D1 (database) — project name `champ-pm`, D1 database name `champ-pm`
- Domain/DNS notes: production domain `champ-pm.app`; a `www` → `champ-pm.app` redirect cleanup is a known open backlog item
- Third-party webhooks: PRIDE sync is inbound via bookmarklet POST (not a true webhook, but functions similarly) — `POST /api/pride/sync`, gated by `PRIDE_SYNC_TOKEN` and CORS-locked to the PRIDE origin
- **PRIDE 2.0 sync (scaffold, 2026-08-11):** PRIDE 2.0 (`pride2.prairie.illinois.edu`) is the in-development successor to PRIDE — Laravel + React SPA with clean JSON REST-style endpoints (vs. PRIDE 1.0's HTML-table scraping), but still session+CSRF gated with no public API keys. Scaffold in place: `functions/api/pride2/sync.js` (currently "capture mode" only — logs raw JSON responses to `pride2_capture_log` table for shape inspection; real sync logic not yet implemented), `public/pride2-bookmarklet.js` / `/bookmarklet2.txt` (discovery bookmarklet — calls PRIDE 2.0's own JSON endpoints via the browser's authenticated session, not DOM scraping), migration `0029_pride2_capture.sql`. Known endpoint so far: `GET /staff-plan/plans?start_date=&end_date=&people=&org_group_id=...`; salary-history and grant-balance endpoint URLs still unconfirmed. `functions/_middleware.js` was patched to exclude `/api/pride/sync` and `/api/pride2/sync` from the global Clerk JWT check (that check was silently 401'ing both PRIDE endpoints before their own token auth ran — previously an unconfirmed 2026-06-12 audit finding, confirmed and fixed 2026-08-11). Next step: Glenn opens PRIDE 2.0 dev tools with the agent to confirm exact response shapes, then real parsing/sync logic gets written mirroring `functions/api/pride/sync.js`.
- Mobile app relationship, if any: none; a mobile-friendly timesheet view is a backlog item, not a separate app
- Internal dashboards/admin tools: `/admin/dashboard`, plus dedicated admin pages for staff, grants, budget, runway, timesheets, reports, import, equity, promotions, salary, schedule, CRM (see feature map in project knowledge base for full route/file list)
- Analytics/monitoring: none formally established
- Error tracking: none formally established
- Email/messaging integrations: none in-app; staff invites go through Clerk's invitation system (with a manual fallback of sending the invite link directly when Illinois email filters block Clerk's emails)

## Environment and deployment notes
- Environments: local (via `wrangler pages dev` against local or remote D1) and production (`champ-pm.app`, remote D1) — no separate staging environment exists
- Differences between environments: local dev can point at `--local` (in-memory/sqlite file) or `--remote` D1; production always uses remote D1
- Manual deployment steps: none beyond `git push` to `main` for the normal flow; `npm run pages:deploy` is available for a manual/local deploy if needed
- Post-deploy checks: verify at https://champ-pm.app after the ~60–90s Cloudflare build completes
- Known infrastructure risks:
  - D1 migration tracker was never initialized — do not run `wrangler d1 migrations apply` (see rules above)
  - Several audit findings resolved 2026-06-13 (Vite upgrade, dependency CVEs, RBAC review — see repo's audit reports and long-term memory for details); no known outstanding critical findings as of that review
- Recovery steps: a full D1 export exists as a point-in-time backup pattern (`npx wrangler d1 export champ-pm --remote --output=backup-$(date +%F).sql`); Cloudflare Pages retains previous deployments for rollback via dashboard

## Testing and validation
- What must be checked after any change: no automated test suite exists — verification is manual. For anything touching money/hours math (timesheets, budget, salary, F&A), verify against real data with a direct D1 query, not just code review.
- Smoke test checklist: not formally documented; at minimum, confirm the touched page loads, the touched API route returns expected shape, and (for admin features) `requireAdmin()` still gates it.
- High-risk areas to test: anything touching `salary_records`, `fringe_rates`, F&A rate (0.317), grant PoP ceilings (`grants.end_date`), or schedule what-if overrides (must never write to base schedule tables).
- Browser/device requirements: not formally documented; internal tool, desktop-first — mobile-friendly timesheet is an open backlog item, implying mobile is not currently well-supported.
- API validation requirements: not formally documented beyond existing per-route field whitelisting patterns already in the codebase (see Known issues below re: one unparameterized query as the exception, not the pattern to follow).
- Data integrity checks: after any migration or bulk data change against remote D1, spot-check row counts and a few known records via `wrangler d1 execute --remote`.
- Subscription/payment checks, if relevant: not applicable — no payments/subscriptions in this project.

## Known issues and sharp edges
- Current bugs:
  - **SQL injection in `functions/api/program-schedule/index.js` (~line 14)** — `grant_status` query param is interpolated directly into a SQL string (`WHERE g.status = '${grantStatus}'`) instead of parameterized. Found in the 2026-06-12 audit (`AUDIT-2026-06-12.md`, `AUDIT-BACKEND-2026-06-12.md`) as the one exception to an otherwise fully parameterized codebase. **Confirmed still present as of 2026-07-18** — not in the list of items fixed in commit 31c1389. Fix: whitelist allowed values or parameterize with `.bind()`.
  - **PRIDE sync endpoint (`functions/api/pride/sync.js`) may be blocked by global Clerk middleware** — the 2026-06-12 backend audit found the global `_middleware.js` JWT check can 401 the shared-token PRIDE request before the endpoint's own `PRIDE_SYNC_TOKEN` auth runs. Also flagged: non-timing-safe token comparison on that endpoint. Status of a fix is not confirmed in memory — verify before relying on PRIDE sync working end-to-end.
  - byard salary discrepancy ($110,806 in CHAMP-PM vs $102,806 in PRIDE) — resolved/explained, not a bug: it's an $8,000 ISWS Operations Manager stipend paid from GRF, correctly excluded from PRIDE.
- Fragile areas:
  - AI-Assisted Goals endpoint (`functions/api/staff-plans/ai-goals.js`) — 2026-06-12 audit flagged unvalidated LLM output being applied directly as optimizer constraints; treat Claude's JSON output as untrusted input needing validation before it reaches `optimize.js`.
  - Auth middleware email-claim account linking (`functions/_middleware.js`) — when a Clerk `sub` isn't found in D1, it falls back to matching by email and rebinding `clerk_id` onto that user row. Audit flagged this as a potential account-linking weakness (an existing user's identity could theoretically be re-bound to a new Clerk account). Confirm current state before treating as fixed.
- Legacy code to avoid disturbing:
  - Migration files 0001–0028+ are applied historically via direct `d1 execute`, never via the wrangler migration tracker — do not attempt to "clean this up" by running `wrangler d1 migrations apply`, it will conflict (see Change rules below).
  - `functions/api/pride/sync.js`'s hardcoded UIN→user_id map for ~25 staff — brittle by nature (manual map), but replacing it with something dynamic has not been requested/planned.
- Tech debt:
  - No automated tests, lint, or typecheck configured anywhere in the project.
  - No CI pipeline — deploy correctness relies on Cloudflare Pages' build succeeding and manual post-deploy checks.
  - D1 migration tracker was never initialized (see above) — permanent tech debt unless a deliberate one-time reconciliation is planned.
- Common failure modes:
  - D1 correlated subqueries inside `SELECT ... GROUP BY` silently return wrong results instead of erroring — always split into separate queries and combine in JS.
  - Confusing `fund_number` for a unique grant key — it isn't; use `full_account_string`.
- Workarounds:
  - PRIDE has no REST API — sync is done via an authenticated-browser bookmarklet (`public/pride-bookmarklet.js`) that POSTs scraped data to `/api/pride/sync`, run manually by Glenn while logged into PRIDE.

## Preferred working style
- Explain first, then edit.
- Use plain language unless technical detail is needed.
- Show diffs or summarize changes clearly.
- For larger tasks, break work into steps.
- Recommend safer alternatives when risk is high.
- Call out unknowns instead of guessing.

## Task intake pattern
When given a task:
1. Restate the goal briefly.
2. Identify affected files/systems.
3. Propose the smallest safe plan.
4. Execute only after plan approval for medium/high-risk work.
5. Summarize what changed.
6. List validation steps and any follow-up actions.

## Definition of done
A task is done only when:
- The requested change is implemented.
- Relevant tests/checks have been run, if available.
- No obvious unrelated regressions were introduced.
- Any important assumptions are documented.
- The user can understand what changed and what to do next.

## Optional project memory
Keep this short and prune regularly.
- Repeated user preferences for this project: Glenn wants to be told what will be pushed before it's pushed (no solo deploys); destructive D1 commands always need explicit confirmation first.
- Lessons learned: the D1 correlated-subquery limitation and the `fund_number` non-uniqueness issue have each caused real bugs in the past (see MEMORY.md/KNOWLEDGE.md) — both are now standing rules, not just tips.
- Patterns that worked well: splitting D1 queries and combining in JS (see `functions/api/reports/timesheet.js`); the "$0-budget grant/project/task chain" pattern for logging shared-staff hours on non-CHAMP work (see the ISGS LiDAR / D4512 IDOT Parcels precedent, 2026-07-13 memory note).
- Patterns to avoid: raw string interpolation into SQL (see the one known exception above — do not replicate it elsewhere).
- Temporary notes to revisit: confirm current status of the PRIDE middleware conflict and the SQL injection fix before doing further work in those areas — both were open findings as of the last audit and have not been confirmed fixed.

---

_This file was compiled from the CHAMP-PM agent's local knowledge base (KNOWLEDGE.md, MEMORY.md, memory notes), repo inspection (README.md, package.json, wrangler.toml, migrations/), and the 2026-06-12 security audit reports (AUDIT-2026-06-12.md, AUDIT-BACKEND-2026-06-12.md, AUDIT-FRONTEND-2026-06-12.md, AUDIT-INFRA-2026-06-12.md) on 2026-07-18. It is not exhaustive — fill in gaps as they're discovered rather than guessing._
