export default function LandingPage() {
  const features = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: 'Grant & Budget Tracking',
      description:
        'Track FEMA grant budgets, period of performance dates, and burndown in one place. All cost calculations use standard government accounting formulas — salary, fringe, and F&A — applied consistently across every grant.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Timesheets & Staff Plans',
      description:
        'Staff enter hours by project and task. The system calculates loaded costs against grant budgets. AI-assisted staff planning translates natural-language goals into optimized allocation across the grant portfolio.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      title: 'Project Scheduling',
      description:
        'Gantt chart scheduling with period-of-performance constraints. Structured templates for FEMA data development and mapping projects. Sandboxed what-if scenarios let you explore schedule changes without touching the base plan.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: 'Equity & Salary Analysis',
      description:
        'Analyze staff pay equity against classification bands. Track salary history as an append-only record. Promotions tracking with scoring criteria. Salary records integrate directly into budget and runway projections.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: 'Program Runway',
      description:
        'See how far current grant funding extends under different staffing scenarios. Budget burndown tracks actual vs. projected spend. Alerts surface grants approaching their period of performance end with insufficient budget consumed.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
      title: 'Data Import & Sync',
      description:
        'CSV import for legacy timesheet history with configurable staff and project mappings. Bookmarklet-based sync with PRIDE (Illinois NCSA staff plan system) auto-inserts updated salary records when the institutional HR system shows a change.',
    },
  ];

  const milestones = [
    {
      label: 'AI-Assisted Staff Planning',
      date: 'May 2026',
      desc: 'Natural-language goals translated by Claude into LP constraint overrides — urgency multipliers, per-person grant caps, floors, and exclusions — then fed into the optimizer.',
    },
    {
      label: 'PRIDE Salary Sync',
      date: 'May 2026',
      desc: 'Bookmarklet runs in the authenticated PRIDE browser session and POSTs current salary data to CHAMP PM. Auto-inserts new salary records when PRIDE shows a change.',
    },
    {
      label: 'Gantt Scheduling + What-If',
      date: 'April 2026',
      desc: 'SVG Gantt with drag-to-edit in what-if mode. Phase and milestone templates for FEMA data development and mapping project types. Sandboxed scenarios never touch the base schedule.',
    },
    {
      label: 'Full Account String Refactor',
      date: 'April 2026',
      desc: 'Corrected a structural issue where fund numbers — not unique — were being used as grant identifiers. All joins and matching now use the canonical full account string throughout.',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        {/* Logo mark */}
        <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600 shadow-lg">
          <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 tracking-tight sm:text-5xl">
          CHAMP <span className="text-brand-600">PM</span>
        </h1>

        <p className="mt-4 text-lg text-brand-700 font-medium max-w-xl">
          Internal Program Management for CHAMP &mdash; Illinois State Water Survey
        </p>

        <p className="mt-4 text-base text-gray-500 max-w-2xl">
          A purpose-built tool for the CHAMP section to track FEMA grant budgets, manage
          timesheets, plan staff allocations, and schedule project work across a ~$15M grant
          portfolio. All cost calculations use standard government accounting formulas.
          No AI is involved in data processing or financial calculations &mdash; the software
          was built using AI-assisted development tools, but runs entirely on conventional,
          deterministic logic.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://accounts.champ-pm.app/sign-in"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-brand-600 text-white text-sm font-semibold shadow hover:bg-brand-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Sign In
          </a>
          <a
            href="https://reepworks.com/champ-pm"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white text-gray-700 text-sm font-semibold border border-gray-300 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            About This Tool
          </a>
        </div>
      </main>

      {/* Features */}
      <section className="bg-white border-t border-gray-200 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-sm font-semibold text-gray-400 uppercase tracking-widest mb-10">
            What the tool does
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="flex flex-col items-start gap-3">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 text-brand-600">
                  {f.icon}
                </div>
                <h3 className="text-sm font-semibold text-gray-900">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Milestones */}
      <section className="bg-gray-50 border-t border-gray-200 py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-sm font-semibold text-gray-400 uppercase tracking-widest mb-10">
            Recently shipped
          </h2>
          <div className="space-y-6">
            {milestones.map((m) => (
              <div key={m.label} className="flex gap-4">
                <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-brand-500" />
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-gray-900">{m.label}</span>
                    <span className="text-xs text-gray-400">{m.date}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500 leading-relaxed">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stack note */}
      <section className="bg-white border-t border-gray-200 py-10 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs text-gray-400">
            Built on <span className="font-medium text-gray-500">Vite + React + Tailwind</span> &middot;{' '}
            <span className="font-medium text-gray-500">Cloudflare Pages + Functions</span> &middot;{' '}
            <span className="font-medium text-gray-500">D1 (SQLite)</span> &middot;{' '}
            <span className="font-medium text-gray-500">Clerk Auth</span> &middot;{' '}
            auto-deploys on push to main
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-6 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Illinois State Water Survey &mdash; CHAMP Section &middot;{' '}
        <a href="https://reepworks.com" className="hover:text-gray-600 transition-colors">Reep Works LLC</a>
      </footer>
    </div>
  );
}
