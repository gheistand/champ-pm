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
        'Staff enter hours by project and task. The system calculates loaded costs and tracks them against grant budgets using the same formulas used in quarterly FEMA reporting. Staff planning tools project salary costs against remaining grant balances.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: 'Equity & Scheduling',
      description:
        'Analyze staff pay equity against classification bands. Track project schedules with Gantt charts and period-of-performance constraints. All calculations are deterministic — the same inputs always produce the same outputs.',
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
          timesheets, plan staff allocations, and schedule project work. All calculations
          use standard government accounting formulas. No AI is involved in data processing
          or calculations &mdash; the software was built using AI-assisted development tools,
          but runs entirely on conventional, deterministic logic.
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
            href="mailto:gheistand@aol.com?subject=CHAMP%20PM%20Access%20Request"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white text-gray-700 text-sm font-semibold border border-gray-300 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Request Access
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

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-6 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Illinois State Water Survey &mdash; CHAMP Section
      </footer>
    </div>
  );
}
