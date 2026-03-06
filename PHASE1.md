# CHAMP Program Manager — Phase 1 Build Instructions

## Project Overview
Build a web-based program management tool called **CHAMP PM** for the Illinois State Water Survey (CHAMP section). It manages grants, projects, tasks, staff assignments, and daily timesheets.

**Stack:**
- Vite + React 18 + Tailwind CSS (frontend)
- Clerk (authentication, two roles: admin / staff)
- Cloudflare Pages Functions (API — all in `functions/api/`)
- Cloudflare D1 (SQLite database)
- Recharts (workload visualization charts)
- Deploy via Cloudflare Pages, build output: `dist/`

**Repo location:** `~/champ-pm/` on the Mac

---

## Phase 1 Scope
1. Auth (Clerk) with admin/staff roles
2. Admin: staff management, grant/project/task management, assignment management
3. Staff: daily timesheet entry against assigned tasks
4. Admin: timesheet approval workflow
5. Admin: workload visualization dashboard

---

## Project Setup

```
champ-pm/
  src/
    components/
    pages/
      admin/
      staff/
    hooks/
    utils/
  functions/
    api/
      staff/
      grants/
      projects/
      tasks/
      assignments/
      timesheets/
  migrations/
    0001_init.sql
  public/
  wrangler.toml
  package.json
  tailwind.config.js
  vite.config.js
```

### wrangler.toml
```toml
name = "champ-pm"
compatibility_date = "2024-01-01"
pages_build_output_dir = "dist"

[[d1_databases]]
binding = "DB"
database_name = "champ-pm"
database_id = "REPLACE_AFTER_CREATION"

[vars]
CLERK_PUBLISHABLE_KEY = "REPLACE_WITH_CLERK_KEY"
```

### package.json dependencies
```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "@clerk/clerk-react": "latest",
    "recharts": "^2",
    "date-fns": "^3",
    "clsx": "^2"
  },
  "devDependencies": {
    "vite": "^5",
    "@vitejs/plugin-react": "^4",
    "tailwindcss": "^3",
    "autoprefixer": "^10",
    "postcss": "^8"
  }
}
```

---

## D1 Database Schema — `migrations/0001_init.sql`

```sql
-- Staff / Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,              -- Clerk user ID
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff', -- 'admin' | 'staff' | 'hourly'
  title TEXT,
  classification TEXT,              -- e.g. "AP Level 3", "Academic Hourly"
  department TEXT DEFAULT 'CHAMP',
  start_date TEXT,                  -- ISO date YYYY-MM-DD
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Grants (top level)
CREATE TABLE IF NOT EXISTS grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  funder TEXT NOT NULL,             -- e.g. "FEMA", "IDOT"
  grant_number TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  total_budget REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'closed' | 'pending'
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Projects (belong to grants)
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grant_id INTEGER NOT NULL REFERENCES grants(id),
  name TEXT NOT NULL,
  description TEXT,
  start_date TEXT,
  end_date TEXT,
  budget REAL NOT NULL DEFAULT 0,
  estimated_hours REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'complete' | 'on_hold'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tasks (belong to projects)
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  name TEXT NOT NULL,
  description TEXT,
  start_date TEXT,
  end_date TEXT,
  budget REAL NOT NULL DEFAULT 0,
  estimated_hours REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'complete' | 'on_hold'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Assignments (staff assigned to tasks)
CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  allocated_hours REAL NOT NULL DEFAULT 0,  -- total hours budgeted for this person on this task
  allocated_pct REAL,                        -- optional FTE % allocation
  start_date TEXT,
  end_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, task_id)
);

-- Timesheet entries (daily)
CREATE TABLE IF NOT EXISTS timesheet_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  entry_date TEXT NOT NULL,          -- ISO date YYYY-MM-DD
  hours REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, task_id, entry_date)
);

-- Timesheet week submissions (approval tracking)
CREATE TABLE IF NOT EXISTS timesheet_weeks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  week_start TEXT NOT NULL,          -- Monday ISO date YYYY-MM-DD
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'submitted' | 'approved' | 'rejected'
  submitted_at TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  review_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, week_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_user_date ON timesheet_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_task ON timesheet_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_task ON assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_projects_grant ON projects(grant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
```

---

## Clerk Setup
- Create a Clerk application (or reuse existing account at clerk.com)
- Enable email/password sign-in
- Add a **public metadata** field `role` on each user (values: `admin` or `staff`)
- Glenn's account (gheistand@gmail.com or admin email) should have `role: admin`
- All other staff accounts have `role: staff`
- The frontend reads `user.publicMetadata.role` to determine access
- Set `CLERK_PUBLISHABLE_KEY` in wrangler.toml vars
- Set `CLERK_SECRET_KEY` as a Pages secret: `wrangler pages secret put CLERK_SECRET_KEY`

---

## Pages Functions API

All functions live in `functions/api/`. Each verifies the Clerk session JWT before responding.

Create a shared auth middleware: `functions/_middleware.js`
```js
// Verify Clerk JWT from Authorization header
// Attach userId and role to context.data
// Return 401 if missing/invalid
// Return 403 if role check fails
```

### API Routes

#### Staff
- `GET /api/staff` — admin only, list all active staff with name/title/role
- `POST /api/staff` — admin only, create/register a staff user (upsert by Clerk ID)
- `PUT /api/staff/:id` — admin only, update title/classification/start_date/active
- `GET /api/staff/me` — current user's own profile

#### Grants
- `GET /api/grants` — admin only, list all grants with totals
- `POST /api/grants` — admin only, create grant
- `PUT /api/grants/:id` — admin only, update grant
- `GET /api/grants/:id` — admin only, single grant with projects

