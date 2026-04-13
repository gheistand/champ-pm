/**
 * CostViews.jsx — Two Cost Views: Timesheet Burndown vs. Grant Salary Allocation
 * Technical Reference section of CHAMP-PM Documentation
 */

export default function CostViews() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Two Cost Views</h1>
      <p className="text-sm text-gray-400 mb-8">Technical Reference · Last reviewed: April 2026</p>

      {/* Overview */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-3 pb-1 border-b border-gray-200">Overview</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          CHAMP-PM tracks two distinct but related views of grant costs. Understanding the
          difference between them is essential for interpreting budget reports correctly.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="font-semibold text-blue-900 mb-2">View 1: Grant Salary Allocation</h3>
            <p className="text-sm text-blue-800 leading-relaxed">
              How each employee's salary cost is distributed across grants based on their
              formal appointment percentages. This is the authoritative cost accounting record.
              It covers 100% of every employee's time.
            </p>
          </div>
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
            <h3 className="font-semibold text-teal-900 mb-2">View 2: Timesheet Burndown</h3>
            <p className="text-sm text-teal-800 leading-relaxed">
              How employees actually logged their time — broken down by project, task, and
              activity type (production vs. overhead). This is an internal management tool
              for workload visibility, not a cost accounting record.
            </p>
          </div>
        </div>
      </section>

      {/* Grant Salary Allocation */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-3 pb-1 border-b border-gray-200">
          View 1: Grant Salary Allocation
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Each CHAMP staff member's salary is covered by one or more grants. Their total
          appointment across all grants adds up to 100% — meaning every dollar of every
          salary is accounted for by some funding source at all times.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4">
          This allocation covers the employee's <strong>full cost</strong>, including both
          the time they spend on direct project work and the time they spend on overhead
          activities like annual leave, sick leave, professional development, and administrative duties.
          The grant pays for the whole person, not just the hours they spend on deliverables.
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">Example</h4>
          <p className="text-sm text-gray-700 mb-2">
            A staff member is appointed 70% to Grant A (DHS EMC-2024) and 30% to Grant B (GRF).
            Their full annual salary and fringe are split 70/30 across those grants — regardless
            of how their actual hours are distributed in any given week.
          </p>
          <p className="text-sm text-gray-600 italic">
            In this system: the Salary &amp; Staff Plans tools reflect this cost view.
            The Runway calculator also operates on this basis (see below).
          </p>
        </div>

        <h3 className="font-medium text-gray-800 mb-2">Where this appears in CHAMP-PM</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
          <li><strong>Staff Plans</strong> — scenario projections of salary costs against grant balances using appointment percentages</li>
          <li><strong>Runway Calculator</strong> — total program burn rate based on full staff salaries (see below)</li>
          <li><strong>Salary records</strong> — the source of salary and fringe rate data used in cost calculations</li>
        </ul>
      </section>

      {/* Timesheet Burndown */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-3 pb-1 border-b border-gray-200">
          View 2: Timesheet Burndown
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          When staff submit timesheets, they log hours against specific tasks within specific
          projects and grants. This includes both production tasks (actual deliverable work)
          and overhead tasks (leave, admin, PD, etc.).
        </p>
        <p className="text-gray-700 leading-relaxed mb-4">
          The timesheet cost report calculates a cost for each logged entry using the loaded rate formula
          (salary ÷ 2,080 × (1 + fringe)) multiplied by hours logged, plus F&A. This gives
          project managers visibility into where effort is going across the portfolio.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-amber-800 mb-2 text-sm">⚠️ Important: This is not the same as the salary allocation</h4>
          <p className="text-sm text-amber-800 leading-relaxed">
            The timesheet burndown shows <em>where time was logged</em>, not the formal
            cost accounting split. A staff member's hours logged to a grant's tasks may not
            match the exact dollar amount being charged to that grant by payroll. Both
            measures are useful but answer different questions.
          </p>
        </div>

        <h3 className="font-medium text-gray-800 mb-2">Overhead time entries</h3>
        <p className="text-gray-700 leading-relaxed mb-4">
          Overhead time entries (Annual Leave, Sick Leave, CHAMP Admin, PD, etc.) are logged
          under the "OVERHEAD" placeholder in CHAMP-PM. These entries exist purely for
          internal workload tracking — they allow management to see the split between
          productive project time and overhead time. They do not affect any grant's budget
          balance, because the grant salary allocation already covers the full cost of the employee.
        </p>

        <h3 className="font-medium text-gray-800 mb-2">Where this appears in CHAMP-PM</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
          <li><strong>Timesheet Report</strong> — cost breakdown by grant, project, and staff based on hours logged</li>
          <li><strong>Budget &amp; Burndown</strong> — visual representation of grant budget consumption from logged hours</li>
          <li><strong>Dashboard</strong> — recent activity and hours summary (overhead excluded from grant charts)</li>
        </ul>
      </section>

      {/* Runway */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-3 pb-1 border-b border-gray-200">
          The Runway Calculator: A Special Case
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          The Runway calculator answers the question: <em>"Given current grant balances,
          how long can the program sustain its current staffing level?"</em>
        </p>
        <p className="text-gray-700 leading-relaxed mb-4">
          Runway operates on <strong>View 1 logic</strong> (salary allocation), not timesheet hours.
          It uses manually entered grant balance snapshots and applies the full annual cost of
          all selected staff — salary + fringe + F&amp;A — to project how long balances will last.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 font-mono text-sm">
          <p className="font-semibold text-gray-700 mb-2">Runway Formulas</p>
          <p className="text-gray-700">Annual staff cost = Σ [ salary × (1 + fringe) × (1 + weighted F&A) ]</p>
          <p className="text-gray-700 mt-1">Monthly burn rate = Annual staff cost ÷ 12</p>
          <p className="text-gray-700 mt-1">Runway (months) = Total grant balances ÷ Monthly burn rate</p>
          <p className="text-gray-500 mt-2 text-xs">
            Weighted F&A = weighted average of F&A rates across included grants, weighted by grant balance.
            Defaults to 31.7% if no balances are entered.
          </p>
        </div>

        <h3 className="font-medium text-gray-800 mb-2">Key characteristics</h3>
        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
          <li>
            <strong>Grant balances are manually entered</strong> — an administrator enters
            the current remaining balance for each grant at a point in time. These snapshots
            are stored and used to build the historical trend chart.
          </li>
          <li>
            <strong>Not tied to specific allocations</strong> — Runway does not use the
            individual appointment percentages per grant. It assumes all selected staff are
            collectively funded by the selected grants in aggregate.
          </li>
          <li>
            <strong>Staff can be excluded</strong> — any staff member can be removed from
            the calculation (e.g., staff paid by external grants not in the balance pool).
          </li>
          <li>
            <strong>Grants can be excluded</strong> — GRF, indirect cost recovery, and trust
            fund grants are excluded by default since they are not the primary program funding pool.
          </li>
          <li>
            <strong>Purpose is program-level planning</strong> — Runway gives leadership a
            high-level answer to funding sustainability, not a precise per-grant cost accounting.
          </li>
        </ul>
      </section>

      {/* Summary table */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-3 pb-1 border-b border-gray-200">
          Summary: Which Tool Answers Which Question
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-3 border border-gray-200">Question</th>
                <th className="text-left p-3 border border-gray-200">Use This Tool</th>
                <th className="text-left p-3 border border-gray-200">Cost View</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['How long will our grants last at current staffing?', 'Runway Calculator', 'Salary allocation (View 1)'],
                ['What is the projected cost of a staffing scenario?', 'Staff Plans', 'Salary allocation (View 1)'],
                ['How much budget has been consumed on a grant this period?', 'Budget & Burndown', 'Timesheet hours (View 2)'],
                ['What did each staff member cost on each project?', 'Timesheet Report', 'Timesheet hours (View 2)'],
                ['How is staff time split between production and overhead?', 'Timesheet Report (all grants)', 'Timesheet hours (View 2)'],
                ['Is staff pay equitable relative to classification bands?', 'Equity Dashboard', 'Salary records (View 1)'],
              ].map(([q, tool, view]) => (
                <tr key={q} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 border border-gray-200 text-gray-700">{q}</td>
                  <td className="p-3 border border-gray-200 font-medium text-blue-700">{tool}</td>
                  <td className="p-3 border border-gray-200 text-gray-500 text-xs">{view}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
