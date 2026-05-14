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
          the resulting monthly costs, and see whether each grant's balance is on track to spend down to
          zero by its Period of Performance end date.
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
          buys), when a key grant is expiring and you need to concentrate labor on it, or when you want to
          check whether current staffing levels are sufficient to spend down the portfolio by each PoP end.
        </p>
      </GuideSection>

      <GuideSection title="The Sandbox Rule">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <strong>Scenarios are sandboxed.</strong> Creating, modifying, or deleting a Staff Plans scenario
          has zero effect on actual staff records, salary data, timesheets, or grant assignments in CHAMP-PM.
          The only way to act on a scenario is to export it and manually enter the appointments in PRIDE.
        </div>
      </GuideSection>

      <GuideSection title="The LP Optimizer">
        <p>
          When you create a new scenario, CHAMP-PM runs a <strong>Linear Programming optimizer</strong> to
          generate an initial set of allocation percentages. This is not a simple heuristic — it solves
          a constrained optimization problem across all staff and all grants simultaneously to find the
          globally best allocation given the current balances and PoP dates.
        </p>
        <p><strong>What the optimizer maximizes:</strong></p>
        <Tips
          items={[
            "Spend-down toward zero for each grant — grants that expire sooner receive higher weight in the objective.",
            "Distribution across eligible grants — no single grant is given more than its proportional share (with a modest urgency premium).",
          ]}
        />
        <p><strong>Hard constraints the optimizer always respects:</strong></p>
        <Tips
          items={[
            "Each person must sum to exactly 100% in every planning period.",
            "No grant can be over-spent — total projected cost across all staff cannot exceed the grant's remaining balance.",
            "Pinned allocations (marked in the Grant Balances tab) are treated as fixed and not adjusted.",
            "Staff with a termination date receive no allocation in periods after that date.",
          ]}
        />
        <p><strong>Slack / overhead:</strong></p>
        <p>
          If a person's total eligible grant capacity is less than 100% of their salary (e.g., all their
          grants are fully consumed by the rest of the team), the optimizer assigns the remainder to an
          overhead/GRF bucket rather than over-spending any grant. This ensures the math always balances to
          100% even when grants can't absorb the full team.
        </p>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <strong>The optimizer output is a starting point, not a final answer.</strong> Review the generated
          scenario, adjust percentages as needed for practical or policy reasons, and confirm before exporting.
        </div>
      </GuideSection>

      <GuideSection title="How the Optimizer Handles Urgency">
        <p>
          Each grant's urgency weight is calculated as:
        </p>
        <p className="font-mono bg-gray-50 border border-gray-200 rounded p-3 text-xs">
          urgency = 1 / √(months_to_PoP_end + 1)
        </p>
        <p>
          A grant expiring in 3 months has roughly twice the urgency weight of a grant expiring in 12 months
          (not four times, as a linear formula would give). This <em>dampened</em> weighting means urgent
          grants attract more allocation without completely starving grants with longer PoPs.
        </p>
        <p>
          Per-grant allocation is also capped at approximately 1.2× the fair share per person (based on how
          many eligible grants they have), with a hard ceiling of 60%. So a person eligible for 4 grants
          can have at most ~30% on any single grant in one period, producing natural-looking distributions
          rather than extreme concentration.
        </p>
      </GuideSection>

      <GuideSection title="Burn Rate Formula">
        <p>
          Staff Plans uses the following formula to calculate cost for each appointment line per period:
        </p>
        <p className="font-mono bg-gray-50 border border-gray-200 rounded p-3 text-xs">
          Period Cost = (Annual Salary ÷ 12) × Months × Allocation% × (1 + Fringe Rate) × (1 + F&A Rate)
        </p>
        <p>
          For a typical Academic Professional staff member on a FEMA grant:
        </p>
        <p className="font-mono bg-gray-50 border border-gray-200 rounded p-3 text-xs">
          Period Cost = (Salary ÷ 12) × Months × Allocation% × 1.451 × 1.317
        </p>
        <Tips
          items={[
            "The fringe multiplier (1.451) reflects the FY2026 AP rate of 45.1%.",
            "The F&A multiplier (1.317) reflects ISWS's 31.7% MTDC rate — applied to all FEMA/DHS grants, no exceptions.",
            "The optimizer splits the plan into sub-periods at each grant's PoP end date so costs are correctly attributed only while the grant is active.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Creating a Scenario">
        <Steps
          items={[
            "Navigate to Staff Plans → Plan Builder tab.",
            "Click \"New Scenario\".",
            "Enter a scenario name (e.g., 'FY2026 Q3-Q4 Plan') and set start and end dates.",
            "Click Create. The optimizer runs automatically and populates an initial set of allocation rows.",
            "Review the rows in the Plan Builder table. Each row shows staff member, grant, period, allocation %, and estimated cost.",
            "Adjust any percentages that don't match operational reality (e.g., a person is only available for specific grants).",
            "Check the Visualizations tab to see Runway Status, Burn-Down Chart, and Allocation Timeline.",
            "When satisfied, export to Excel for PRIDE entry.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Visualizations Tab — Runway Status Cards">
        <p>
          The Runway Status cards show how each grant is projected to perform against its PoP end date.
          Status is based on <strong>burn rate</strong> — whether the projected monthly spend is fast enough
          to zero out the grant by its PoP end — not just whether the scenario is within budget.
        </p>
        <ColDef
          cols={[
            ["On Track", "Projected monthly burn ≥ 85% of the rate required to reach zero by PoP end. The grant will be substantially spent down."],
            ["At Risk", "Projected monthly burn is 60–85% of the required rate. The grant will likely underspend unless allocations are increased."],
            ["Under-allocated", "Projected monthly burn is less than 60% of the required rate. Significant underspend is likely — consider increasing team allocations to this grant, extending the PoP, or both."],
            ["Over Budget", "Projected total spend exceeds the grant's remaining balance. Reduce allocations."],
            ["Unknown", "No balance has been entered for this grant. Enter a balance in the Grant Balances tab before interpreting status."],
          ]}
        />
        <p className="mt-2">
          Each card also shows a <strong>burn rate X% of required</strong> annotation so you can see
          exactly how far off the pace you are. For example, "burn rate 52% of required" means the scenario
          is projecting spending at about half the pace needed to zero out the grant by its PoP.
        </p>
        <Tips
          items={[
            "\"Under-allocated\" on a large grant (EMC-2021, EMC-2022) often means the team's total eligible labor capacity is insufficient to spend the grant down alone — consider whether a no-cost extension or additional headcount is warranted.",
            "\"On Track\" does not guarantee exact zero-out — it means the burn rate is close enough that normal variation should result in full spend.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Visualizations Tab — Burn-Down Chart">
        <p>
          The Burn-Down Chart shows projected remaining balance over time for each grant in the scenario.
          Each line starts at the current remaining balance and slopes down as the optimizer's estimated
          costs accumulate. Dotted vertical lines mark each grant's PoP end date.
        </p>
        <Tips
          items={[
            "A line that reaches zero before its PoP line means the grant is projected to be fully spent — ideally this is what you want.",
            "A line that is still well above zero when it hits the PoP line means the grant will have unspent funds at expiration.",
            "Adjust allocation percentages in Plan Builder and regenerate the scenario to see how changes affect the burn-down curves.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Grant Balances Tab">
        <p>
          The Grant Balances tab manages the remaining balance and PoP end date for each grant used in
          Staff Plan scenarios. Balances are synced from the Runway page (which reads from PRIDE/Banner)
          but can be manually overridden if you know of pending expenditures not yet reflected in PRIDE.
        </p>
        <ColDef
          cols={[
            ["Sync All from Runway", "Pulls the latest balance from every active Runway grant and updates the Staff Plan balance table. Use this at the start of each planning cycle."],
            ["Pinned", "A pinned grant keeps its allocation fixed at the pinned percentage across all staff. The optimizer will not adjust pinned grants. Use for grants with contractual minimums."],
            ["Priority Rank", "Used by the optimizer to break ties when two grants have similar urgency. Lower rank = higher priority. 99 = default (no preference)."],
            ["Manual Override", "If you set a manual balance, it will be used instead of the Runway sync balance until you clear the override. Useful for modeling pending drawdowns."],
          ]}
        />
      </GuideSection>

      <GuideSection title="Exporting for PRIDE">
        <Steps
          items={[
            "Open the finalized scenario in Plan Builder.",
            "Click \"Export for PRIDE\".",
            "The system generates an Excel file with one row per staff member–grant combination: name, grant CFOP, allocation percentage, and period.",
            "Download and use this file as the source document for PRIDE appointment entry.",
            "CHAMP-PM does not auto-upload to PRIDE — manual entry is required.",
          ]}
        />
        <Tips
          items={[
            "Compare the exported file against the most recent PRIDE appointment printout before entry to catch any changes.",
            "Archive the exported file with a date stamp for each budget period as documentation.",
          ]}
        />
      </GuideSection>

      <GuideSection title="AI-Assisted Optimization Goals">
        <p>
          The <strong>✨ AI Goals</strong> button in the Plan Builder toolbar opens a collapsible panel
          where you can describe your optimization priorities in plain English before running the
          optimizer. This is entirely optional — leaving the panel closed runs the standard LP
          optimization exactly as before.
        </p>
        <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg text-sm text-violet-900 mt-2 mb-3">
          <strong>Example goals you can type:</strong>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>"Prioritize burning down the FY23 grants before their POP expires"</li>
            <li>"Don't put Nazmul on FY22 grants"</li>
            <li>"Keep Zaloudek at least 30% on FY24 FEMA"</li>
            <li>"Spread allocations more evenly — avoid concentrating anyone above 40% on a single grant"</li>
            <li>"Maximize spend on grants expiring before December"</li>
          </ul>
        </div>
        <p><strong>How it works:</strong></p>
        <Tips
          items={[
            'Your goals are sent to an AI model (Claude) along with the current grant balances, PoP dates, and staff roster as context.',
            'The AI translates your goals into structured constraint overrides: urgency multipliers per grant, per-person allocation caps/floors, and staff-grant exclusions.',
            'Those overrides are merged into the LP optimizer, which then solves as normal — respecting all hard constraints (budget caps, 100% rule, pinned rows).',
            'After the run, a violet explanation banner shows what the AI adjusted and why.',
            'Pinned rows and manual overrides are always preserved, regardless of AI goals.',
          ]}
        />
        <p><strong>What the AI can adjust:</strong></p>
        <ColDef
          cols={[
            ['Grant urgency multipliers', 'Boost or reduce how aggressively the optimizer targets a specific grant. Example: "prioritize FY23" doubles the urgency weight on all FY23 grants.'],
            ['Per-person grant caps', 'Override the default 60% per-person cap for specific person-grant pairs. Example: "keep Zaloudek above 30% on FY24" sets a minimum floor.'],
            ['Per-person grant floors', 'Set a minimum allocation for a specific person-grant combination.'],
            ['Exclusions', 'Remove a specific person from a specific grant entirely. Example: "don\'t put Nazmul on FY22".'],
          ]}
        />
        <p><strong>What the AI cannot change:</strong></p>
        <Tips
          items={[
            'Hard budget caps — the LP will never project spending more than a grant\'s remaining balance.',
            'The 100% constraint — every person\'s allocations must sum to exactly 100% in every period.',
            'Pinned rows — grants marked as pinned retain their fixed percentage.',
            'The salary math — all cost projections remain accurate regardless of AI goals.',
          ]}
        />
        <p>
          Click <strong>"Reset to standard"</strong> to re-run without AI goals at any time.
          The AI Goals panel is powered by Claude (Anthropic) and requires the
          <code>ANTHROPIC_API_KEY</code> Cloudflare Pages secret to be configured.
        </p>
      </GuideSection>

      <GuideSection title="Tips & Common Questions">
        <Tips
          items={[
            "You can have multiple active scenarios simultaneously — for example, a base case and an alternative in case a grant renewal is delayed.",
            "The optimizer runs once when a scenario is created. If you update grant balances or staff eligibility afterward, delete the scenario and create a new one to get a fresh optimized result.",
            "Staff Plans uses the most recent salary record for each person. If a merit increase takes effect mid-scenario, the cost projection uses the pre-increase salary for the whole period.",
            "If staff are showing up with no grant allocations (all slack), check that they have entries in the Appointments tab with active grants.",
            "The Under-allocated status on large multi-year grants (like EMC-2021 or EMC-2022) is often a portfolio reality, not a mistake — the total team labor capacity may simply be less than the total grant balances. Use this as input for NCE requests or hiring decisions.",
          ]}
        />
      </GuideSection>

      <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
        <a href="/admin/docs/user-guide/staff-plans" className="text-blue-600 underline">View full documentation →</a>
      </div>
    </div>
  );
}