#### Projects
- `GET /api/projects?grant_id=` — admin only
- `POST /api/projects` — admin only
- `PUT /api/projects/:id` — admin only
- `GET /api/projects/:id` — admin only, with tasks

#### Tasks
- `GET /api/tasks?project_id=` — admin only
- `POST /api/tasks` — admin only
- `PUT /api/tasks/:id` — admin only
- `GET /api/tasks/my` — staff: returns tasks assigned to current user (for timesheet)

#### Assignments
- `GET /api/assignments?user_id=&task_id=` — admin only
- `POST /api/assignments` — admin only, assign staff to task
- `PUT /api/assignments/:id` — admin only
- `DELETE /api/assignments/:id` — admin only
- `GET /api/assignments/workload?week=YYYY-MM-DD` — admin only, returns all staff hours for week (for workload dashboard)

#### Timesheets
- `GET /api/timesheets?week=YYYY-MM-DD` — staff: own entries for week; admin: all staff entries
- `POST /api/timesheets` — staff: upsert entry (user_id, task_id, date, hours, notes)
- `DELETE /api/timesheets/:id` — staff: delete own draft entry
- `POST /api/timesheets/submit?week=YYYY-MM-DD` — staff: submit week for approval
- `GET /api/timesheets/weeks` — staff: own submission history; admin: all pending weeks
- `POST /api/timesheets/weeks/:id/approve` — admin only
- `POST /api/timesheets/weeks/:id/reject` — admin only (with notes)

---

## Frontend Pages & Components

### Layout
- `AppLayout` — shared nav sidebar, top bar with user avatar/name, Clerk sign-out
- Sidebar shows different nav items based on role (admin vs staff)
- Mobile-responsive (Tailwind)

### Auth
- Clerk `<SignIn>` page at `/sign-in`
- After login, redirect admin → `/admin/dashboard`, staff → `/timesheet`
- `<ProtectedRoute>` component checks role and redirects if unauthorized

### Admin Pages

#### `/admin/dashboard`
- Summary cards: total staff, active grants, projects, pending timesheet approvals
- Quick links to key sections

#### `/admin/staff`
- Table of all staff (name, title, classification, start date, active status)
- Add/edit staff form (modal)
- Shows each staff member's current assignments (task count, total allocated hours)

#### `/admin/grants`
- List of grants with status badge, date range, total budget, % spent (from timesheet hours — Phase 2 adds salary; Phase 1 can show hours logged vs estimated)
- Click-through to grant detail → shows projects

#### `/admin/projects`
- Filterable by grant
- List with budget, estimated hours, hours logged, status
- Click-through to project detail → shows tasks

#### `/admin/tasks`
- Filterable by project
- List with budget, estimated hours, hours logged, assigned staff names
- Assign staff to task (inline or modal): select staff, enter allocated hours

#### `/admin/assignments`
- Manage who is assigned to what
- Can reassign, remove, or adjust allocated hours

#### `/admin/workload`
- **This is the key visualization page**
- Week picker (default: current week)
- Stacked bar chart (Recharts): X axis = each staff member, Y axis = hours
  - Green bar = approved hours logged
  - Yellow bar = submitted hours logged
  - Blue bar = draft hours logged
  - Red line = 40-hour threshold
- Second view: Gantt-style table showing each staff member's active task assignments with allocated hours remaining
- Filters: by grant, by project

#### `/admin/timesheets`
- List of submitted weeks pending approval (staff name, week, total hours)
- Click to review: shows line items (date, task, hours, notes)
- Approve / Reject with optional notes

### Staff Pages

#### `/timesheet` (default staff landing)
- Week picker (Mon–Sun), default current week
- For each day Mon–Fri: list of user's assigned tasks with hour input boxes
- Running daily total and weekly total displayed
- Notes field per entry
- **Submit Week** button (locks entries and sends for approval)
- Shows status of each week (draft / submitted / approved / rejected)
- If rejected, shows reviewer notes and allows resubmit

#### `/my-assignments`
- Read-only list of tasks the current user is assigned to
- Shows project, grant, allocated hours, hours logged, hours remaining

#### `/my-profile`
- Name, title, classification, start date (read-only, admin-managed)

---

## UI/UX Notes
- Color scheme: professional blues and grays, green for approved/on-track, amber for warnings, red for over-budget or rejected
- Use Tailwind `@layer components` for reusable styles
- Modal dialogs for create/edit forms
- Toast notifications for save/submit/approve actions
- Empty states with helpful prompts (e.g., "No tasks assigned yet — contact your admin")
- Date handling: use `date-fns` for all date math (week start/end, formatting)
- All times stored as US Central but displayed in user's local timezone

---

## Build & Deploy Instructions (include in README.md)

```bash
# 1. Install dependencies
npm install

# 2. Create D1 database
npx wrangler d1 create champ-pm
# Paste the database_id into wrangler.toml

# 3. Run migrations
npx wrangler d1 execute champ-pm --file=migrations/0001_init.sql

# 4. Set secrets
npx wrangler pages secret put CLERK_SECRET_KEY

# 5. Local dev
npx wrangler pages dev -- npm run dev

# 6. Deploy
npm run build
npx wrangler pages deploy dist
```

---

## Completion Criteria
- [ ] All D1 migrations run without error
- [ ] Clerk auth works: sign in, redirect by role
- [ ] Admin can create grants → projects → tasks
- [ ] Admin can assign staff to tasks
- [ ] Staff can log daily hours against their assigned tasks
- [ ] Staff can submit a week; admin can approve or reject
- [ ] Workload bar chart renders correctly with real data
- [ ] All API routes return 401/403 for unauthorized requests
- [ ] README.md includes full setup and deploy instructions
