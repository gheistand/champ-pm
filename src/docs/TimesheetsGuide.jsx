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

export default function TimesheetsGuide() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <GuideHeader
        title="Timesheets"
        subtitle="Enter hours against assigned tasks, submit for approval, and manage the approval workflow."
      />

      <GuideSection title="What This Page Does">
        <p>
          Timesheets are how labor costs are recorded in CHAMP-PM. Staff enter their hours week by week
          against the tasks they are assigned to. Once submitted and approved by an Admin, those hours
          are used to calculate loaded labor costs for budget reports.
        </p>
        <p>
          Only approved timesheets affect budget and cost calculations. Draft or submitted timesheets are
          in-progress and do not count until an Admin approves them.
        </p>
      </GuideSection>

      <GuideSection title="When to Use It">
        <p>
          Staff should enter and submit timesheets weekly, ideally by end of day Monday for the prior week.
          Admins should review submitted timesheets at least weekly to keep budget data current. Late approvals
          delay the accuracy of all budget and burndown reports.
        </p>
      </GuideSection>

      <GuideSection title="Timesheet Week Structure">
        <p>
          All timesheet weeks run Monday through Sunday. The system automatically determines which week
          a date belongs to. You cannot split a timesheet entry across two weeks — each entry belongs to
          exactly one week.
        </p>
        <ColDef
          cols={[
            ["Week of", "The Monday that begins the week (e.g., 'Week of April 7, 2026')."],
            ["Status", "draft, submitted, approved, or rejected. See the workflow below."],
            ["Total Hours", "Sum of all hour entries for the week across all tasks."],
            ["Grant Hours", "Hours charged to grant-funded tasks (non-overhead)."],
            ["Overhead Hours", "Hours charged to overhead tasks (leave, admin, etc.)."],
          ]}
        />
      </GuideSection>

      <GuideSection title="Entering Hours — Staff View">
        <Steps
          items={[
            "Navigate to My Timesheet in the sidebar.",
            "The current week is shown by default. Use the week selector arrows to navigate to a prior week if needed.",
            "Click \"Add Entry\" or click on a task row if your assignments are pre-populated.",
            "Select the task from the dropdown. Only tasks you are assigned to will appear, plus the standard overhead tasks.",
            "Enter the number of hours for that task for the week. You can enter fractional hours (e.g., 2.5).",
            "Repeat for each task you worked on that week.",
            "Your entries save automatically as you type. The timesheet status remains 'draft' until you explicitly submit.",
            "When your entries for the week are complete, click \"Submit Week\" to send for Admin approval.",
          ]}
        />
        <Tips
          items={[
            "You can edit a draft timesheet at any time. Once submitted, you cannot edit it unless an Admin rejects it.",
            "If you worked on a task but it is not in your dropdown, ask your Admin to add an assignment for you.",
            "Total hours in a week do not need to equal 40 — part-time staff and those on leave will have fewer.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Overhead vs. Grant-Charged Hours">
        <p>
          Two categories of tasks appear on your timesheet:
        </p>
        <ColDef
          cols={[
            ["Grant-charged tasks", "Tasks under active grants and projects. Hours here generate loaded labor costs charged against grant budgets. You must be assigned to the task to see it."],
            ["Overhead tasks", "Standard tasks available to all staff regardless of assignment: Annual Leave, Sick Leave, Personal Holiday, Compensatory Time, Administrative (non-grant work), and Training. These do not charge to any grant budget."],
          ]}
        />
        <Tips
          items={[
            "Overhead tasks are always visible — you do not need an assignment for them.",
            "When you are on leave for a full day, enter 8 hours (or your standard daily hours) to the appropriate leave task.",
            "Overhead hours still appear in reports so Admins can see total staff utilization vs. grant-charged utilization.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Status Flow">
        <ColDef
          cols={[
            ["draft", "The timesheet has been started but not submitted. Only the staff member can see it. Does not affect budget calculations."],
            ["submitted", "The staff member has clicked Submit Week. The timesheet is waiting for Admin review. Still does not affect budget calculations."],
            ["approved", "An Admin has approved the timesheet. Hours now count toward grant costs, budget burndown, and reports."],
            ["rejected", "An Admin has rejected the timesheet with a note explaining why. The staff member must correct and resubmit."],
          ]}
        />
      </GuideSection>

      <GuideSection title="Admin Approval Workflow">
        <Steps
          items={[
            "Navigate to Timesheets in the sidebar. As an Admin, you see all staff timesheets, not just your own.",
            "Use the filter at the top to show only 'submitted' timesheets to see what needs attention.",
            "Click on a submitted timesheet to review the entries.",
            "Verify the hours look reasonable. Check for obvious errors: hours on an inactive grant, suspiciously high totals, or missing overhead for days the staff member was on leave.",
            "To approve: click \"Approve\". The timesheet moves to 'approved' and hours immediately affect budget calculations.",
            "To reject: click \"Reject\", enter a note explaining what needs to be corrected, and submit. The staff member sees the rejection note and can edit their timesheet and resubmit.",
          ]}
        />
        <Tips
          items={[
            "Rejected timesheets return to 'draft' status so the staff member can edit them.",
            "As an Admin, you can also edit a submitted timesheet directly before approving it if the correction is minor.",
            "Admins can submit and approve their own timesheets — there is no separate approver for Admin-role users.",
          ]}
        />
      </GuideSection>

      <GuideSection title="What Happens After Rejection">
        <Steps
          items={[
            "The staff member receives the rejection note in the Timesheets page (shown as a banner on the rejected week).",
            "The timesheet returns to 'draft' status and is fully editable again.",
            "The staff member makes the requested corrections.",
            "The staff member clicks \"Submit Week\" again to resubmit.",
            "The Admin reviews and approves or rejects again.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Why Approved-Only Matters">
        <p>
          Budget reports, burndown charts, and runway calculations all use only approved timesheet data.
          This is intentional: submitted-but-not-yet-approved data is unverified and could contain errors.
          The implication is:
        </p>
        <Tips
          items={[
            "If Admins are slow to approve, the budget data will lag reality. Approve weekly.",
            "A grant may appear under-spent in reports if a large batch of timesheets is still in 'submitted' status.",
            "The Dashboard 'Pending Timesheets' metric exists specifically to remind Admins to approve promptly.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Tips & Common Questions">
        <Tips
          items={[
            "Can I enter hours for a past week? Yes, as long as the week is not already approved. Admins can enter hours for any week for any staff member.",
            "What if I forgot to submit and the week is already past? Create a draft for that week, enter your hours, and submit — Admins can still approve past weeks.",
            "Can I have multiple entries for the same task in the same week? Yes, for example if you want to note different sub-activities in the notes field.",
            "Timesheet entries support an optional notes field — use it to document what specifically you worked on for your own reference or for program officer queries.",
          ]}
        />
      </GuideSection>

      <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
        <a href="/admin/docs/user-guide/timesheets" className="text-blue-600 underline">View full documentation →</a>
      </div>
    </div>
  );
}
