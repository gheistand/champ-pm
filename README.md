# CHAMP PM

Program management tool for the Illinois State Water Survey CHAMP section.

## Features
- **Phase 1:** Staff management, grant/project/task hierarchy, daily timesheets, workload visualization
- **Phase 2:** Salary tracking, loaded cost calculation, budget burndown (coming soon)
- **Phase 3:** Equity analysis, promotion readiness scoring (coming soon)

## Tech Stack
- React 18 + Vite + Tailwind CSS
- Clerk (authentication)
- Cloudflare Pages + Pages Functions
- Cloudflare D1 (SQLite)

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create D1 database
```bash
npx wrangler d1 create champ-pm
# Copy the database_id into wrangler.toml
```

### 3. Run migrations
```bash
npx wrangler d1 execute champ-pm --file=migrations/0001_init.sql
```

### 4. Configure Clerk
- Create app at clerk.com
- Copy publishable key into wrangler.toml `CLERK_PUBLISHABLE_KEY`
- Set secret: `npx wrangler pages secret put CLERK_SECRET_KEY`
- Set admin user's `publicMetadata.role = "admin"` in Clerk dashboard

### 5. Update wrangler.toml
- Replace `REPLACE_AFTER_CREATION` with your D1 database_id
- Replace `REPLACE_WITH_CLERK_KEY` with your Clerk publishable key

### 6. Local development
```bash
npx wrangler pages dev -- npm run dev
```

### 7. Deploy
```bash
npm run build
npx wrangler pages deploy dist
```

## See Also
- `PHASE1.md` — Full Phase 1 specification for Claude Code
- `PHASE2.md` — Phase 2 specification
- `PHASE3.md` — Phase 3 specification
