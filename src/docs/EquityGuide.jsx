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

export default function EquityGuide() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <GuideHeader
        title="Equity Dashboard"
        subtitle="Pay equity analysis using compa-ratio, percentile in band, and tenure-adjusted equity gap."
      />

      <GuideSection title="What This Page Does">
        <p>
          The Equity Dashboard provides a data-driven view of pay equity within the CHAMP section. It
          calculates three metrics for each staff member: compa-ratio (how their salary compares to the
          band midpoint), percentile in band (where they sit within the min-max range), and equity gap
          (how their salary compares to what would be expected given their tenure).
        </p>
        <p>
          This tool supports fair pay conversations and merit increase decisions. It does not make
          decisions — it surfaces data that section leadership can use to make informed choices.
        </p>
      </GuideSection>

      <GuideSection title="When to Use It">
        <p>
          Review the Equity Dashboard before merit increase cycles, when onboarding a new hire and setting
          a starting salary, after a reclassification, or any time a staff member raises a pay equity
          concern. Save a snapshot before and after each merit cycle to track progress over time.
        </p>
      </GuideSection>

      <GuideSection title="Data Requirements Checklist">
        <p>
          The Equity Dashboard requires the following data to be set up correctly before meaningful
          analysis is possible:
        </p>
        <Tips
          items={[
            "Each staff member must have a band_classification set on their Staff record.",
            "Each band_classification must be defined in the Pay Bands table with a minimum, midpoint, and maximum salary.",
            "Each staff member must have a current salary record (most recent effective_date).",
            "Each staff member must have a start_date set (used for overall tenure).",
            "Each staff member must have a role_start_date set (used for within-classification tenure).",
            "Staff without all of the above fields will appear greyed out in the dashboard with a 'Incomplete data' indicator.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Setting Up Band Classifications">
        <Steps
          items={[
            "Navigate to Equity Dashboard in the sidebar.",
            "Click the \"Manage Pay Bands\" tab.",
            "Click \"Add Pay Band\" and enter: band name (must match the band_classification values used on staff records), minimum salary, midpoint salary, and maximum salary.",
            "Save the band. It is now available for assignment to staff members.",
            "Open each staff record in Staff Management and set the band_classification field to match one of the defined band names.",
            "Repeat for all active staff. Return to the Equity Dashboard — staff with complete data will now show equity metrics.",
          ]}
        />
        <Tips
          items={[
            "Band names are case-sensitive and must match exactly. 'RS-Band-1' and 'rs-band-1' are different.",
            "Bands should be set at the level of classification (e.g., Research Scientist, Principal Research Scientist) and ideally differentiated by sub-band if ISWS uses pay ranges within a classification.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Understanding Compa-Ratio">
        <p>
          Compa-ratio measures a staff member's salary relative to the midpoint of their pay band:
        </p>
        <p className="font-mono bg-gray-50 border border-gray-200 rounded p-3 text-xs">
          Compa-Ratio = Annual Salary ÷ Band Midpoint
        </p>
        <ColDef
          cols={[
            ["< 0.85", "Significantly below market midpoint. The staff member may be underpaid relative to their classification. Priority for merit consideration."],
            ["0.85 – 1.00", "Below midpoint. Within normal range for newer or developing employees in the band."],
            ["1.00", "Exactly at band midpoint. Considered 'fully competitive' pay."],
            ["1.00 – 1.15", "Above midpoint. Normal for experienced, high-performing staff."],
            ["> 1.15", "Above market. May indicate the band midpoint needs revision, or the staff member is a long-tenured high performer."],
          ]}
        />
      </GuideSection>

      <GuideSection title="Understanding Percentile in Band">
        <p>
          Percentile in band shows where a staff member's salary falls within the minimum-to-maximum range
          of their band:
        </p>
        <p className="font-mono bg-gray-50 border border-gray-200 rounded p-3 text-xs">
          Percentile = (Salary − Band Min) ÷ (Band Max − Band Min) × 100
        </p>
        <Tips
          items={[
            "0th percentile = at the band minimum. 100th percentile = at the band maximum.",
            "A staff member below the 25th percentile of their band may warrant review, especially if they have significant tenure.",
            "This metric is most useful when comparing two staff members in the same band who have similar tenure.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Understanding Equity Gap">
        <p>
          Equity gap compares a staff member's actual salary to the expected salary for their tenure,
          calculated by linear interpolation across the band range. The model assumes that with zero tenure
          in a role, a person starts at the band minimum, and at a defined maximum tenure (typically 20 years),
          they would be at the band maximum.
        </p>
        <p className="font-mono bg-gray-50 border border-gray-200 rounded p-3 text-xs">
          Expected Salary = Band Min + (Tenure ÷ Max Tenure) × (Band Max − Band Min)<br />
          Equity Gap = Expected Salary − Actual Salary
        </p>
        <ColDef
          cols={[
            ["Positive equity gap", "The staff member's expected salary (based on tenure) is higher than their actual salary. A positive gap means they are likely underpaid given how long they have been in the role."],
            ["Zero equity gap", "Actual salary matches what the tenure model would predict. Fully aligned."],
            ["Negative equity gap", "Actual salary exceeds the tenure-based expectation. This is not a problem — it may reflect exceptional performance or a competitive hire."],
          ]}
        />
        <Tips
          items={[
            "Equity gap uses role_start_date (not start_date) for tenure in band calculations — so a recent reclassification resets the clock.",
            "The linear interpolation model is a simplification. Real salary progression is rarely perfectly linear. Use equity gap as one signal among several, not as a precise formula.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Running and Saving Snapshots">
        <Steps
          items={[
            "Navigate to Equity Dashboard.",
            "Review the current metrics for all staff. Filter by band or department using the filter controls.",
            "Click \"Save Snapshot\" and enter a label (e.g., 'Pre-FY2026 Merit Cycle' or 'April 2026 Review').",
            "The snapshot is saved with the current date and the equity metrics as of that moment.",
            "To compare snapshots, click the \"Snapshot History\" tab and select two snapshots to view side-by-side.",
          ]}
        />
        <Tips
          items={[
            "Save a snapshot before making merit increase decisions so you have a baseline.",
            "Save another snapshot after increases are entered to confirm the intended equity improvements were achieved.",
            "Snapshots are read-only — they cannot be edited after saving.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Tips & Common Questions">
        <Tips
          items={[
            "If a staff member is missing from the equity analysis, verify they have band_classification, start_date, role_start_date, and a current salary record all set.",
            "Compa-ratio and percentile in band use current salary. Equity gap uses role_start_date tenure. Reviewing all three together gives the most complete picture.",
            "The Equity Dashboard is visible to Admins only. Staff members do not see their own metrics in this view.",
            "Pay band definitions should be reviewed and updated annually to reflect market adjustments — stale bands produce misleading compa-ratios.",
          ]}
        />
      </GuideSection>

      <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
        <a href="/admin/docs/user-guide/equity" className="text-blue-600 underline">View full documentation →</a>
      </div>
    </div>
  );
}
