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

export default function GettingStarted() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <GuideHeader
        title="Getting Started"
        subtitle="How to sign in, understand your role, and navigate CHAMP-PM."
      />

      <GuideSection title="What is CHAMP-PM?">
        <p>
          CHAMP-PM is the program management tool for the Illinois State Water Survey CHAMP section. It tracks
          grants, staff, timesheets, budgets, project schedules, and pay equity — all in one place.
        </p>
        <p>
          All access is controlled through Clerk, ISWS's identity provider. You must have an active account
          before you can sign in.
        </p>
      </GuideSection>

      <GuideSection title="When to Use This Guide">
        <p>
          Read this page first if you are a new user, if your role has changed, or if you need a refresher on
          navigating the application.
        </p>
      </GuideSection>

      <GuideSection title="How to Sign In">
        <Steps
          items={[
            "Navigate to the CHAMP-PM application URL provided by your administrator.",
            "Click \"Sign In\" on the landing page. You will be redirected to the Clerk Account Portal at accounts.champ-pm.app.",
            "Enter your ISWS email address and password. If your organization uses SSO, click \"Continue with SSO\" instead.",
            "After authentication, you are returned to CHAMP-PM and land on the Dashboard.",
            "If you see a first-login onboarding modal, complete it to confirm your profile details before proceeding.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Role Differences">
        <p>
          Your role determines which pages and actions are available to you. Roles are assigned by an
          administrator in Clerk and cannot be changed by users themselves.
        </p>
        <ColDef
          cols={[
            ["Admin", "Full access to all pages, including Staff, Grants, Salary, Budget, Equity, Reports, Imports, and CRM. Admins also have their own timesheet and assignments."],
            ["Staff", "Access to three pages only: My Timesheet, My Assignments, and My Profile. Staff cannot view other people's data or any administrative tools."],
            ["Hourly", "Same as Staff — My Timesheet, My Assignments, and My Profile. Intended for part-time or hourly-classified employees."],
          ]}
        />
        <p className="mt-2">
          If you believe you have the wrong role (for example, you are a section coordinator but cannot see the
          Staff Management page), contact your CHAMP-PM administrator to have your role updated in Clerk.
        </p>
      </GuideSection>

      <GuideSection title="Navigation Overview">
        <p>
          The main navigation is a sidebar on the left side of every page. The items visible depend on your role.
        </p>
        <ColDef
          cols={[
            ["Dashboard", "Program health overview — available to Admins only."],
            ["Staff Management", "Add, edit, and deactivate staff members — Admin only."],
            ["Grants & Projects", "Manage grants, projects, and tasks — Admin only."],
            ["Timesheets", "Enter and review timesheets — all roles see this, but Admins see all staff while Staff see only their own."],
            ["Budget & Burndown", "Grant budget consumption charts — Admin only."],
            ["Runway & Burn Rate", "Funding runway projections — Admin only."],
            ["Reports & Export", "Generate cost reports — Admin only."],
            ["Salary Records", "Salary and fringe rate management — Admin only."],
            ["Equity Dashboard", "Pay equity analysis — Admin only."],
            ["Staff Plans", "Scenario planning for salary appointments — Admin only."],
            ["Project Schedule", "Per-project Gantt chart — Admin only."],
            ["Program Schedule", "Cross-grant program Gantt — Admin only."],
            ["Import Timesheets", "Bulk CSV import — Admin only."],
            ["CRM", "Contacts and organizations — Admins read/write, Staff read-only."],
            ["My Assignments", "Tasks assigned to you — all roles."],
            ["My Profile", "View and edit your own profile — all roles."],
          ]}
        />
        <p className="mt-2">
          Admin users see approximately 20 sidebar items. Staff and Hourly users see 3 items: My Timesheet,
          My Assignments, and My Profile.
        </p>
      </GuideSection>

      <GuideSection title="First Login — Onboarding Modal">
        <p>
          On your very first login, CHAMP-PM displays an onboarding modal. This modal asks you to confirm your
          name and title as they appear in the system. It does not affect your Clerk account — it only ensures
          the CHAMP-PM database record is accurate.
        </p>
        <Tips
          items={[
            "If your name or title looks wrong in the modal, confirm it anyway and then ask your admin to correct the Staff record.",
            "The modal will not appear again after you dismiss it on first login.",
          ]}
        />
      </GuideSection>

      <GuideSection title="How to Sign Out">
        <Steps
          items={[
            "Click your avatar or initials in the top-right corner of the page.",
            "Select \"Sign Out\" from the dropdown menu.",
            "You are returned to the sign-in page. Your session is fully terminated.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Where to Get Help">
        <Tips
          items={[
            "Each page in CHAMP-PM has a help icon (?) in the top-right corner that links to the relevant user guide section.",
            "For access issues (wrong role, cannot log in), contact your CHAMP-PM administrator.",
            "For data questions (missing grants, wrong salary), contact the section coordinator.",
            "For technical bugs, report them via the feedback link at the bottom of the sidebar.",
            "The full user guide is available at /admin/docs/user-guide/ when logged in as Admin.",
          ]}
        />
      </GuideSection>

      <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
        <a href="/admin/docs/user-guide/getting-started" className="text-blue-600 underline">View full documentation →</a>
      </div>
    </div>
  );
}
