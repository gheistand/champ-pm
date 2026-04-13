function GuideHeader({ title, subtitle }) {
  return (
    <div className="mb-6">
      <div className="text-xs text-gray-400 mb-1">User Guide → {title}</div>
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
      <p className="text-xs text-gray-400 mt-2">Last reviewed: April 2026</p>
    </div>
  );
}

function GuideSection({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-base font-semibold text-gray-900 mb-2 pb-1 border-b border-gray-200">{title}</h3>
      <div className="text-sm text-gray-700 space-y-2">{children}</div>
    </div>
  );
}

function Steps({ items }) {
  return (
    <ol className="list-none space-y-2 mt-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
          <span className="text-sm text-gray-700">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Tips({ items }) {
  return (
    <ul className="space-y-1.5 mt-2">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2 text-sm text-gray-700">
          <span className="text-blue-500 shrink-0">→</span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function ColDef({ cols }) {
  return (
    <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden mt-2">
      <thead>
        <tr className="bg-gray-50">
          <th className="px-3 py-2 text-left font-medium text-gray-600 border-b border-gray-200">Column / Field</th>
          <th className="px-3 py-2 text-left font-medium text-gray-600 border-b border-gray-200">What it means</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {cols.map(([k, v], i) => (
          <tr key={i}>
            <td className="px-3 py-2 font-medium text-gray-800">{k}</td>
            <td className="px-3 py-2 text-gray-600">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function DashboardGuide() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <GuideHeader
        title="Dashboard"
        subtitle="A high-level overview of program health — grants, budget, and alerts at a glance."
      />

      <GuideSection title="What This Page Does">
        <p>
          The Dashboard is the first page you see after logging in as an Admin. It shows a real-time summary
          of program health: how many grants are active, how much budget has been consumed, which staff
          have pending timesheet submissions, and which grants are approaching expiration.
        </p>
        <p>
          It does not replace PRIDE or financial reporting — it is a quick situational awareness view that
          surfaces items that need your attention today.
        </p>
      </GuideSection>

      <GuideSection title="When to Use It">
        <p>
          Check the Dashboard at the start of each week. It is designed to answer: "Is anything on fire right
          now?" If all alert counts are zero and the budget bars look healthy, you can move on to other work.
          If alerts appear, use the links within each alert card to navigate directly to the affected record.
        </p>
      </GuideSection>

      <GuideSection title="Summary Metric Cards">
        <p>
          The top row of the Dashboard shows four summary cards. These update automatically as records change.
        </p>
        <ColDef
          cols={[
            ["Active Grants", "Count of grants with status = 'active' and an end date in the future. Grants that have ended but are still open in the system are excluded."],
            ["Total Budget vs Spent", "Sum of total_budget across all active grants (numerator) versus total approved loaded labor costs to date (denominator). Shown as a dollar amount and a percentage bar."],
            ["Pending Timesheets", "Count of staff members who have at least one week in 'submitted' status waiting for Admin approval. A high number here means bottlenecked payroll reconciliation."],
            ["Upcoming Expirations", "Count of grants whose end date falls within the next 90 days. Click the card to see a list of which grants are expiring and when."],
          ]}
        />
      </GuideSection>

      <GuideSection title="Alerts Section">
        <p>
          Below the summary cards is the Alerts panel. Alerts are grouped into three severity levels:
          Critical, Warning, and Info. Each alert includes a brief description and a link to the relevant
          record so you can act immediately.
        </p>
        <ColDef
          cols={[
            ["Critical", "Grants that have passed their end date but still have active staff appointments or open timesheets. These require immediate attention — charges against expired grants can cause compliance issues."],
            ["Warning — Expiring Soon", "Grants expiring within 90 days. Use this as a trigger to begin closeout planning or extension requests."],
            ["Warning — Missing Timesheets", "Staff who have not submitted a timesheet for the most recently closed week. 'Missing' means no timesheet record exists for that week — it is not the same as 'draft' (started but not submitted)."],
            ["Info — Budget Overrun", "Projects or grants where approved labor costs have exceeded the budgeted amount. Info-level only — does not block any actions — but signals the need to reallocate or request supplemental funding."],
            ["Info — Unassigned Staff", "Active staff members who have no task assignments on any active grant. This may indicate someone who recently joined and has not yet been assigned, or someone whose grant ended."],
          ]}
        />
      </GuideSection>

      <GuideSection title="How to Act on Alerts">
        <Steps
          items={[
            "Click any alert row to navigate directly to the affected grant, staff member, or timesheet.",
            "For Critical (expired grant) alerts: review whether any charges are still being posted and contact the grants coordinator to formally close the grant in PRIDE.",
            "For Warning (missing timesheet) alerts: contact the staff member directly and ask them to submit. You can also enter hours on their behalf using the Admin timesheet view.",
            "For Warning (expiring grant) alerts: open the grant record and verify whether a no-cost extension has been requested or approved. Update the end date if an extension is in effect.",
            "For Info (budget overrun) alerts: review the Budget & Burndown page for that grant to understand which tasks are over budget.",
            "For Info (unassigned staff) alerts: open the staff member's record and assign them to appropriate tasks, or deactivate them if they have left.",
          ]}
        />
      </GuideSection>

      <GuideSection title="What 'Missing Timesheet' Means">
        <p>
          A timesheet is considered "missing" when no record of any status (draft, submitted, approved, or
          rejected) exists for a staff member for the most recently completed Monday–Sunday week. A draft
          timesheet that exists but was never submitted does NOT count as missing — it appears in the
          Pending Timesheets count instead.
        </p>
        <Tips
          items={[
            "Staff on leave for a full week should still submit a timesheet with their leave hours (Annual Leave or Sick Leave overhead tasks).",
            "If a staff member started employment mid-week, no timesheet is expected for that partial week — the alert logic accounts for start_date.",
            "Admins can submit a timesheet on behalf of a staff member from the Timesheets admin view.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Tips & Common Questions">
        <Tips
          items={[
            "The Dashboard refreshes automatically when you navigate to it. There is no manual refresh button.",
            "Budget vs Spent only counts approved timesheets — submitted or draft timesheets do not affect this number.",
            "If the Active Grants count looks wrong, check that grants are set to status = 'active' in the Grants & Projects page.",
            "The 90-day expiration window is fixed and cannot be customized.",
            "Admins do not appear in the Missing Timesheets alert — only Staff and Hourly role users are tracked this way. Admins are expected to self-manage their timesheet submissions.",
          ]}
        />
      </GuideSection>

      <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
        <a href="/admin/docs/user-guide/dashboard" className="text-blue-600 underline">View full documentation →</a>
      </div>
    </div>
  );
}
