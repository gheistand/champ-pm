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

export default function BudgetGuide() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <GuideHeader
        title="Budget & Burndown"
        subtitle="Visualize grant budget consumption from approved timesheet labor costs."
      />

      <GuideSection title="What This Page Does">
        <p>
          The Budget & Burndown page shows how much of each grant's budget has been consumed by approved
          labor costs, and how that consumption has progressed over time. It gives program managers a
          quick read on whether spending is on track relative to the grant period.
        </p>
        <p>
          Important: this page shows labor costs only. It does not include travel, equipment, subcontracts,
          or any other non-labor expenditures. For a complete picture of grant spend, reconcile with PRIDE.
        </p>
      </GuideSection>

      <GuideSection title="When to Use It">
        <p>
          Review the Budget & Burndown page monthly (at minimum) and before any program officer check-in or
          quarterly report. Use it to answer: "Are we spending at the right pace to fully utilize this grant
          before it expires?" If a grant is severely under-spent with little time left, action is needed.
        </p>
      </GuideSection>

      <GuideSection title="What 'Loaded Rate' Means">
        <p>
          CHAMP-PM does not simply multiply hours by hourly salary. It applies a fully <em>loaded rate</em>,
          which stacks three cost components:
        </p>
        <ColDef
          cols={[
            ["Base Salary Cost", "Hours worked × (annual salary ÷ 2080 hours). Uses the salary record effective on the date of the timesheet entry."],
            ["Fringe Benefit Cost", "Base salary cost × fringe rate. The fringe rate is determined by the staff member's appointment_type and the effective date. For FY2026 Academic Professional (SURS-eligible) staff, this is 45.1%."],
            ["F&A (Indirect) Cost", "The sum of base + fringe multiplied by the grant's F&A rate. For FEMA/DHS grants, this is typically 31.7%."],
          ]}
        />
        <p className="mt-2">
          The formula is: <code className="bg-gray-100 px-1 rounded">Total Cost = (Base + Fringe) × (1 + F&A rate)</code>
        </p>
        <Tips
          items={[
            "The loaded rate is what the federal sponsor actually pays — it reflects the true cost of employing someone.",
            "If fringe rates change at the start of a new fiscal year, CHAMP-PM uses the correct rate for each timesheet entry date automatically.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Budget vs. Spent Bar Chart">
        <p>
          The bar chart at the top of the page shows one bar per active grant. Each bar has two segments:
        </p>
        <ColDef
          cols={[
            ["Budget (full bar length)", "The grant's total_budget as entered in the Grants & Projects page."],
            ["Spent (filled portion)", "Total approved loaded labor costs charged to this grant to date."],
            ["Remaining (unfilled portion)", "Budget minus spent. If the bar is nearly full, the grant is approaching its labor budget ceiling."],
            ["Percentage label", "Spent ÷ Budget, expressed as a percentage. Shown on the right side of each bar."],
          ]}
        />
        <Tips
          items={[
            "A bar over 100% (shown in red) means approved labor costs have exceeded the grant budget. This triggers an Info alert on the Dashboard.",
            "Click any bar to drill down to the project-level view for that grant.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Burndown Chart">
        <p>
          The burndown chart shows cumulative approved labor spend over time for a selected grant. The
          x-axis is calendar date and the y-axis is cumulative cost in dollars.
        </p>
        <Steps
          items={[
            "Select a grant from the dropdown above the chart.",
            "The line shows cumulative approved spend from the grant start date to today.",
            "A dashed reference line shows the ideal spend trajectory — a straight line from $0 at start_date to total_budget at end_date.",
            "If the actual line is below the reference line, you are spending slower than expected. If above, you are ahead of schedule.",
          ]}
        />
        <Tips
          items={[
            "A flat line on the burndown chart means no timesheets were approved during that period — check whether approvals are behind.",
            "A steep jump in the line usually corresponds to a batch of timesheets being approved at once.",
            "Switch to 'By Project' view to see the stacked burndown broken out by project within the grant.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Cost Breakdown Table Columns">
        <p>
          Below the charts, a detailed table shows cost by grant or by project depending on which view is
          selected. The columns are:
        </p>
        <ColDef
          cols={[
            ["Grant / Project", "The name of the grant or project. Click to expand to the next level of detail."],
            ["Approved Hours", "Total hours from approved timesheet entries charged to this grant or project."],
            ["Personnel Cost", "The base salary + fringe costs only (excludes F&A). Calculated as: hours × hourly rate × (1 + fringe rate)."],
            ["F&A Cost", "The indirect cost amount: Personnel Cost × F&A rate. This is what ISWS retains to cover overhead."],
            ["Total Cost", "Personnel Cost + F&A Cost. This is the fully loaded cost to the grant."],
            ["Budget", "The budgeted amount for this grant (grant-level view only). Not broken out by project because project-level budgets are not tracked separately."],
            ["Remaining", "Budget minus Total Cost. Shown at grant level only."],
          ]}
        />
      </GuideSection>

      <GuideSection title="Grant-Level vs. Project-Level View">
        <p>
          Use the toggle at the top of the table to switch between:
        </p>
        <ColDef
          cols={[
            ["Grant view", "One row per grant. Shows total cost and remaining budget. Best for overall program health monitoring."],
            ["Project view", "One row per project within a selected grant. Shows cost breakdown at the project level. Best for understanding which work streams are consuming budget."],
          ]}
        />
      </GuideSection>

      <GuideSection title="Why Numbers May Differ from PRIDE">
        <p>
          CHAMP-PM labor costs will often differ from PRIDE for several legitimate reasons:
        </p>
        <Tips
          items={[
            "CHAMP-PM only counts approved timesheets. If some weeks are still in 'submitted' status, they are not in CHAMP-PM yet but may already be posted in PRIDE.",
            "PRIDE includes all expenditure types (travel, equipment, subcontracts). CHAMP-PM is labor only.",
            "PRIDE uses payroll-posted dates. CHAMP-PM uses timesheet week dates. These can differ by a few days around pay periods.",
            "Fringe rate variations: PRIDE uses actual payroll-derived fringe, while CHAMP-PM uses the negotiated rate from the fringe rate table.",
            "Use PRIDE as the authoritative financial record. Use CHAMP-PM for trend analysis and planning.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Tips & Common Questions">
        <Tips
          items={[
            "The budget page does not auto-refresh. Navigate away and back to get the latest data after approving timesheets.",
            "If a grant's budget looks wrong, verify that total_budget in Grants & Projects is the full funded amount including F&A.",
            "You can export the cost breakdown table to CSV using the Export button — same format as the Reports page.",
            "Grant-level budget comparisons work best when all timesheets through the current date are approved.",
          ]}
        />
      </GuideSection>

      <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
        <a href="/admin/docs/user-guide/budget" className="text-blue-600 underline">View full documentation →</a>
      </div>
    </div>
  );
}
