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

export default function StaffGuide() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <GuideHeader
        title="Staff Management"
        subtitle="Add, edit, and deactivate staff members. Admin only."
      />

      <GuideSection title="What This Page Does">
        <p>
          Staff Management is the central registry of everyone who works in the CHAMP section. Every person
          who charges hours to a grant or appears in payroll must have a staff record here before they can
          submit timesheets or be assigned to tasks.
        </p>
        <p>
          This page is accessible to Admins only. Staff members can view their own profile via My Profile
          but cannot edit their record.
        </p>
      </GuideSection>

      <GuideSection title="When to Use It">
        <p>
          Use Staff Management when onboarding a new hire, recording a title change or reclassification,
          updating band classification for equity analysis, or deactivating someone who has left the section.
          Salary changes are recorded here by adding a new salary record — never editing the existing one.
        </p>
      </GuideSection>

      <GuideSection title="Staff Record Fields">
        <ColDef
          cols={[
            ["name", "Full legal name as it appears in ISWS HR records."],
            ["email", "ISWS email address. Must match the Clerk account email for single sign-on to work correctly."],
            ["role", "CHAMP-PM access role: 'admin', 'staff', or 'hourly'. Set here for reference — actual access is controlled by Clerk publicMetadata."],
            ["title", "Job title as it appears on HR records (e.g., Research Scientist, Principal Research Scientist)."],
            ["classification", "Civil service classification code (e.g., RS, PRS, PA). Used in reports and equity analysis."],
            ["band_classification", "Pay band used for equity compa-ratio analysis. Must be set for the Equity Dashboard to function. Examples: RS-Band-1, PRS-Band-2."],
            ["start_date", "Date the staff member joined ISWS or the CHAMP section. Used in tenure-based equity calculations."],
            ["role_start_date", "Date the staff member started their current classification or title. Used for within-band equity analysis when they changed roles."],
            ["department", "Organizational unit within ISWS (e.g., CHAMP, Hydrology). Used for filtering in reports."],
            ["appointment_type", "Appointment category used to match fringe rates (e.g., Academic Professional, Civil Service). Must exactly match a fringe rate record."],
            ["active", "Whether the staff member is currently employed. Inactive staff cannot submit timesheets but their historical records are preserved."],
          ]}
        />
      </GuideSection>

      <GuideSection title="Adding a New Staff Member">
        <Steps
          items={[
            "Navigate to Staff Management in the left sidebar.",
            "Click \"Add Staff Member\" in the top-right corner.",
            "Fill in all required fields: name, email, role, title, classification, start_date, and appointment_type.",
            "Set band_classification if the staff member should appear in equity analysis. If you are unsure of the band, ask the section coordinator.",
            "Click Save. The staff member record is created immediately.",
            "If the new hire needs to log into CHAMP-PM, an Admin must also create their Clerk account at accounts.champ-pm.app and set the role in publicMetadata.",
            "After the record is saved, click into the staff member and use the Salary Records tab to add their starting salary with an effective_date of their hire date.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Recording a Salary Change (Append-Only Rule)">
        <p>
          Salary records in CHAMP-PM are <strong>append-only</strong>. You must never edit an existing salary
          record. Instead, add a new record with the new salary amount and the date it takes effect. The system
          automatically uses the most recent record whose effective_date is on or before any given query date.
        </p>
        <Steps
          items={[
            "Open the staff member's record from the Staff Management list.",
            "Click the \"Salary Records\" tab on the staff detail page.",
            "Review existing records to confirm what the current salary is and when it was last updated.",
            "Click \"Add Salary Record\".",
            "Enter the new annual salary amount and the effective_date (the first day the new salary applies — typically the merit increase date or reclassification date).",
            "Click Save. The old record remains unchanged. The new record is now the active salary going forward.",
          ]}
        />
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <strong>Why this rule exists:</strong> Salary history is used to calculate the correct loaded cost for
          every timesheet entry. If you edit a past salary record, every historical cost calculation changes
          retroactively, breaking budget reconciliation and audit trails. Always add — never edit.
        </div>
      </GuideSection>

      <GuideSection title="Setting Band Classification for Equity Analysis">
        <p>
          The <code>band_classification</code> field links a staff member to a pay band defined in the Equity
          Dashboard. Pay bands have a minimum, midpoint, and maximum salary. Without this field set, the
          staff member will not appear in compa-ratio or equity gap calculations.
        </p>
        <Tips
          items={[
            "Band classifications should be defined in the Equity Dashboard before you assign them to staff.",
            "If a staff member is reclassified (e.g., from RS to PRS), update band_classification and also update role_start_date to the reclassification date.",
            "Staff on temporary or visiting appointments may not need a band classification — coordinate with the section coordinator.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Deactivating a Former Staff Member">
        <Steps
          items={[
            "Open the staff member's record.",
            "Click \"Edit\" in the top-right of the record.",
            "Set the \"Active\" toggle to inactive.",
            "Click Save.",
            "The staff member's historical timesheet data, salary records, and assignments are all preserved. They simply can no longer log in or submit new timesheets.",
            "If the person still has a Clerk account, disable it separately at accounts.champ-pm.app.",
          ]}
        />
        <Tips
          items={[
            "Do not delete staff records — deactivate them. Deletion would break historical cost calculations and budget reports.",
            "A deactivated staff member can be reactivated if they return to the section.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Tips & Common Questions">
        <Tips
          items={[
            "The email field must match the Clerk account exactly. A mismatch means the system cannot link the login to the staff record.",
            "If a staff member changes their name (e.g., after marriage), update the name field. This updates all display names going forward but does not alter historical records.",
            "The 'role' field on the staff record is informational. Actual application access is governed by Clerk publicMetadata.role — they must match.",
            "You can filter the staff list by department, classification, or active status using the filter bar at the top of the page.",
            "Salary records on the Salary Records tab are shared with the Salary Records & Fringe Rates page — they are the same data, just accessible from two places.",
          ]}
        />
      </GuideSection>

      <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
        <a href="/admin/docs/user-guide/staff" className="text-blue-600 underline">View full documentation →</a>
      </div>
    </div>
  );
}
