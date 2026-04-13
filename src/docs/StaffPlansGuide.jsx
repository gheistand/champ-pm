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

export default function StaffPlansGuide() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <GuideHeader
        title="Staff Plans"
        subtitle="Scenario-based salary appointment planning — sandbox mode, export for PRIDE entry."
      />

      <GuideSection title="What This Page Does">
        <p>
          Staff Plans is a scenario planner for salary appointments. You build proposed appointment schedules
          (what percentage of each staff member's time to charge to each grant for a given period), project
          the resulting monthly costs, and see how long each grant's balance will last under that scenario.
        </p>
        <p>
          Staff Plans operates entirely in sandbox mode. Nothing you do here changes actual salary records,
          grant assignments, or timesheets. When you finalize a scenario, you export it as a spreadsheet
          for manual entry into PRIDE.
        </p>
      </GuideSection>

      <GuideSection title="When to Use It">
        <p>
          Use Staff Plans at the start of each semester or budget period when preparing appointment spreadsheets
          for PRIDE. Also use it before requesting a no-cost extension (to model how much runway the extension
          buys) or when a key grant ends and you need to plan where to move staff appointments.
        </p>
      </GuideSection>

      <GuideSection title="The Sandbox Rule">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <strong>Scenarios are sandboxed.</strong> Creating, modifying, or deleting a Staff Plans scenario
          has zero effect on actual staff records, salary data, timesheets, or grant assignments in CHAMP-PM.
          The only way to act on a scenario is to export it and manually enter the appointments in PRIDE.
        </div>
      </GuideSection>

      <GuideSection title="Burn Rate Formula">
        <p>
          Staff Plans uses the following formula to calculate monthly cost for each appointment line:
        </p>
        <p className="font-mono bg-gray-50 border border-gray-200 rounded p-3 text-xs">
          Monthly Cost = (Annual Salary ÷ 12) × Allocation% × (1 + Fringe Rate) × (1 + F&A Rate)
        </p>
        <p>
          For a typical Academic Professional staff member on a FEMA grant:
        </p>
        <p className="font-mono bg-gray-50 border border-gray-200 rounded p-3 text-xs">
          Monthly Cost = (Salary ÷ 12) × Allocation% × 1.451 × 1.317
        </p>
        <Tips
          items={[
            "The fringe multiplier (1.451) reflects the FY2026 AP rate of 45.1%. Staff Plans uses the fringe rate effective on the scenario start date.",
            "The F&A multiplier (1.317) reflects a 31.7% rate. Staff Plans uses the F&A rate from the selected grant's rate history.",
            "Changing a staff member's salary in their record will automatically update the projected cost in any scenario that references them.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Creating a Scenario">
        <Steps
          items={[
            "Navigate to Staff Plans in the sidebar.",
            "Click \"New Scenario\".",
            "Enter a scenario name (e.g., 'Spring 2026 Appointments', 'FY2026 Q3-Q4 Plan').",
            "Set the scenario start and end dates — this defines the appointment period you are planning.",
            "Click Create. The scenario opens in edit mode with an empty appointments grid.",
            "Add staff members and grants to the grid (see Importing Appointments below for bulk setup).",
            "Enter appointment percentages for each staff member-grant combination.",
            "Review the Runway Cards on the right side to see projected months of runway per grant.",
            "Adjust percentages as needed until the scenario looks sustainable.",
            "When satisfied, click Save Scenario.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Importing Appointments">
        <p>
          If you have the current appointment spreadsheet from PRIDE, you can import it as a starting point
          rather than entering every appointment manually:
        </p>
        <Steps
          items={[
            "Export the current appointment summary from PRIDE as a CSV or Excel file.",
            "In the scenario editor, click \"Import Appointments\".",
            "Upload the file. CHAMP-PM attempts to match staff names and grant numbers to existing records.",
            "Review the mapping results. Any unmatched entries appear in an orange 'Unmapped' list for manual resolution.",
            "For each unmapped entry, use the dropdown to link it to the correct CHAMP-PM staff member or grant, or mark it as 'Skip' if it should not be imported.",
            "Click \"Confirm Import\". The appointments populate the scenario grid.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Appointment Constraints">
        <ColDef
          cols={[
            ["Minimum appointment", "5% per grant per staff member. Appointments below 5% cannot be entered — set to 0% (no appointment) instead."],
            ["Maximum per person", "Appointment percentages for a single staff member across all grants cannot exceed 100% for any given month. The system flags over-100% allocations in red."],
            ["No appointment past grant end date", "If a grant expires on October 31, you cannot enter an appointment on that grant for November. The cell will be locked."],
            ["Active grants only", "Staff Plans only shows grants with status = 'active' or 'no-cost-extension' in the grant selector."],
          ]}
        />
      </GuideSection>

      <GuideSection title="Reading the Runway Cards per Grant">
        <p>
          On the right side of the scenario editor, each grant shows a Runway Card displaying:
        </p>
        <ColDef
          cols={[
            ["Current Balance", "The most recently entered PRIDE balance from the Runway page. Highlighted in amber if the balance is more than 30 days old."],
            ["Projected Monthly Cost", "The sum of all appointment costs charged to this grant in the scenario, per month."],
            ["Projected Runway", "Current Balance ÷ Projected Monthly Cost. How many months the balance will last at this appointment level."],
            ["PoP Remaining", "Months from the scenario start date to the grant's end_date."],
            ["Status indicator", "Green: runway ≥ PoP remaining (money will last). Yellow: runway is 1–2 months shorter than PoP. Red: runway is significantly shorter than PoP — appointments likely need to be reduced or balance needs to be supplemented."],
          ]}
        />
      </GuideSection>

      <GuideSection title="Exporting for PRIDE">
        <Steps
          items={[
            "Open the finalized scenario.",
            "Click \"Export for PRIDE\".",
            "The system generates an Excel file formatted for PRIDE appointment entry, with one row per staff member-grant combination showing name, grant CFOP, appointment percentage, and period.",
            "Download the file.",
            "Use this file as the source document when entering appointments in PRIDE. The file does not auto-upload to PRIDE — manual entry is required.",
          ]}
        />
        <Tips
          items={[
            "Compare the exported file against the most recent PRIDE appointment printout before entry to spot any changes.",
            "Archive the exported file with a date stamp for each budget period as documentation of your appointment planning process.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Tips & Common Questions">
        <Tips
          items={[
            "You can have multiple active scenarios simultaneously — for example, a base case and an alternative in case a grant renewal is delayed.",
            "Deleting a scenario is permanent. If you want to archive a finalized scenario, mark it 'Archived' rather than deleting it.",
            "Staff Plans uses the salary record effective on the scenario start date. If a merit increase takes effect mid-scenario, the cost projection will use the pre-increase salary for the whole period. Adjust manually if needed.",
            "If a staff member's fringe rate changes during the scenario period (e.g., at the July 1 fiscal year boundary), Staff Plans does not automatically split the cost. Build scenarios that align with fiscal year boundaries when possible.",
          ]}
        />
      </GuideSection>

      <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
        <a href="/admin/docs/user-guide/staff-plans" className="text-blue-600 underline">View full documentation →</a>
      </div>
    </div>
  );
}
