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

export default function GrantsGuide() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <GuideHeader
        title="Grants & Projects"
        subtitle="Manage funding awards, project structure, and task assignments."
      />

      <GuideSection title="What This Page Does">
        <p>
          Grants & Projects is the structural backbone of CHAMP-PM. Every timesheet entry, budget calculation,
          and schedule item links back to a task, which links to a project, which links to a grant. Getting
          this hierarchy right is essential for accurate reporting.
        </p>
        <p>
          Grants represent top-level funding awards from sponsors such as FEMA, DHS, or the State of Illinois
          (GRF). Each grant contains one or more projects, and each project contains one or more tasks.
        </p>
      </GuideSection>

      <GuideSection title="When to Use It">
        <p>
          Use this page when a new grant is awarded (create grant), when a new scope of work begins within
          an existing grant (add project), when new deliverables or work packages are identified (add tasks),
          or when a grant is modified or extended (update end date, budget, or F&A rate).
        </p>
      </GuideSection>

      <GuideSection title="Grant Fields">
        <ColDef
          cols={[
            ["grant_number", "The full CFOP account string from ISWS finance — NOT just the fund number. Example: 5-71100-123456-240000. This is how the grant maps to PRIDE and must be entered exactly as it appears in your award documents."],
            ["funder", "Sponsoring agency name (e.g., FEMA, DHS, GRF, USFWS). Used for filtering and reporting."],
            ["title", "Descriptive name of the grant or contract (e.g., 'IL Flood Hazard Mapping FY2025')."],
            ["start_date", "Period of Performance (PoP) start date — the first day charges are allowable. This is NOT the date the award was signed."],
            ["end_date", "Period of Performance end date — the last day charges are allowable. Charges after this date will trigger Critical alerts."],
            ["total_budget", "The total approved budget including F&A (indirect costs). Enter the full awarded amount, not just the direct costs. Budgets including all modifications/supplements should be kept current."],
            ["status", "active, no-cost-extension, closed, or pending. Only 'active' grants appear in Dashboard metrics and timesheet task selection."],
            ["notes", "Free text field for grant management notes, e.g., extension request submitted, award number changed."],
          ]}
        />
      </GuideSection>

      <GuideSection title="Understanding Grant Numbers">
        <p>
          The <code>grant_number</code> field stores the full CFOP account string, which is a multi-segment
          identifier used by ISWS finance and the UIUC system. It is NOT just the federal award number
          (e.g., EMW-2024-FP-00123) and it is NOT just the fund number.
        </p>
        <p>
          A CFOP string looks like: <strong>5-71100-123456-240000</strong>, where the segments represent Fund,
          Organization, Account, and Program. Always copy this from your PRIDE grant summary or from the
          ISWS grants coordinator — do not abbreviate it.
        </p>
        <Tips
          items={[
            "If you have multiple sub-awards under one federal award, each sub-award gets its own CFOP and its own grant record in CHAMP-PM.",
            "The grant_number is the key used when reconciling CHAMP-PM labor costs against PRIDE reports.",
          ]}
        />
      </GuideSection>

      <GuideSection title="F&A Rate History">
        <p>
          Each grant has an F&A (Facilities and Administrative, also called indirect cost) rate that is
          applied to eligible direct costs when calculating loaded labor costs. The rate is stored as a
          history so it can change if the grant has multiple budget periods or modifications.
        </p>
        <ColDef
          cols={[
            ["rate", "F&A rate as a decimal (e.g., 0.317 for 31.7%). FEMA and DHS grants typically use 0.317. GRF grants may have a different negotiated rate."],
            ["effective_date", "The date this rate applies from. The system uses the most recent rate on or before any given date."],
            ["notes", "Optional note explaining the source (e.g., 'FY2025 negotiated rate per UIUC research agreement')."],
          ]}
        />
        <Tips
          items={[
            "When a grant budget modification changes the F&A rate, add a new rate record — do not edit the existing one.",
            "If a grant crosses a rate negotiation year boundary, you may need two rate records with different effective dates.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Creating a Grant">
        <Steps
          items={[
            "Navigate to Grants & Projects in the sidebar.",
            "Click \"New Grant\" in the top-right corner.",
            "Enter the grant_number exactly as it appears in your CFOP documentation.",
            "Fill in funder, title, start_date, end_date, and total_budget.",
            "Set status to 'active'.",
            "Save the grant record.",
            "Click the grant in the list to open it, then add the F&A rate under the Rates tab. Enter the rate (e.g., 0.317) and the effective_date (use the grant start_date for the initial rate).",
            "Add at least one project under the Projects tab before staff can charge time to this grant.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Project and Task Hierarchy">
        <p>
          Within a grant, work is organized into projects and tasks:
        </p>
        <ColDef
          cols={[
            ["Grant", "Top-level funding award. One CFOP account = one grant."],
            ["Project", "A distinct scope of work or deliverable within the grant. Examples: Coastal Mapping, Hydrology Analysis, Stakeholder Engagement."],
            ["Task", "The lowest-level unit that staff charge time to on their timesheet. Tasks belong to exactly one project. Examples: Data Collection, Report Writing, QA Review."],
          ]}
        />
        <Tips
          items={[
            "A grant should have at least one project, and each project should have at least one task. Staff cannot charge time to a project directly — only to tasks.",
            "Tasks can be marked inactive to prevent future timesheet entries without removing historical data.",
            "When creating tasks, use names that are specific enough for staff to know what work to charge (e.g., 'Task 2.1 - Flood Frequency Analysis', not just 'Analysis').",
          ]}
        />
      </GuideSection>

      <GuideSection title="Period of Performance">
        <p>
          The Period of Performance (PoP) is defined by the grant's start_date and end_date. Only costs
          incurred within the PoP are allowable under federal award regulations. CHAMP-PM uses these dates
          to:
        </p>
        <Tips
          items={[
            "Trigger Critical alerts when the end_date has passed but timesheets are still being submitted.",
            "Enforce the rule that Staff Plan appointments cannot extend past the grant end_date.",
            "Display the PoP on Gantt milestone anchors in the Schedule view.",
            "Calculate how many days remain in the PoP on the Runway page.",
          ]}
        />
        <p>
          If a no-cost extension is granted, update the end_date to the new extended date and change the
          status to 'no-cost-extension' to distinguish it from a standard active grant.
        </p>
      </GuideSection>

      <GuideSection title="Tips & Common Questions">
        <Tips
          items={[
            "If a grant does not appear in timesheet task selection, verify its status is 'active' and that it has at least one active project with at least one active task.",
            "Budget totals on the Budget & Burndown page will be wrong if total_budget is entered as direct costs only (excluding F&A). Always enter the fully-loaded total.",
            "You can have multiple projects per grant and multiple tasks per project — there is no limit.",
            "Project names appear on reports — use names that will be recognizable to your program officer or auditor.",
          ]}
        />
      </GuideSection>

      <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
        <a href="/admin/docs/user-guide/grants" className="text-blue-600 underline">View full documentation →</a>
      </div>
    </div>
  );
}
