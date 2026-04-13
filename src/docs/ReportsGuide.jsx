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

export default function ReportsGuide() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <GuideHeader
        title="Reports & Export"
        subtitle="Generate filtered timesheet cost reports and export to CSV for invoicing and quarterly reporting."
      />

      <GuideSection title="What This Page Does">
        <p>
          The Reports page lets you generate detailed cost reports from approved timesheet data. You can filter
          by grant, date range, and individual staff member, then view results in a table or export to CSV.
          All reports show fully loaded costs — base salary, fringe, and F&A combined.
        </p>
        <p>
          Reports include only approved timesheet entries. Draft and submitted entries are excluded to ensure
          data quality and auditability.
        </p>
      </GuideSection>

      <GuideSection title="When to Use It">
        <p>
          Use Reports for grant invoicing, quarterly progress reports to program officers, internal budget
          reviews, annual closeout documentation, and any time you need to provide a cost backup to PRIDE
          or to a sponsor. The CSV export is designed to attach directly to invoice packages.
        </p>
      </GuideSection>

      <GuideSection title="How to Run a Report">
        <Steps
          items={[
            "Navigate to Reports & Export in the sidebar.",
            "Set the Grant filter: select one grant, or leave it as 'All Grants' for a program-wide report.",
            "Set the Date Range: enter the start and end dates of the period you want to report on. For quarterly reports, use the first and last day of the quarter.",
            "Set the Staff filter: select one staff member, or leave it as 'All Staff' to include everyone who charged to the selected grant in the period.",
            "Click \"Run Report\". The results table populates below the filter bar.",
            "Review the results. The row count and total cost summary appear above the table.",
            "To export, click \"Export CSV\". The file downloads immediately with a filename that includes the grant and date range.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Filter Options">
        <ColDef
          cols={[
            ["Grant", "Filter to a single grant by name or grant number. Selecting a grant also restricts available projects and tasks in other filter fields. Leave as 'All' for a program-wide report."],
            ["Date Range — Start", "The first date to include. The report includes any approved timesheet entry for a week that contains this date or later."],
            ["Date Range — End", "The last date to include. The report includes any approved timesheet entry for a week that contains this date or earlier."],
            ["Staff Member", "Filter to one person. Useful when preparing a cost backup for a specific employee's effort on a grant."],
          ]}
        />
        <Tips
          items={[
            "Date range filters on the week's start date (Monday). A week that straddles two quarters will appear in the quarter that contains its Monday.",
            "For invoicing, always run the report for the exact invoice period as defined in your award — typically a quarter or budget period.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Report Column Definitions">
        <ColDef
          cols={[
            ["Staff Name", "The name of the staff member who submitted the timesheet entry."],
            ["Grant", "The grant name and grant number associated with the task charged."],
            ["Project", "The project within the grant that the task belongs to."],
            ["Task", "The specific task charged. Overhead tasks (Annual Leave, Sick Leave, etc.) are excluded from grant reports unless 'Include Overhead' is checked."],
            ["Week of", "The Monday of the week the hours were worked."],
            ["Hours", "Approved hours for this entry."],
            ["Hourly Rate (loaded)", "The fully loaded hourly rate used: (annual salary ÷ 2080) × (1 + fringe rate) × (1 + F&A rate). Shown for reference — multiply by Hours to get Total Cost."],
            ["Personnel Cost", "Base + fringe cost only: hours × (annual salary ÷ 2080) × (1 + fringe rate). Does not include F&A."],
            ["F&A Cost", "Indirect cost: Personnel Cost × grant F&A rate (e.g., × 0.317 for FEMA/DHS grants)."],
            ["Total Cost", "Personnel Cost + F&A Cost. This is the fully loaded cost charged to the grant for this entry."],
          ]}
        />
      </GuideSection>

      <GuideSection title="Export Instructions">
        <Steps
          items={[
            "Run the report with your desired filters.",
            "Click \"Export CSV\" in the top-right of the results table.",
            "The CSV downloads to your browser's default download folder.",
            "Open in Excel or Google Sheets. Column headers match the table column names exactly.",
            "A summary row at the bottom of the CSV shows totals for Hours, Personnel Cost, F&A Cost, and Total Cost.",
          ]}
        />
        <Tips
          items={[
            "The CSV is UTF-8 encoded. If special characters appear garbled in Excel, use 'Import from Text/CSV' in Excel and specify UTF-8 encoding.",
            "The export filename format is: CHAMP-PM-Report-[GrantNumber]-[StartDate]-[EndDate].csv",
          ]}
        />
      </GuideSection>

      <GuideSection title="Common Use Cases">
        <ColDef
          cols={[
            ["Grant Invoicing", "Filter by grant and the invoice period date range. Export CSV and attach to the invoice package. Verify totals match PRIDE before submitting."],
            ["Quarterly Reporting to Program Officer", "Filter by grant and quarter dates. Export CSV and summarize by project using a pivot table in Excel."],
            ["Annual Effort Certification", "Filter by staff member and full calendar or fiscal year. Export to verify percent effort on each grant for certification documents."],
            ["Internal Budget Review", "Filter by grant only (all staff, YTD). Review the Personnel Cost and F&A Cost columns to understand labor budget consumption."],
            ["Staff Productivity Review", "Filter by staff member across all grants for a period. Sum hours per grant to see allocation across the portfolio."],
          ]}
        />
      </GuideSection>

      <GuideSection title="Tips & Common Questions">
        <Tips
          items={[
            "If the report shows fewer hours than expected, check that all timesheets for the period have been approved — submitted timesheets are excluded.",
            "Overhead hours (Annual Leave, Sick Leave, etc.) are excluded from grant reports by default. Check 'Include Overhead' to see them.",
            "The Hourly Rate (loaded) column changes over time as salary and fringe rates change — this is expected and correct.",
            "For multi-year grants, run one report per year to see how costs have trended over the grant's life.",
            "Reports do not time out — large date ranges (multi-year, all-staff, all-grant) may take a few seconds to load.",
          ]}
        />
      </GuideSection>

      <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
        <a href="/admin/docs/user-guide/reports" className="text-blue-600 underline">View full documentation →</a>
      </div>
    </div>
  );
}
