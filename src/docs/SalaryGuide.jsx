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

export default function SalaryGuide() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <GuideHeader
        title="Salary Records & Fringe Rates"
        subtitle="Immutable salary history and fringe rate tables that drive all loaded cost calculations."
      />

      <GuideSection title="What This Page Does">
        <p>
          Salary Records & Fringe Rates manages the two inputs that determine how loaded labor costs are
          calculated: each staff member's salary over time, and the fringe benefit rates applied by
          appointment type. Both are designed to be immutable historical records — you add to them,
          you never edit them.
        </p>
      </GuideSection>

      <GuideSection title="When to Use It">
        <p>
          Use this page when a staff member receives a merit increase, promotion, or reclassification (add a
          new salary record). Use it when ISWS negotiates new fringe benefit rates at the start of a fiscal
          year (add a new fringe rate record). Never use it to "correct" an existing record by editing —
          always add a new record with the correct value and effective date.
        </p>
      </GuideSection>

      <GuideSection title="The Append-Only Rule for Salary Records">
        <p>
          Salary records are <strong>append-only</strong>. This is the most important rule on this page.
          Every time you need to reflect a salary change, you add a new record with the new amount and the
          date it takes effect. The old record stays in the database permanently.
        </p>
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <strong>Why immutability matters for audits:</strong> Every timesheet entry's cost is calculated
          using the salary that was in effect on the date of that entry. If you could edit historical salary
          records, you would retroactively change the cost of every timesheet entry ever charged to a grant.
          This would invalidate budget reconciliations, break audit trails, and potentially misstate
          reimbursement requests already submitted to sponsors.
        </div>
        <ColDef
          cols={[
            ["staff_id", "The staff member this salary record belongs to."],
            ["annual_salary", "Annual salary in dollars (e.g., 85000.00). This is the 100% full-time equivalent — appointment percentage adjustments are applied at calculation time."],
            ["effective_date", "The first date this salary applies. The system uses the most recent salary record with an effective_date on or before the date of any timesheet entry."],
            ["notes", "Optional notes explaining the reason for the change (e.g., 'FY2026 merit increase', 'reclassification to PRS'). Helpful for future reference."],
          ]}
        />
      </GuideSection>

      <GuideSection title="Viewing Salary History for a Staff Member">
        <Steps
          items={[
            "Navigate to Salary Records & Fringe Rates in the sidebar.",
            "Use the staff filter at the top to select a staff member by name.",
            "All salary records for that staff member appear in reverse chronological order (most recent first).",
            "The topmost record is the currently active salary. Records below it are historical.",
            "Click any record to see its full detail including the notes field.",
          ]}
        />
        <Tips
          items={[
            "You can also reach salary records by opening a staff member's record in Staff Management and clicking the Salary Records tab.",
            "If no salary records exist for a staff member, their timesheet entries cannot be costed. Add an initial salary record with their hire date as the effective_date.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Adding a Salary Change">
        <Steps
          items={[
            "Navigate to the staff member's salary history (via Salary Records page or the Staff Management detail view).",
            "Confirm the existing most-recent salary and effective date before proceeding.",
            "Click \"Add Salary Record\".",
            "Enter the new annual_salary amount.",
            "Enter the effective_date — this should be the exact date the new salary takes effect in payroll (e.g., the first day of the new pay period, or the merit increase date per HR).",
            "Add a note explaining the reason for the change.",
            "Click Save. The new record becomes the active salary for all future timesheet calculations.",
            "Verify: the timesheet cost for a week after the effective_date should now reflect the new salary. The cost for weeks before the effective_date should be unchanged.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Fringe Rate Records">
        <p>
          Fringe rates represent the benefit costs (health insurance, retirement contributions, etc.) as a
          percentage of salary. ISWS negotiates these rates with UIUC and they change by fiscal year.
          Fringe rates in CHAMP-PM are <strong>immutable after creation</strong> — only the notes field
          can be edited after a rate is saved.
        </p>
        <ColDef
          cols={[
            ["appointment_type", "The employment category this rate applies to (e.g., 'Academic Professional', 'Civil Service', 'Graduate Assistant', 'Extra Help'). Must match the appointment_type on each staff record exactly."],
            ["rate", "Fringe rate as a decimal (e.g., 0.451 for 45.1%). Applied as: Personnel Cost = base salary cost × (1 + rate)."],
            ["effective_date", "The first date this rate applies. Usually the first day of a new fiscal year (e.g., July 1, 2026)."],
            ["fiscal_year", "The fiscal year this rate applies to (e.g., FY2026). Informational label — the effective_date governs the actual cutover."],
            ["notes", "Source documentation (e.g., 'Per UIUC Sponsored Programs Office FY2026 Rate Agreement'). This is the only field editable after creation."],
          ]}
        />
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <strong>FY2026 rates reference:</strong> Academic Professional (SURS-eligible): 45.1%. Check with ISWS
          Grants & Contracts for Civil Service and other appointment type rates for your fiscal year.
        </div>
      </GuideSection>

      <GuideSection title="How the Fringe Rate Lookup Works">
        <p>
          When a timesheet entry is costed, CHAMP-PM looks up the correct fringe rate as follows:
        </p>
        <Steps
          items={[
            "Read the appointment_type from the staff member's record (e.g., 'Academic Professional').",
            "Find all fringe rate records where appointment_type matches.",
            "From that set, select the record with the most recent effective_date that is on or before the timesheet entry date.",
            "Apply that rate: Personnel Cost = (hours × hourly base) × (1 + fringe rate).",
          ]}
        />
        <Tips
          items={[
            "If a staff member's appointment_type does not match any fringe rate record, their timesheets cannot be costed. Always add fringe rates before onboarding new appointment types.",
            "appointment_type matching is case-sensitive. 'Academic Professional' and 'academic professional' will not match.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Tips & Common Questions">
        <Tips
          items={[
            "At the start of each fiscal year, add new fringe rate records for all appointment types with the July 1 effective date before approving any timesheets for the new year.",
            "If two staff members have the same appointment type but different benefit costs (e.g., one is SURS-exempt), they need different appointment_type values so they can have different fringe rates.",
            "Salary records and fringe rates both affect historical cost calculations retroactively only through addition of new records — never through edits.",
            "If you discover a salary was entered incorrectly (wrong amount), you should add a correcting record effective from the same date. Contact your grants coordinator to understand whether a cost adjustment in PRIDE is also needed.",
          ]}
        />
      </GuideSection>

      <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
        <a href="/admin/docs/user-guide/salary" className="text-blue-600 underline">View full documentation →</a>
      </div>
    </div>
  );
}
