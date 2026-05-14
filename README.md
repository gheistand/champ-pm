# CHAMP PM

Program management tool for the Illinois State Water Survey CHAMP section.

## Features

- **Staff & Salary** — staff roster, append-only salary history, fringe rates, equity analysis
- **Grants & Projects** — FEMA grant hierarchy (grants → projects → tasks), F&A rate management
- **Timesheets** — daily time entry, weekly approval workflow, admin oversight
- **Budget & Burndown** — loaded cost projections, remaining balance tracking, runway analysis
- **Staff Plans** — linear-programming scenario optimizer for salary appointments; exports for PRIDE entry
  - **AI-Assisted Goals** — plain-English optimization goals translated to LP constraints via Claude (Haiku)
- **Schedule** — per-project Gantt charts, phase/milestone management, what-if scenarios, program-level view
- **PRIDE Sync** — browser bookmarklet that syncs salaries & end dates from PRIDE's staffplan.php into CHAMP-PM
- **Import** — CSV timesheet import with project/staff name mapping
- **Reports** — timesheet reports with loaded cost breakdown, Excel export
- **Equity Dashboard** — band classification, salary equity analysis
- **CRM** — contact management for FEMA/ISWS stakeholders

## Tech Stack

- React 18 + Vite + Tailwind CSS
- Clerk (authentication — admin/staff roles)
- Cloudflare Pages + Pages Functions (API)
- Cloudflare D1 (SQLite database)
- Recharts (workload visualization)

---

## Initial Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create D1 database (first time only)

```bash
npx wrangler d1 create champ-pm
# Copy the database_id output into wrangler.toml → database_id
```

### 3. Run migrations

```bash
# Local dev:
npx wrangler d1 execute champ-pm --file=migrations/0001_init.sql --local
# Production:
npx wrangler d1 execute champ-pm --file=migrations/0001_init.sql --remote
```

### 4. Configure optional secrets

```bash
# AI-Assisted Goals in Staff Plans (requires Anthropic API key)
npx wrangler pages secret put ANTHROPIC_API_KEY --project-name champ-pm

# PRIDE salary sync bookmarklet
npx wrangler pages secret put PRIDE_SYNC_TOKEN --project-name champ-pm
```

See `public/pride-bookmarklet.js` for the PRIDE sync setup instructions.

### 5. Configure Clerk

1. Create a Clerk application at [clerk.com](https://clerk.com)
2. Enable **Email/Password** sign-in
3. Copy the **Publishable Key** into:
   - `wrangler.toml` → `CLERK_PUBLISHABLE_KEY`
   - `.env` → `VITE_CLERK_PUBLISHABLE_KEY`
4. Set the **Secret Key**:
   ```bash
   npx wrangler pages secret put CLERK_SECRET_KEY
   ```
5. In the Clerk Dashboard, set your admin user's **Public Metadata**:
   ```json
   { "role": "admin" }
   ```
   All other users default to `role: "staff"`.

### 5. Environment file

Create or update `.env`:
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

---

## Development

```bash
npm run pages:dev
```

Visit http://localhost:8788

---

## Deployment

```bash
npm run pages:deploy
```

**Set in Cloudflare Pages dashboard (Settings → Environment Variables):**
- `CLERK_PUBLISHABLE_KEY` — used by backend functions at runtime
- `CLERK_SECRET_KEY` — secret, set via `wrangler pages secret put`
- `VITE_CLERK_PUBLISHABLE_KEY` — used at build time for the frontend

---

## Project Structure

```
champ-pm/
  src/
    components/       Shared UI (Modal, Badge, AppLayout, ProtectedRoute…)
    pages/
      admin/          Dashboard, Staff, Grants, Projects, Tasks,
                      Assignments, Workload, Timesheets
      staff/          Timesheet, MyAssignments, MyProfile
    hooks/            useApi, useToast
    utils/            dateUtils
  functions/
    _middleware.js    Clerk JWT verification for all API routes
    _utils.js         Shared JSON response helpers
    api/              Route handlers:
      staff/          GET /api/staff, POST, PUT /:id, GET /me
      grants/         GET /api/grants, POST, GET /:id, PUT /:id
      projects/       GET /api/projects, POST, GET /:id, PUT /:id
      tasks/          GET /api/tasks, POST, PUT /:id, GET /my
      assignments/    GET /api/assignments, POST, PUT /:id, DELETE /:id
                      GET /workload
      timesheets/     GET/POST /api/timesheets, DELETE /:id
                      POST /submit, GET /weeks
                      POST /weeks/:id/approve, POST /weeks/:id/reject
  migrations/
    0001_init.sql     Database schema (users, grants, projects, tasks,
                      assignments, timesheet_entries, timesheet_weeks)
  wrangler.toml       Cloudflare Pages + D1 config
  .env                Frontend env vars (VITE_CLERK_PUBLISHABLE_KEY)
```

---

## Role System

Roles are stored in Clerk's `publicMetadata.role`:

| Role    | Access |
|---------|--------|
| `admin` | Full access: staff mgmt, grants, projects, tasks, assignments, workload, timesheet approvals — plus own timesheet |
| `staff` | My Timesheet, My Assignments, My Profile |

---

## Adding Staff

1. Have the staff member sign in at least once (creates their Clerk account)
2. Find their **Clerk User ID** in Clerk Dashboard → Users (format: `user_2abc...`)
3. In CHAMP PM → Admin → Staff → **Add Staff**
4. Enter their Clerk User ID, name, email, role, and other details

---

## Workflow

1. **Admin** creates grants → projects → tasks
2. **Admin** assigns staff to tasks (with allocated hours)
3. **Staff** logs daily hours against their assigned tasks each week
4. **Staff** submits week for approval
5. **Admin** reviews and approves or rejects with notes
6. **Admin** views workload chart to see hours by staff member

---

## See Also

- `PHASE1.md` — Full Phase 1 specification
- `PHASE2.md` — Phase 2 specification (salary tracking)
- `PHASE3.md` — Phase 3 specification (equity analysis)
