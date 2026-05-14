function GuideHeader({ title, subtitle }) {
  return (
    <div className="mb-6">
      <div className="text-xs text-gray-400 mb-1">User Guide → {title}</div>
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
      <p className="text-xs text-gray-400 mt-2">Last reviewed: May 2026</p>
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

export default function ImportGuide() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <GuideHeader
        title="Import Timesheets"
        subtitle="Bulk-load timesheet hours from the Detailed Activity Report or simple summary CSV."
      />

      <GuideSection title="What This Page Does">
        <p>
          The Import page lets you bulk-load timesheet entries from a CSV file exported from the ISWS
          timesheet system (AURA). CHAMP-PM automatically detects which export format you uploaded and
          parses it accordingly. Staff and project names in the CSV are mapped to CHAMP-PM IDs before
          import completes.
        </p>
        <p>
          Imported entries start in <em>draft</em> status and require Admin approval before they count
          toward budget calculations.
        </p>
      </GuideSection>

      <GuideSection title="When to Use It">
        <p>
          Use the import tool for regular weekly or bi-weekly timesheet syncing from AURA, when onboarding
          a backlog of historical hours, or anytime you need to bulk-load hours from a CSV export.
          For ad-hoc single-entry corrections, use the Timesheets page directly.
        </p>
      </GuideSection>

      <GuideSection title="Supported CSV Formats">
        <p>
          CHAMP-PM supports two CSV formats and auto-detects which one you uploaded based on the file header.
          You do not need to select the format manually.
        </p>

        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          <strong>Recommended format: Detailed Activity Report</strong> — export <code>rptDetailedActivity</code>
          from AURA. This is the preferred format for regular imports because it includes per-day hours and
          full project/activity detail.
        </div>

        <ColDef
          cols={[
            ["Detailed Activity Report\n(rptDetailedActivity)", "Export from AURA using the rptDetailedActivity report. The file starts with a header line containing \"Detailed Activity Report\". Includes employee name, project, activity/task, date, billable hours, and non-billable hours. CHAMP-PM sums billable + non-billable for the total hours per entry."],
            ["Simple Summary CSV", "A flat CSV with columns: date, staff_name, project_name, task_name, hours. Can be used for manual CSV construction or exports from other tools. Header row is required and column names must match exactly (case-sensitive)."],
          ]}
        />
      </GuideSection>

      <GuideSection title="Exporting the Detailed Activity Report from AURA">
        <Steps
          items={[
            "Log into AURA and navigate to Reports.",
            "Select rptDetailedActivity (Detailed Activity Report).",
            "Set the date range to cover the period you want to import (weekly or bi-weekly is typical).",
            "Export as CSV.",
            "Upload the exported file directly to CHAMP-PM Import — no reformatting needed.",
          ]}
        />
        <Tips
          items={[
            "The Detailed Activity Report includes all staff in one file. You do not need to export per-person.",
            "CHAMP-PM skips rows where hours = 0 and description/total summary rows automatically.",
            "If a staff member has left ISWS and their AURA account is inactive, their rows are skipped during import (they will appear in the skipped/inactive list after upload).",
          ]}
        />
      </GuideSection>

      <GuideSection title="Simple CSV Format Reference">
        <p>
          If you are not using the Detailed Activity Report, your CSV must have exactly these five column
          headers in the first row (case-sensitive):
        </p>
        <ColDef
          cols={[
            ["date", "Date worked. Format: YYYY-MM-DD (e.g., 2026-04-07). The week (Mon–Sun) is determined automatically."],
            ["staff_name", "Staff member's name. Must match a name in CHAMP-PM or will be flagged as unmapped."],
            ["project_name", "Project the hours are charged to. Must match a CHAMP-PM project name."],
            ["task_name", "Task within the project. Must match a CHAMP-PM task name under that project."],
            ["hours", "Hours worked. Decimal fractions allowed (e.g., 2.5). Must be > 0."],
          ]}
        />
        <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs overflow-x-auto mt-2">
{`date,staff_name,project_name,task_name,hours
2026-04-07,Jane Smith,Coastal Flood Mapping,Data Collection,6.0
2026-04-07,Jane Smith,Coastal Flood Mapping,QA Review,2.0
2026-04-08,Bob Jones,Hydrology Analysis,Report Writing,8.0`}
        </pre>
      </GuideSection>

      <GuideSection title="The Mapping Workflow">
        <p>
          After upload, CHAMP-PM matches each unique employee name, project name, and activity/task name
          to existing CHAMP-PM records. Exact matches are mapped automatically. Non-matches are flagged
          for manual resolution.
        </p>
        <Steps
          items={[
            "Navigate to Import Timesheets in the sidebar.",
            "Click \"Choose File\" and select your CSV (Detailed Activity Report or simple format).",
            "Click \"Upload\". CHAMP-PM auto-detects the format, parses the file, and shows a summary: total rows, auto-mapped rows, and unmapped rows.",
            "If there are unmapped entries, open the \"Unmapped\" tab.",
            "For each unmapped staff name, select the correct CHAMP-PM staff member from the dropdown, or select 'Skip' to exclude that person from this import.",
            "For each unmapped project or task name, select the correct CHAMP-PM record or 'Skip'.",
            "Once all unmapped entries are resolved, click \"Confirm Import\". A confirmation shows how many entries were created.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Handling Unmapped Entries">
        <p>Common reasons a name appears as unmapped:</p>
        <Tips
          items={[
            "Name format differences: AURA exports names as \"Last, First\" (e.g., \"Smith, Jane\") while CHAMP-PM may store them differently. Once you map this once, it's saved for future imports.",
            "New staff members not yet added to CHAMP-PM — add them in the Staff page first, then re-upload.",
            "Project or activity names that differ between AURA and CHAMP-PM — use the dropdown to link them.",
            "Inactive staff — rows for staff marked inactive in CHAMP-PM are automatically skipped and listed separately; no action needed.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Saved Maps">
        <p>
          Once you map a name (e.g., "Smith, Jane" → Jane Smith), that mapping is saved permanently.
          Future imports that contain the same name are mapped automatically without prompting.
        </p>
        <Tips
          items={[
            "Saved maps persist across import sessions and apply to all future uploads.",
            "If a mapping becomes incorrect (e.g., a name collision after a new hire), edit it on the Maps Management tab.",
            "Staff, project, and task name maps are stored independently.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Re-Running an Import After Fixes">
        <Steps
          items={[
            "Fix the source CSV or the underlying CHAMP-PM records (add missing staff, projects, or tasks).",
            "Re-upload the same file. CHAMP-PM skips exact duplicates (same staff, same date, same task, same hours) so re-importing is safe.",
            "Review the import summary to confirm all rows processed correctly.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Import vs. Manual Entry">
        <ColDef
          cols={[
            ["Use Import when...", "You are doing your regular AURA sync (weekly or bi-weekly), you have a backlog of weeks to catch up, or you are migrating historical data."],
            ["Use Manual Entry when...", "You are correcting a single existing entry, entering hours for one person for the current week, or the change is too small to warrant a CSV export."],
          ]}
        />
      </GuideSection>

      <GuideSection title="Tips & Common Questions">
        <Tips
          items={[
            "Imported entries start in draft status. Go to the Timesheets page and batch-approve after a large import.",
            "Inactive staff rows (people who have left ISWS) are automatically skipped — you'll see them listed in the import summary as skipped/inactive, not as errors.",
            "There is no row limit, but very large files (10,000+ rows) may take 30–60 seconds to process.",
            "Always keep the original AURA export as documentation in case of audit questions.",
            "The import does not modify or delete existing timesheet entries — it only adds new ones.",
          ]}
        />
      </GuideSection>

      <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
        <a href="/admin/docs/user-guide/import" className="text-blue-600 underline">View full documentation →</a>
      </div>
    </div>
  );
}
