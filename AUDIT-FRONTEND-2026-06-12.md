# CHAMP-PM Frontend Audit — 2026-06-12

**Scope:** React/Vite frontend (`src/`), build config, dependencies.
**Auditor:** CHAMP-PM agent (security & engineering audit subagent)
**Files reviewed:** App.jsx, main.jsx, index.css, hooks (useApi, useToast), utils (dateUtils, scheduleTemplates), all 11 shared components, all 5 schedule components, all 26 admin pages, all 3 staff pages, LandingPage, vite.config.js, tailwind.config.js, package.json, index.html, public/ assets.

---

## Severity Summary

| Severity | Count |
|---|---|
| Critical | 2 |
| High | 5 |
| Medium | 9 |
| Low | 8 |
| Info | 5 |

---

## CRITICAL

### C-1. `api.delete()` does not exist — Grant Balance delete is a guaranteed runtime crash
**File:** `src/pages/admin/StaffPlans.jsx` ~line 214 (`handleDelete` in `GrantBalancesTab`)

```js
await api.delete(`/api/staff-plans/balances/${b.id}`);
```

`useApi()` returns `{ get, post, put, del }` — there is **no `delete` method**. Clicking "Del" on a balance row throws `TypeError: api.delete is not a function`. The catch block masks it as a generic "Delete failed" toast, so the feature silently never works and the record is never deleted.

**Fix:** change to `api.del(...)`. Consider adding `delete: del` as an alias in `useApi` to prevent recurrence, and add ESLint (see H-5) which would not catch this directly but a smoke test would.

### C-2. Employee PII (names, usernames, termination dates) hardcoded into the public JS bundle
**File:** `src/pages/admin/StaffPlans.jsx` lines ~11–49 (`TERMINATIONS`, `STAFF_NAME_MAP`)

```js
const TERMINATIONS = {
  mjr: '2026-04-30',    // Mary Richardson — no appointments past this date
  dianad: '2026-04-30', // Diana Davisson
  lkumar: '2026-04-01', // Love Kumar — no new appointments
};
```

The compiled JS bundle on champ-pm.app is served as a **static asset with no authentication**. Anyone who fetches the bundle (or the source map — see H-1) can read the full staff roster (28 names + netIDs) and, far worse, **planned termination/separation dates for named employees** — sensitive HR information that the employees themselves may not know yet. The `TERMINATIONS` map is also posted to the API as client-supplied data (`createScenario`, `recalculate`, `runAiOptimize`), meaning business rules live in the client and can be tampered with.

**Fix:**
1. Move `TERMINATIONS` to a D1 table (e.g., `staff_plan_settings` or a `separation_date` column on users) and have the optimizer endpoints read it server-side. Never accept termination dates from the client.
2. Replace `STAFF_NAME_MAP` with the `user_name` already returned by `/api/staff-plans/*` endpoints (the code already falls back to `r.user_name` — the map is mostly redundant).
3. Rotate/rebuild to purge the data from currently-deployed bundles and old deploy previews.

---

## HIGH

### H-1. Production source maps publicly deployed
**File:** `vite.config.js`

```js
build: { outDir: 'dist', sourcemap: true }
```

