export default function LandingPage() {
  const features = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: 'Grant Portfolio Tracking',
      description:
        'Manage BRIC, HMA, and other FEMA mitigation grants in one place. Track budgets, obligations, drawdowns, and deadlines across your entire portfolio.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347a3.5 3.5 0 01-4.949 0l-.347-.347z" />
        </svg>
      ),
      title: 'AI Status Summaries',
      description:
        'Get instant, plain-language summaries of project health, budget runway, and task bottlenecks — surfaced automatically so you spend less time in spreadsheets.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: 'Team Workload Management',
      description:
        'Assign tasks across staff and contractors, track time by grant, and forecast capacity — so multi-stakeholder coordination stays on schedule.',
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
          AI-Assisted Project Management for FEMA Flood Mitigation Programs
        </p>

        <p className="mt-4 text-base text-gray-500 max-w-2xl">
          Built for government teams and grant managers who need to track BRIC/HMA projects,
          surface insights across complex portfolios, and coordinate multi-stakeholder programs
          — without the spreadsheet chaos.
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
            What's inside
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
