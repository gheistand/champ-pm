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
          <th className="px-3 py-2 text-left font-medium text-gray-600 border-b border-gray-200">Field</th>
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

export default function PRIDESyncGuide() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <GuideHeader
        title="PRIDE Sync"
        subtitle="One-click salary and appointment data sync from the ISWS PRIDE staff planning tool."
      />

      <GuideSection title="What This Does">
        <p>
          PRIDE (the ISWS/NCSA staff planning system at <code>pride.prairie.illinois.edu</code>) is the
          authoritative source for salary rates and appointment percentages at Illinois. Historically,
          keeping CHAMP-PM in sync with PRIDE required manually copying and pasting from PRIDE's Monthly
          Staff Plan page into spreadsheets and then importing into CHAMP-PM.
        </p>
        <p>
          The PRIDE Sync bookmarklet eliminates that manual step. When you click it while viewing the
          PRIDE Monthly Staff Plan page, it automatically reads the current salary and appointment data
          for all CHAMP staff and sends it directly to CHAMP-PM.
        </p>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <strong>What gets synced:</strong> Current annual salaries for all 25 CHAMP staff members,
          plus job end dates (when present in PRIDE).
        </div>
      </GuideSection>

      <GuideSection title="How It Works">
        <p>
          The bookmarklet is a small piece of JavaScript saved as a browser bookmark. When clicked on
          the PRIDE staffplan page, it:
        </p>
        <Steps
          items={[
            'Reads the Monthly Staff Plan table directly from the page DOM — no screen-scraping or copy-paste required.',
            'Extracts: employee name, UIN, annual salary, employment type, job end date, and monthly allocation percentages by category.',
            'Matches each employee\'s UIN to their CHAMP-PM user ID using a built-in mapping table.',
            'POSTs the structured data to the CHAMP-PM /api/pride/sync endpoint using your personal sync token.',
            'Shows a floating status card with a summary of what changed: salary updates, discrepancies flagged for review, end date changes.',
          ]}
        />
        <p>
          Because the bookmarklet runs inside your already-authenticated PRIDE browser session, no
          credential sharing is required. Your PRIDE password never leaves your browser.
        </p>
      </GuideSection>

      <GuideSection title="One-Time Setup">
        <Steps
          items={[
            'Get the sync token from your administrator (or set one via: npx wrangler pages secret put PRIDE_SYNC_TOKEN --project-name champ-pm).',
            'Go to https://champ-pm.app/bookmarklet.txt in your browser.',
            'Select all the text on that page (Cmd+A) and copy it.',
            'In your browser, create a new bookmark. Set the Name to "CHAMP-PM Sync" and paste the copied text as the URL.',
            'Save the bookmark to your bookmarks bar for easy access.',
            'The first time you click the bookmarklet on PRIDE, it will prompt for your sync token. Enter it once — it will be saved in your browser\'s localStorage for future runs.',
          ]}
        />
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 mt-2">
          <strong>Token storage:</strong> The sync token is saved in <code>localStorage</code> under the
          key <code>champ_pm_pride_token</code> in your browser. It is never sent to PRIDE — only to
          champ-pm.app. If your token is ever rotated, clear it by opening your browser DevTools console
          on any page and running: <code>localStorage.removeItem('champ_pm_pride_token')</code>
        </div>
      </GuideSection>

      <GuideSection title="Running a Sync">
        <Steps
          items={[
            'Log into PRIDE at https://pride.prairie.illinois.edu/',
            'Navigate to Staff Plan → Monthly Staff Plan (staffplan.php). Make sure the full table has loaded.',
            'Click the "CHAMP-PM Sync" bookmark in your bookmarks bar.',
            'A blue loading card will appear in the top-right corner of the page.',
            'After a few seconds it turns green and displays the sync summary.',
            'The card auto-dismisses after 15 seconds.',
          ]}
        />
        <Tips
          items={[
            'The Monthly Staff Plan defaults to FY26 (current fiscal year). You can filter by survey or org if needed, but for a full sync leave filters at their defaults.',
            'The bookmarklet processes all visible employees, so make sure no name filter is active when you sync.',
            'Run a sync whenever you update salaries in PRIDE — typically after each annual merit round or appointment change.',
          ]}
        />
      </GuideSection>

      <GuideSection title="Understanding the Sync Results">
        <ColDef
          cols={[
            ['✔ Salary matches', 'PRIDE and CHAMP-PM agree — no action taken.'],
            ['📈 Salary updates', 'PRIDE shows a higher salary than CHAMP-PM. A new salary record was automatically inserted into CHAMP-PM (append-only, preserving history).'],
            ['⚠️ Discrepancies (review)', 'CHAMP-PM has a higher salary than PRIDE. This is unusual and flagged for manual review — no automatic change is made.'],
            ['📅 End date updates', 'A job end date was found in PRIDE and written to the users table in CHAMP-PM.'],
            ['❓ Unknown UIns', 'PRIDE contains an employee whose UIN is not in CHAMP-PM\'s mapping table — typically a new hire or non-CHAMP staff member.'],
          ]}
        />
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 mt-3">
          <strong>Known discrepancy:</strong> As of May 2026, Gregory Byard shows $110,806 in CHAMP-PM
          vs $102,806 in PRIDE. This is flagged on every sync until resolved. Investigate whether
          CHAMP-PM has a manual salary entry that needs correction.
        </div>
      </GuideSection>

      <GuideSection title="What Is NOT Synced">
        <p>
          The current bookmarklet syncs salaries and end dates only. The following data from PRIDE
          is parsed by the bookmarklet but not yet written to CHAMP-PM:
        </p>
        <Tips
          items={[
            'Monthly allocation percentages by account category (Federal Grants, ISWS GRF, etc.) — these are read-only in the current version.',
            'Specific account strings (CFOPs) — these live on the individual edit.php?uin= pages in PRIDE, not on the monthly summary page.',
            'Appointment start/end dates at the account level.',
          ]}
        />
        <p>
          A future version will optionally sync allocation percentages into Staff Plan appointments
          directly, further reducing manual PRIDE entry work.
        </p>
      </GuideSection>

      <GuideSection title="Security Notes">
        <Tips
          items={[
            'The bookmarklet runs entirely in your browser — your PRIDE session cookie is never exposed to CHAMP-PM.',
            'The only credential transmitted to CHAMP-PM is the sync token (a pre-shared key unrelated to your NetID password).',
            'The /api/pride/sync endpoint rejects all requests without a valid token. Tokens can be rotated at any time via Cloudflare Pages secrets.',
            'CORS headers on the endpoint explicitly allow only requests from pride.prairie.illinois.edu.',
          ]}
        />
      </GuideSection>
    </div>
  );
}
