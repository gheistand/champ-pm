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

export default function ImportGuide() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <GuideHeader
        title="Import Timesheets"
        subtitle="Bulk-load timesheet hours from a CSV file with staff and project name mapping."
      />

      <GuideSection title="What This Page Does">
        <p>
          The Import page lets you bulk-load timesheet entries from a CSV file — useful when staff have
          been tracking hours outside of CHAMP-PM (e.g., in a spreadsheet) and you need to bring that
          historical data into the system. Staff and project names in the CSV are mapped to CHAMP-PM IDs
          before import completes.
        </p>
        <p>
          Imported entries start in 'draft' status and still require Admin approval before they count toward
          budget calculations.
        </p>
      </GuideSection>

      <GuideSection title="When to Use It">
        <p>
          Use the import tool when onboarding legacy timesheet data from a prior tracking system, when
          a staff member has been tracking hours offline for several weeks and needs to catch up, or when
          another system (e.g., a project management tool) exports hours in CSV format. For ongoing week-by-week
          entry, staff should use the Timesheets page directly rather than importing.
        </p>
      </GuideSection>

      <GuideSection title="CSV Format Requirements">
        <p>
          Your CSV file must have exactly these five column headers in the first row (case-sensitive):
        </p>
        <ColDef
          cols={[
            ["date", "The date the hours were worked. Format: YYYY-MM-DD (e.g., 2026-04-07). The import system determines the Monday–Sunday week from this date automatically."],
            ["staff_name", "The name of the staff member. Must be an exact match to a name in CHAMP-PM, or it will be flagged as unmapped (see Mapping section)."],
            ["project_name", "The name of the project the hours are charged to. Must match a CHAMP-PM project name or will be flagged as unmapped."],
            ["task_name", "The name of the task within the project. Must match a CHAMP-PM task name under the specified project, or will be flagged as unmapped."],
            ["hours", "Number of hours worked. Decimal fractions are allowed (e.g., 2.5). Must be greater than 0."],
          ]}
        />
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <strong>Note:</strong> The CSV must be UTF-8 encoded. Extra columns are ignored but the five required
          columns must be present. The header row is required — do not omit it.
        </div>
        <p className="mt-2">Example CSV rows:</p>
        <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs overflow-x-auto">
{`date,staff_name,project_name,task_name,hours
2026-04-07,Jane Smith,Coastal Flood Mapping,Data Collection,6.0
2026-04-07,Jane Smith,Coastal Flood Mapping,QA Review,2.0
2026-04-08,Bob Jones,Hydrology Analysis,Report Writing,8.0`}
        </pre>
      </GuideSection>

      <GuideSection title="The Mapping Workflow">
        <p>
          After you upload the CSV, CHAMP-PM attempts to match each unique staff_name, project_name, and
          task_name to existing records. Names that match exactly are mapped automatically. Names that
          do not match exactly are flagged as unmapped and require manual resolution before the import
          can complete.
        </p>
        <Steps
          items={[
            "Navigate to Import Timesheets in the sidebar.",
            "Click \"Choose File\" and select your CSV.",
            "Click \"Upload\". The system parses the file and shows a summary: total rows, auto-mapped rows, and unmapped rows.",
            "If there are unmapped entries, click the \"Unmapped\" tab to see them.",
            "For each unmapped staff name, use the dropdown to select the correct CHAMP-PM staff member from the list. Or select 'Skip' to exclude all rows for that name from this import.",
            "For each unmapped project or task name, use the dropdown to select the correct CHAMP-PM project or task. Or select 'Skip'.",
            "Once all unmapped entries are resolved (mapped or skipped), the \"Confirm Import\" button becomes active.",
            "Click \"Confirm Import\" to create the timesheet entries. A confirmation message shows how many entries were created.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Handling Unmapped Entries">
        <p>
          An entry is unmapped when its staff_name, project_name, or task_name does not exactly match a
          record in CHAMP-PM. Common reasons:
        </p>
        <Tips
          items={[
            "Name variations: 'J. Smith' vs 'Jane Smith', or 'Coastal Mapping' vs 'Coastal Flood Mapping'.",
            "Typos in the source CSV.",
            "The project or task exists in CHAMP-PM but under a slightly different name.",
            "The staff member, project, or task genuinely does not exist in CHAMP-PM yet — you must create it before you can map to it.",
          ]}
        />
        <p>
          For entries you skip, no timesheet records are created for those rows. You can re-run the import
          with the same or corrected CSV after fixing the underlying data (either in the CSV or in CHAMP-PM)
          — the import tool does not create duplicates if you re-upload a file, as long as the dates and
          staff-task combinations are the same.
        </p>
      </GuideSection>

      <GuideSection title="Saved Maps">
        <p>
          Once you complete a mapping (linking a CSV name to a CHAMP-PM ID), that mapping is saved for future
          imports. The next time you upload a CSV that contains "J. Smith", the system will automatically
          map it to the staff record you previously linked without requiring manual resolution.
        </p>
        <Tips
          items={[
            "Saved maps persist across import sessions. If a name mapping becomes incorrect (e.g., a staff member leaves and a new person with a similar name joins), you can edit saved maps on the Maps Management tab.",
            "Saved maps apply to staff names, project names, and task names independently.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Re-Running an Import After Fixes">
        <Steps
          items={[
            "If an import had errors or unmapped entries you skipped, fix the source CSV (correct the names, add missing rows, etc.) and re-upload.",
            "Or, fix the CHAMP-PM records first (create missing projects, tasks, or staff members), then re-upload the original CSV.",
            "The import tool will not create duplicate entries for rows that were already successfully imported. It skips exact duplicates (same staff, same date, same task, same hours).",
            "Review the import summary after re-running to confirm all rows were processed correctly.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Import vs. Manual Entry — When to Use Each">
        <ColDef
          cols={[
            ["Use Import when...", "You have a backlog of weeks (5+) to enter, you are migrating from a legacy system, or you have a batch of hours from a tool that exports CSV."],
            ["Use Manual Entry when...", "You are entering hours for the current or prior week, you have only a few entries to add, or you are correcting a specific existing entry."],
          ]}
        />
      </GuideSection>

      <GuideSection title="Tips & Common Questions">
        <Tips
          items={[
            "The import creates entries in 'draft' status. An Admin must still approve them before they count toward budget. After importing a large batch, go to the Timesheets page and batch-approve the entries.",
            "There is no row limit on the CSV file, but very large files (10,000+ rows) may take 30–60 seconds to process.",
            "If your CSV has a notes column in addition to the required five, it will be ignored. Add notes manually to individual entries after import if needed.",
            "Always keep the original source CSV as documentation in case of audit questions about how the entries were created.",
          ]}
        />
      </GuideSection>

      <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
        <a href="/admin/docs/user-guide/import" className="text-blue-600 underline">View full documentation →</a>
      </div>
    </div>
  );
}
