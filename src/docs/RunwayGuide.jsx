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

export default function RunwayGuide() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <GuideHeader
        title="Runway & Burn Rate"
        subtitle="How many months of funding remain at your current labor spend rate."
      />

      <GuideSection title="What This Page Does">
        <p>
          Runway tells you how long each grant's remaining balance will last at the current pace of spending.
          It combines a manually-entered PRIDE balance with the system's calculated burn rate (average monthly
          loaded labor cost) to produce a runway estimate in months.
        </p>
        <p>
          Because balances are entered manually from PRIDE — not pulled live — the accuracy of runway estimates
          depends entirely on how recently the balances were updated. Always check the "Balance as of" date
          before acting on runway numbers.
        </p>
      </GuideSection>

      <GuideSection title="When to Use It">
        <p>
          Review runway after each PRIDE reconciliation (typically monthly) and before any staffing decisions.
          Use it in conjunction with the Staff Plans page when deciding appointment percentages for the next
          budget period. A grant with only 3 months of runway should not be supporting a full-time appointment
          for 12 months.
        </p>
      </GuideSection>

      <GuideSection title="What Runway Means">
        <p>
          Runway is expressed in months. It answers the question: "If we keep spending at our current monthly
          rate, how many months until this grant runs out of money?"
        </p>
        <ColDef
          cols={[
            ["Grant Balance", "The remaining unspent balance as entered from PRIDE. This is a labor balance only (or total balance — note which one you are entering for consistency)."],
            ["Burn Rate", "Average monthly loaded labor cost calculated from approved timesheets over the trailing 3-month window (configurable)."],
            ["Runway (months)", "Grant Balance ÷ Burn Rate. Rounded to one decimal place."],
            ["PoP Remaining (months)", "Months from today to the grant end_date. If Runway > PoP Remaining, the grant may underspend. If Runway < PoP Remaining, the grant may run out of money before the end."],
            ["Balance as of", "The date the balance was last manually updated. Stale balances (older than 30 days) are highlighted in amber."],
          ]}
        />
        <Tips
          items={[
            "Runway < PoP Remaining is a warning sign — you may need to reduce appointments or request supplemental funding.",
            "Runway >> PoP Remaining means money will likely be left on the table — consider increasing appointment percentages or scope of work.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Burn Rate Formula">
        <p>
          The burn rate is calculated from approved timesheet data only. The formula:
        </p>
        <p className="font-mono bg-gray-50 border border-gray-200 rounded p-3 text-xs">
          Burn Rate = Sum of approved loaded labor costs over trailing N months ÷ N
        </p>
        <p>
          The default trailing window is 3 months. You can change this in the Runway settings panel.
          A shorter window (1 month) is more responsive to recent changes in staffing. A longer window
          (6 months) smooths out irregular months and gives a more stable estimate.
        </p>
        <Tips
          items={[
            "If a grant had no approved timesheets in a given month (e.g., between grant periods), that month is excluded from the average to avoid artificially low burn rates.",
            "A burn rate of $0 means no approved timesheets have been charged to this grant — verify this is intentional.",
          ]}
        />
      </GuideSection>

      <GuideSection title="How to Enter or Update Balances">
        <Steps
          items={[
            "Log into PRIDE and pull the current grant balance for each active grant. Use the 'remaining encumbrance' or 'available balance' field — be consistent about which you use across all grants.",
            "Navigate to Runway & Burn Rate in the CHAMP-PM sidebar.",
            "Find the grant whose balance you want to update and click the pencil/edit icon on its row.",
            "Enter the new balance amount and the date it was pulled from PRIDE.",
            "Click Save. The runway calculation updates immediately.",
            "Repeat for all active grants.",
          ]}
        />
        <Tips
          items={[
            "Update balances immediately after each monthly PRIDE reconciliation — do not let them go stale.",
            "If you are using the labor-only balance from PRIDE (excluding travel, equipment, etc.), note this in the grant's notes field so future users understand the context.",
            "Balances older than 30 days are flagged in amber on the Runway page as a reminder to refresh.",
          ]}
        />
      </GuideSection>

      <GuideSection title="When to Re-Enter Balances">
        <Tips
          items={[
            "After each monthly PRIDE reconciliation — this is the primary trigger.",
            "After a grant modification that changes the budget (new award or supplement).",
            "After a no-cost extension is approved and the end date changes.",
            "Before running or updating Staff Plan scenarios — stale balances lead to incorrect runway projections in Staff Plans.",
            "Whenever a program officer or supervisor asks for a current runway estimate.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Connection to Staff Plans">
        <p>
          The Runway page and the Staff Plans page share the same grant balance data. When you create or
          update a Staff Plans scenario, it reads the grant balances from the Runway page to show how
          many months each grant can sustain the proposed appointment schedule.
        </p>
        <p>
          This means: if your Runway balances are stale, your Staff Plans projections will be wrong.
          Always refresh balances before finalizing a Staff Plans scenario for a budget period.
        </p>
      </GuideSection>

      <GuideSection title="Tips & Common Questions">
        <Tips
          items={[
            "Runway is a projection, not a guarantee. Actual expenditures depend on payroll timing, fringe rate adjustments, and non-labor costs not captured here.",
            "A grant with a very high burn rate but short runway may need an emergency appointment reduction — flag this for your section chief.",
            "If burn rate seems too low for a grant you know is heavily staffed, check that all timesheets for that grant are approved and not stuck in 'submitted' status.",
            "The runway table can be sorted by Runway (months) ascending to quickly see which grants are most at risk.",
          ]}
        />
      </GuideSection>

      <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
        <a href="/admin/docs/user-guide/runway" className="text-blue-600 underline">View full documentation →</a>
      </div>
    </div>
  );
}
