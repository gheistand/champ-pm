function RuleBadge({ label, color }) {
  const colors = {
    financial: 'bg-blue-100 text-blue-700',
    data: 'bg-purple-100 text-purple-700',
    system: 'bg-gray-100 text-gray-700',
    grant: 'bg-green-100 text-green-700',
    time: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${colors[color] || colors.system}`}>
      {label}
    </span>
  );
}

function Rule({ number, title, badge, badgeColor, children }) {
  return (
    <div id={`rule-${number}`} className="mb-8 pb-8 border-b border-gray-200 last:border-0 docs-section">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-7 h-7 rounded-full bg-gray-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
          {number}
        </span>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <RuleBadge label={badge} color={badgeColor} />
      </div>
      {children}
    </div>
  );
}

function RuleDetail({ label, children }) {
  return (
    <div className="mt-3">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      <div className="mt-1 text-sm text-gray-700">{children}</div>
    </div>
  );
}

export default function BusinessRules() {
  return (
    <div className="docs-content max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Business Rules</h2>
        <p className="text-gray-500 text-sm mt-1">
          Invariants that CHAMP-PM enforces to protect data integrity, financial accuracy, and compliance.
          <span className="ml-3 text-gray-400">Last reviewed: April 2026</span>
        </p>
      </div>

      <Rule number={1} title="Fringe Rates Are Immutable" badge="Financial Data" badgeColor="financial">
        <RuleDetail label="What it means">
          Fringe rate records cannot be changed after creation. Only the <code className="bg-gray-100 px-1 rounded text-xs">notes</code> field
          is editable. Any rate change requires a new record with a new effective date.
        </RuleDetail>
        <RuleDetail label="Why it exists">
          Historical cost calculations must remain stable. Changing a past fringe rate would
          retroactively alter every budget report, timesheet cost calculation, and runway projection
          that used that rate — making the historical record untrustworthy.
        </RuleDetail>
        <RuleDetail label="How it's enforced">
          Server-side check in <code className="bg-gray-100 px-1 rounded text-xs">functions/api/fringe-rates/[id].js</code> —
          PUT requests only allow the <code className="bg-gray-100 px-1 rounded text-xs">notes</code> field to be updated.
          All other fields are ignored or rejected.
        </RuleDetail>
      </Rule>

      <Rule number={2} title="Salary Records Are Append-Only" badge="Financial Data" badgeColor="financial">
        <RuleDetail label="What it means">
          Salary history is never edited or deleted. Each salary change creates a new record
          with the new amount and a new effective_date. The full history is preserved indefinitely.
        </RuleDetail>
        <RuleDetail label="Why it exists">
          ISWS financial compliance and audit requirements. All historical budget calculations
          (timesheet costs, burndown reports, runway projections) use the salary that was in effect
          at the time of the work. This is only possible if the historical record is complete and unmodified.
        </RuleDetail>
        <RuleDetail label="How it's enforced">
          No DELETE or full-overwrite PUT endpoints exist on salary_records. The UI only
          offers an "Add new salary record" action — never an edit or delete.
        </RuleDetail>
      </Rule>

      <Rule number={3} title="Fiscal Year Is July 1 – June 30" badge="Time" badgeColor="time">
        <RuleDetail label="What it means">
          FY2026 = July 1, 2025 – June 30, 2026. All fiscal year references use this convention.
        </RuleDetail>
        <RuleDetail label="Affects">
          Budget burndown period filters, runway calculations, timesheet reporting periods,
          and salary adjustment timing. When creating date-range reports, use July 1 as the
          fiscal year start.
        </RuleDetail>
      </Rule>

      <Rule number={4} title="Grant Total Budget Includes F&A" badge="Grant" badgeColor="grant">
        <RuleDetail label="What it means">
          The <code className="bg-gray-100 px-1 rounded text-xs">total_budget</code> field on a grant record
          represents the full FEMA award including both direct costs and F&A (indirect costs).
        </RuleDetail>
        <RuleDetail label="Why it exists">
          FEMA awards are all-in amounts — ISWS receives a single total award. The system tracks
          full award vs. total expenditure (personnel + F&A), not just direct labor.
        </RuleDetail>
        <RuleDetail label="Implication">
          When comparing grant budget to calculated costs, the formula
          is: <em>spent = Σ(personnel cost + F&A cost)</em>, which should be compared against total_budget.
        </RuleDetail>
      </Rule>

      <Rule number={5} title="Overhead Tasks Are Internal Tracking Only" badge="System" badgeColor="system">
        <RuleDetail label="What it means">
          Each staff member’s salary is fully covered by their grant allocations — the combination
          of grants they are allocated to accounts for 100% of their time, including both
          production work and overhead activities (leave, admin, PD, etc.).
        </RuleDetail>
        <RuleDetail label="Purpose of overhead time entries">
          Overhead timesheet entries are for <strong>internal workload tracking only</strong>.
          They allow management to see how staff time is actually distributed between
          productive grant work and overhead activities. This visibility is useful for
          project management but does not affect grant cost calculations or budget burndown.
        </RuleDetail>
        <RuleDetail label="The OVERHEAD grant in CHAMP-PM">
          The “OVERHEAD” entry in the grants list is a <strong>system placeholder</strong>,
          not a real grant or funding source. It exists solely to group overhead tasks so
          staff can log overhead time. It has no dollar budget. Overhead time entries do
          not burn any grant balance — the grant allocations (salary appointments) already
          account for the full cost of each employee’s time across all activities.
        </RuleDetail>
        <RuleDetail label="Overhead task types">
          <ul className="list-disc pl-4 mt-1 space-y-0.5">
            <li>Annual Leave</li>
            <li>Sick Leave</li>
            <li>CHAMP Admin</li>
            <li>Professional Development</li>
            <li>Professional Organizations</li>
            <li>General</li>
            <li>CNMS</li>
          </ul>
          All of these tasks are available to all active staff regardless of assignment records.
        </RuleDetail>
        <RuleDetail label="See also">
          Technical Reference → Two Cost Views explains the relationship between timesheet
          entries and grant salary allocations in detail.
        </RuleDetail>
      </Rule>

      <Rule number={6} title="Delete Protection on Financial Records" badge="Data" badgeColor="data">
        <RuleDetail label="What it means">
          Projects, tasks, grants, staff, and related records are protected against cascading deletes.
          Server-side checks return a 409 Conflict with a descriptive error message before any
          cascade would occur.
        </RuleDetail>
        <RuleDetail label="Why it exists">
          Prevents accidental destruction of financial data. If a grant has timesheet entries,
          you cannot delete the grant — doing so would silently remove cost records needed
          for reconciliation and reporting.
        </RuleDetail>
        <RuleDetail label="What to do instead">
          Set the record's status to "inactive" or "archived" rather than deleting it.
          Inactive grants and projects are hidden from active views but preserved in all reports.
        </RuleDetail>
      </Rule>

      <Rule number={7} title="Grant Identifier Is Full Account String" badge="Grant" badgeColor="grant">
        <RuleDetail label="What it means">
          <code className="bg-gray-100 px-1 rounded text-xs">grant_number</code> in the grants table
          stores the full CFOP account string (e.g., <code className="bg-gray-100 px-1 rounded text-xs">1-470736-740000-191200-A00</code>).
          The <code className="bg-gray-100 px-1 rounded text-xs">fund_number</code> field alone is NOT unique.
        </RuleDetail>
        <RuleDetail label="Why it matters">
          Fund 100026 maps to 8+ distinct accounts in the University system. Using fund number
          alone would conflate multiple grants. Always use <code className="bg-gray-100 px-1 rounded text-xs">grant_number</code> or
          the integer <code className="bg-gray-100 px-1 rounded text-xs">grant_id</code> FK for joining/identifying grants.
        </RuleDetail>
      </Rule>

      <Rule number={8} title="F&A Rate Is Per-Grant" badge="Financial Data" badgeColor="financial">
        <RuleDetail label="What it means">
          Each grant maintains its own F&A rate history in <code className="bg-gray-100 px-1 rounded text-xs">grant_fa_rates</code>.
          Rates are effective-dated and can change over the grant's life.
        </RuleDetail>
        <RuleDetail label="Default rate">
          Most FEMA/DHS grants use 0.317 (31.7% MTDC — "Other Sponsored Activity" rate at ISWS).
          Non-FEMA grants (GRF, contracts) may differ.
        </RuleDetail>
        <RuleDetail label="Always verify">
          Before trusting report totals, verify the rate via the Grant → F&A Rates tab.
          An incorrect F&A rate will produce incorrect burndown and cost reports across all staff
          for that grant.
        </RuleDetail>
      </Rule>

      <Rule number={9} title="Timesheet Week Is Monday–Sunday" badge="Time" badgeColor="time">
        <RuleDetail label="What it means">
          <code className="bg-gray-100 px-1 rounded text-xs">week_start</code> in <code className="bg-gray-100 px-1 rounded text-xs">timesheet_weeks</code> is
          always a Monday date. Timesheet entries for a given week are grouped by their Monday start date.
        </RuleDetail>
        <RuleDetail label="Implication">
          If a staff member enters hours on a Tuesday, those hours belong to the week starting
          on the Monday immediately before. Cross-week entries spanning Sunday–Monday are split
          into separate weekly periods.
        </RuleDetail>
      </Rule>

      <Rule number={10} title="Staff Plan Scenarios Are Sandboxed" badge="System" badgeColor="system">
        <RuleDetail label="What it means">
          Changes in a Staff Plan scenario — whether draft, active, or archived — do not affect
          the actual <code className="bg-gray-100 px-1 rounded text-xs">salary_records</code>,{' '}
          <code className="bg-gray-100 px-1 rounded text-xs">assignments</code>, or grant budgets.
          They are projections only.
        </RuleDetail>
        <RuleDetail label="Why it matters">
          Scenario planning is exploratory. Staff plans exist to help Glenn model "what if we
          appoint X% of staff Y to grant Z" — without committing any changes to the production
          financial data. The scenario must be manually transcribed to PRIDE to take effect.
        </RuleDetail>
      </Rule>
    </div>
  );
}