Full original source (including C-2's PII, all business logic, API routes, comments) is published to anyone at `https://champ-pm.app/assets/*.js.map`. Combined with C-2 this exposes HR data in human-readable form.

**Fix:** `sourcemap: false` for production, or `'hidden'` + upload maps to an error-tracking service only.

### H-2. No code splitting — every admin page, recharts, and xlsx ship in one bundle to every user
**Files:** `src/App.jsx` (eager imports of all 30+ pages), `vite.config.js` (no `manualChunks`), zero `React.lazy`/`Suspense` anywhere.

A staff member who only uses the timesheet downloads: all 26 admin pages, 16 doc-guide components, **recharts** (~450 KB pre-gzip), **xlsx** (~430 KB pre-gzip), and the Gantt machinery. This hurts first-load on every device and increases the exposure surface of admin-only code (e.g., C-2) to non-admin users.

**Fix:** wrap routes with `React.lazy(() => import(...))` + `<Suspense fallback={<PageLoader/>}>`, at minimum splitting: (a) admin vs staff route groups, (b) recharts-heavy pages, (c) xlsx-using pages (StaffPlans, QuarterlyReports), (d) AdminDocs. Add `build.rollupOptions.output.manualChunks` for `recharts`, `xlsx`, `@clerk/clerk-react`.

### H-3. `xlsx` (SheetJS) 0.18.5 has known CVEs and is unmaintained on npm
**File:** `package.json`

`xlsx@0.18.5` is affected by CVE-2023-30533 (prototype pollution via crafted spreadsheet) and CVE-2024-22363 (ReDoS). The npm registry version is frozen; fixes (≥0.19.3 / 0.20.2) are only distributed from cdn.sheetjs.com. The app **parses untrusted user-uploaded workbooks** in StaffPlans (Appointments import) and QuarterlyReports, which is exactly the vulnerable path.

**Fix:** switch the dependency to the SheetJS CDN tarball (`"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"`) or migrate to `exceljs`.

### H-4. No security headers (`_headers`) on Cloudflare Pages — no CSP, frame, or MIME protections
**Files:** `public/` (no `_headers` file), `index.html`

There is no Content-Security-Policy, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy`. While React's escaping currently prevents XSS (no `dangerouslySetInnerHTML` anywhere — good), a CSP is the backstop for a finance/HR app holding salary data.

**Fix:** add `public/_headers`:
```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' https://*.clerk.accounts.dev https://accounts.champ-pm.app https://*.champ-pm.app; connect-src 'self' https://*.clerk.accounts.dev https://accounts.champ-pm.app; img-src 'self' data: https://img.clerk.com; style-src 'self' 'unsafe-inline'; frame-src https://accounts.champ-pm.app
```
(Tune for Clerk's actual domains; test in `Content-Security-Policy-Report-Only` first.)

### H-5. No linting at all (and only one file in the app uses `useMemo`)
**Files:** repo root (no `.eslintrc*` / `eslint.config.*`)

There is no ESLint config, so `react-hooks/exhaustive-deps`, undefined-variable, and unused-import checks never run. Concrete consequences already in the codebase: C-1 (`api.delete`), stale-closure deps (`Staff.jsx` `load` with `[]` deps using `api`/`addToast`; `Reports.jsx` `runReport` missing `api`; `ProjectDetail.jsx` several effects missing deps), dead code (M-8), and missing fragment keys (M-6).

**Fix:** add `eslint` + `eslint-plugin-react` + `eslint-plugin-react-hooks`, run in CI before Cloudflare deploy.

---

## MEDIUM

### M-1. Frontend-only RBAC — must be verified against backend enforcement
**Files:** `src/components/ProtectedRoute.jsx`, `src/App.jsx`

`ProtectedRoute` gates on `user.publicMetadata.role` from Clerk. This is sound *client UX* (publicMetadata is only writable server-side via Clerk API), but it is purely cosmetic security: any staff user can call `/api/salary/list`, `/api/equity/current`, etc. directly with their valid Clerk token. The frontend cannot fix this; this audit flags it as a **required cross-check**: every `/api/*` Pages Function must independently verify `role === 'admin'` from the verified Clerk JWT claims (not from request body). Note also `/admin/crm` is intentionally opened to `staff` role — confirm the CRM API endpoints expect that.

### M-2. Dead link: Onboarding modal sends staff to `/staff/timesheet` (route doesn't exist)
**File:** `src/components/OnboardingModal.jsx` (~line 118)

`<Link to="/staff/timesheet">` — the real route is `/timesheet` (`App.jsx`). New staff finishing onboarding land on a blank/no-match screen (Routes has no catch-all, so they get an empty page). **Fix:** change to `/timesheet`; consider adding a `*` catch-all route redirecting to `/`.

### M-3. Hardcoded burn-rate multiplier duplicates immutable DB-managed rates
**File:** `src/pages/admin/StaffPlans.jsx` (~line 1505)

```js
const BURN_MULTIPLIER = 1.451 * 1.317;
```

Fringe (1.451?) and F&A (1.317?) factors are hardcoded into the burn-down visualization while the rest of the app treats `fringe_rates` as DB-driven and immutable. When rates change fiscal years, this chart silently reports wrong projections. **Fix:** fetch effective rates from the API (`/api/fringe-rates` or the budget endpoints) and compute the multiplier; at minimum hoist to a named constant with the FY and source documented.

### M-4. `StaffPlans.jsx` is 2,011 lines / 5 tabs / 13+ components in one file
**File:** `src/pages/admin/StaffPlans.jsx`

It contains its own duplicate `Modal`, `Field`, `ChevronIcon`, date/dollar formatters (duplicating `components/Modal.jsx` and `dateUtils.js`), plus a `parseCSV` helper that is **never called** (dead code). `ProjectDetail.jsx` (876 lines) and `ProgramGantt.jsx` (754) are also oversized. **Fix:** split tabs into `src/pages/admin/staff-plans/{GrantBalances,Appointments,PlanBuilder,SavedPlans,Visualizations}.jsx`, reuse shared Modal/format helpers, delete `parseCSV`.

### M-5. App-wide absence of memoization with chart/table-heavy renders
**Files:** all pages except `Runway.jsx`

Only `Runway.jsx` uses `useMemo`; `React.memo` is used nowhere. Pages rebuild sort/group/aggregate data structures on every render — e.g., `Equity.jsx` re-sorts the full analysis and rebuilds scatter groupings per keystroke of modal state; `StaffPlans` rebuilds `byUser`/`byAccount` groupings and 24-month burn-down series (O(grants × months × rows)) on any state change including tooltip hover (`AllocationTimeline` re-renders the whole timeline on every `onMouseEnter` because tooltip state lives at timeline scope); `Dashboard`, `Reports`, `ProjectDetail` similar. With current data sizes (~30 staff) this is tolerable; it will degrade as data grows. **Fix:** memoize derived data (`useMemo` keyed on source arrays), move hover/tooltip state into leaf components, `React.memo` chart wrappers.

### M-6. Missing React keys on fragments in period grouping
**File:** `src/pages/admin/StaffPlans.jsx` (~line 1084, `StaffView`)

`periods.map(...)` returns a bare `<>...</>` containing a keyed `<tr>` plus rows — the fragment itself has no key (must be `<Fragment key={...}>`). Produces console warnings and risks misreconciliation when periods change after recalculate. Same pattern appears 3× in the file. Additionally 17 instances of `key={i}`/`key={index}` across pages on dynamic lists.

### M-7. Modal accessibility: no Escape key, no focus trap, no ARIA roles
**Files:** `src/components/Modal.jsx`, plus the duplicate modal in `StaffPlans.jsx` and `OnboardingModal.jsx`

None of the three modal implementations handle `Escape`, trap focus, restore focus on close, or set `role="dialog"` / `aria-modal="true"` / labelled-by. For a daily-use internal tool this is a real keyboard-usability gap. **Fix:** consolidate on one Modal; add `keydown` Escape handler, `role="dialog" aria-modal="true" aria-labelledby`, and basic focus management (or adopt `@headlessui/react` Dialog, which is light).

### M-8. Dead/stub code shipped to production
- `StaffPlans.jsx` ~1445: `updateStatus()` — body is a comment block + `addToast('Status update coming soon', 'info')`; the catch is unreachable. Saved Plans status can never be changed (no Activate/Archive UI works).
- `StaffPlans.jsx` end: `parseCSV()` unused.
- `Staff.jsx` ~“Edit modal”: empty `<div className="grid grid-cols-2 gap-4" style={{display:'none'}}></div>`.
- `Import.jsx`: `weeks` pre-flight `fetch` ignores `res.ok` (failure silently proceeds).

### M-9. PRIDE bookmarklet stores a long-lived sync token in third-party-site localStorage
**File:** `public/pride-bookmarklet.js`

The token is prompted once and persisted in `localStorage` on `pride.prairie.illinois.edu`, where any XSS on that (legacy PHP) site can exfiltrate it and push forged staff-plan data to `champ-pm.app/api/pride/sync`. **Fix:** make the sync token short-lived/rotating server-side, scope it to read-only ingestion with validation, and consider keying it per-user so it can be revoked.

---

## LOW

### L-1. Waterfall fetch in `Staff.jsx` detail modal
`openDetail()` fetches `/api/equity/current` (the entire org's equity analysis incl. all salaries) and `/api/salary-adjustments` (all adjustments) just to client-side filter for one user, then serially kicks off the cost fetch. Prefer per-user endpoints (`/api/equity/staff/:id`) or at least reuse already-loaded data.

### L-2. Inconsistent API access patterns
`Reports.jsx` (`downloadCsv`) and `Import.jsx` (`runImport`) bypass `useApi` with raw `fetch` + manual `getToken()`. Justified for blob/batch cases, but error handling diverges (no JSON content-type guard, one call unchecked). Add `getBlob`/`postRaw` helpers to `useApi` instead.

### L-3. `useApi` has no caching/deduplication; shared lookups re-fetched per page
Every navigation refetches `/api/staff`, `/api/grants`, `/api/projects`, etc. Fine at current scale, but staff/grants lookup lists are fetched by at least 8 pages. A tiny SWR-style cache (or React Query) would cut chatter and make loading states consistent.

### L-4. `window.confirm`/`prompt` used for destructive confirmations (18 sites)
Includes production-destructive actions like "Clear ALL imported appointments". Inconsistent with the app's Modal pattern, not styleable, blocked by some browsers in iframes. Migrate destructive confirmations to a shared `<ConfirmModal>` with explicit typed confirmation for bulk deletes.

### L-5. Toast `id` collision-prone and not screen-reader announced
`useToast.jsx` uses `Date.now() + Math.random()` (fine in practice) but the container lacks `role="status"`/`aria-live="polite"`, so errors are invisible to screen readers.

### L-6. `RoleRedirect` treats unknown roles as staff; `hourly` role exists in Staff form but has no route mapping
`Staff.jsx` allows assigning role `hourly`, while `ProtectedRoute` allowlists only `['admin','staff']` — an `hourly` user is redirected to `/timesheet` whose route guard then rejects them (`allowedRoles` doesn't include `hourly`), bouncing them in a redirect loop between `/` and `/timesheet`. Verify or add `hourly` to the shared-route allowlist.

### L-7. Timezone-fragile date math scattered across files
Several modules hand-roll date arithmetic with mixed UTC/local semantics: `StaffPlans` `popUrgency`/`addMonths`/`monthsBetweenDates` (local), `GanttChart` (UTC), `Import.jsx` `weekStart` (UTC), `dateUtils.js` (date-fns, local). String compares like `phaseForm.end_date > popDate` work for ISO strings but `new Date(dateStr)` without `T12:00:00` shifts a day in US timezones (some call sites guard this, e.g. `RunwayCard`, others don't, e.g. `popUrgency`). Consolidate on `dateUtils.js`.

### L-8. `QuarterlyReports.jsx`: `currentFiscalYear()` uses Oct cutoff while `quarterDateRange` is documented as calendar-year quarters
The FY+1 label combined with calendar-quarter ranges is confusing at minimum; verify Q1 FY2027 means Jan–Mar 2027 as coded.

---

## INFO

1. **No XSS sinks found.** Zero `dangerouslySetInnerHTML`, no `innerHTML`, no `eval`, no user-controlled URLs in `href` except mailto links. External link on LandingPage correctly uses `rel="noopener noreferrer"`. React escaping covers all user data rendering. 👍
2. **No secrets in frontend.** Only `VITE_CLERK_PUBLISHABLE_KEY` (publishable by design) is referenced; `.env` is git-ignored; no API keys/tokens hardcoded. `useApi` keeps Clerk tokens in memory per-request (no localStorage persistence). 👍
3. **`javascript-lp-solver`** sits in `dependencies` but is only imported by `functions/` (Pages Functions). Harmless (Vite tree-shakes by entry), but documents itself wrongly; consider a comment or moving Workers-only deps into a separate group.
4. **Tailwind purge is configured correctly** (`content: ['./index.html','./src/**/*.{js,jsx}']`).
5. **`onDone` race in AppLayout onboarding:** the localStorage fallback key means a user who clears storage but has `onboarded_at` set is fine; logic is sound, but `api.post('/api/staff/me')` doubling as "mark onboarded" is non-obvious — consider a dedicated `/api/staff/me/onboarded` endpoint.

---

## Things Done Well

- **Clean, consistent `useApi` hook** — single fetch wrapper, JSON guard against Cloudflare HTML error pages, stable callbacks via `useCallback`, token fetched fresh per request (no client persistence).
- **No XSS surface** — disciplined avoidance of raw HTML across ~12k lines of JSX.
- **ProtectedRoute + route grouping in App.jsx** is tidy and readable; role-based nav in AppLayout matches route guards.
- **Optimistic updates with revert-on-error** in ProjectDetail schedule editing (`handlePhaseChange`/`handleMilestoneChange`) — a genuinely good pattern, correctly reloading on failure.
- **Parallel fetching with `Promise.all`** is the norm (Dashboard, Staff, ProjectDetail, staff Timesheet) — very few waterfall fetches.
- **Loading and empty states everywhere** — `PageLoader`, `EmptyState`, per-section spinners; almost no page lacks them.
- **Import.jsx CSV pipeline** is thoughtful: encoding fallback (windows-1252→utf-8), format auto-detect, batching (400/req), progress UI, idempotent duplicate-skip messaging.
- **Toast system** is small, correct, and consistently used for error surfacing.
- **PoP guardrails** duplicated in both form validation and submit handlers for phases/milestones (defense in depth at the UX layer).
- **`dateUtils.js`** is a clean date-fns wrapper (when it's actually used).

---

## Recommended Priority Order

1. **C-2 / H-1** — remove PII from bundle, kill public source maps, redeploy (same PR).
2. **C-1** — one-line `api.del` fix.
3. **H-3** — bump xlsx via SheetJS CDN.
4. **H-4** — add `_headers`.
5. **M-2 / L-6** — fix onboarding link + `hourly` role loop.
6. **H-2** — route-level code splitting.
7. **H-5** — ESLint in CI, then burn down hook-deps warnings.
8. **M-1** — backend RBAC verification audit (separate task, touches `functions/`).
