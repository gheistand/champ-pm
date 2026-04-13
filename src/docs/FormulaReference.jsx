import DocsTooltip from '../components/DocsTooltip';

function FormulaBlock({ children }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-mono text-sm text-gray-800 my-3">
      {children}
    </div>
  );
}

function VarTable({ rows }) {
  return (
    <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden my-3">
      <thead>
        <tr className="bg-gray-50">
          <th className="px-3 py-2 text-left font-medium text-gray-600 border-b border-gray-200">Variable</th>
          <th className="px-3 py-2 text-left font-medium text-gray-600 border-b border-gray-200">Description</th>
          <th className="px-3 py-2 text-left font-medium text-gray-600 border-b border-gray-200">Source</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([v, d, s], i) => (
          <tr key={i} className="border-b border-gray-100 last:border-0">
            <td className="px-3 py-2 font-mono text-xs text-blue-700">{v}</td>
            <td className="px-3 py-2 text-gray-700">{d}</td>
            <td className="px-3 py-2 text-gray-500 text-xs">{s}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Example({ calc }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 my-3 text-sm text-blue-900">
      <span className="font-semibold">Example: </span>{calc}
    </div>
  );
}

function FormulaSection({ id, number, title, children }) {
  return (
    <section id={id} className="mb-10 pb-8 border-b border-gray-200 last:border-0 docs-section">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        <span className="text-gray-400 font-normal mr-2">#{number}</span>{title}
      </h3>
      {children}
    </section>
  );
}

export default function FormulaReference() {
  return (
    <div className="docs-content max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Formula Reference</h2>
        <p className="text-gray-500 text-sm mt-1">
          All cost calculations used in CHAMP-PM, with variable definitions, examples, and source references.
          <span className="ml-3 text-gray-400">Last reviewed: April 2026</span>
        </p>
      </div>

      <FormulaSection id="hourly-loaded-rate" number={1} title="Hourly Loaded Rate">
        <p className="text-sm text-gray-600 mb-2">
          The fully burdened cost per hour for a staff member — base salary rate plus fringe benefits.
          Used as the per-hour cost in all timesheet cost calculations.
        </p>
        <FormulaBlock>
          Hourly Loaded Rate = (Annual Salary ÷ 2,080) × (1 + Fringe Rate)
        </FormulaBlock>
        <VarTable rows={[
          ['Annual Salary', 'Staff member\'s annual base salary', 'salary_records — most recent effective_date ≤ report end date'],
          ['2,080', 'Standard full-time hours per year (52 weeks × 40 hrs/week)', 'Fixed constant'],
          ['Fringe Rate', 'Benefits rate as a decimal (e.g., 0.328 = 32.8%)', 'salary_records.fringe_rate, matched by appointment_type'],
        ]} />
        <Example calc="Salary = $75,000, Fringe = 0.328 → ($75,000 ÷ 2,080) × 1.328 = $36.06 × 1.328 = $47.88/hr" />
        <p className="text-xs text-gray-500">
          Source: <code className="bg-gray-100 px-1 rounded">functions/api/reports/timesheet.js</code> —{' '}
          <code className="bg-gray-100 px-1 rounded">(salary / 2080) * (1 + fringe)</code>
        </p>
      </FormulaSection>

      <FormulaSection id="personnel-cost" number={2} title="Personnel Cost">
        <p className="text-sm text-gray-600 mb-2">
          The direct labor cost for a set of timesheet hours, using the loaded hourly rate.
        </p>
        <FormulaBlock>
          Personnel Cost = Hours Logged × Hourly Loaded Rate
        </FormulaBlock>
        <VarTable rows={[
          ['Hours Logged', 'Sum of approved timesheet hours for the period', 'timesheet_entries (approved only)'],
          ['Hourly Loaded Rate', 'See Formula #1', 'Calculated from salary_records + fringe_rates'],
        ]} />
        <Example calc="80 hours × $47.88/hr = $3,830.40" />
      </FormulaSection>

      <FormulaSection id="fa-cost" number={3} title="Facilities & Administrative (F&A) Cost">
        <p className="text-sm text-gray-600 mb-2">
          Indirect cost applied on top of personnel costs.{' '}
          <DocsTooltip tip="Modified Total Direct Costs — the cost basis for F&A calculations. Excludes equipment, subcontracts over $25K, and patient care costs.">MTDC</DocsTooltip>{' '}
          basis means F&A is applied to personnel costs only.
        </p>
        <FormulaBlock>
          F&A Cost = Personnel Cost × F&A Rate
        </FormulaBlock>
        <VarTable rows={[
          ['Personnel Cost', 'Direct labor cost (see Formula #2)', 'Calculated'],
          ['F&A Rate', 'Facilities & Administrative rate as a decimal', 'grant_fa_rates — most recent effective_date per grant'],
        ]} />
        <Example calc="$3,830.40 × 0.317 = $1,214.24" />
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 my-3 text-sm text-amber-900">
          <strong>Note:</strong> The "Other Sponsored Activity" rate at U of I is 31.7% MTDC for all FEMA/DHS grants.
          Different grant types may use different rates. Always verify via the Grant → F&A Rates tab.
        </div>
        <p className="text-xs text-gray-500">
          Source: <code className="bg-gray-100 px-1 rounded">functions/api/reports/timesheet.js</code> —{' '}
          <code className="bg-gray-100 px-1 rounded">const fa_cost = personnel_cost * fa</code>
        </p>
      </FormulaSection>

      <FormulaSection id="total-cost" number={4} title="Total Project Cost (per entry)">
        <p className="text-sm text-gray-600 mb-2">
          Full cost to the grant for a set of timesheet hours — personnel plus indirect costs.
        </p>
        <FormulaBlock>
          Total Cost = Personnel Cost + F&A Cost
        </FormulaBlock>
        <Example calc="$3,830.40 + $1,214.24 = $5,044.64" />
      </FormulaSection>

      <FormulaSection id="budget-burndown" number={5} title="Budget Burndown">
        <p className="text-sm text-gray-600 mb-2">
          Remaining balance for a grant after accounting for all approved labor costs.
        </p>
        <FormulaBlock>
          Remaining Budget = Grant Total Budget − Σ(Total Cost for all approved entries)
        </FormulaBlock>
        <VarTable rows={[
          ['Grant Total Budget', 'Full award amount including F&A', 'grants.total_budget'],
          ['Σ Total Cost', 'Sum of all approved timesheet costs across all staff, projects, tasks within the grant', 'timesheet_entries (approved) × loaded rates'],
        ]} />
        <p className="text-sm text-gray-600 mt-2">
          Computed at the grant level — aggregates all projects, tasks, and staff within that grant.
        </p>
      </FormulaSection>

      <FormulaSection id="compa-ratio" number={6} title="Compa-Ratio (Equity Dashboard)">
        <p className="text-sm text-gray-600 mb-2">
          Measures a staff member's salary relative to the market midpoint for their classification band.
        </p>
        <FormulaBlock>
          Compa-Ratio = Annual Salary ÷ Band Midpoint
        </FormulaBlock>
        <VarTable rows={[
          ['Annual Salary', 'Current annual salary from most recent salary record', 'salary_records'],
          ['Band Midpoint', 'Midpoint of the salary band for this classification', 'classification_bands.band_mid'],
        ]} />
        <div className="my-3 overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b border-gray-200">Compa-Ratio</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b border-gray-200">Interpretation</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b border-gray-200">Flag</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-3 py-2 font-mono text-xs">&lt; 0.85</td>
                <td className="px-3 py-2 text-gray-700">Below 85% of market midpoint</td>
                <td className="px-3 py-2"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">Underpaid</span></td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-3 py-2 font-mono text-xs">0.85 – 1.15</td>
                <td className="px-3 py-2 text-gray-700">Within normal range of market midpoint</td>
                <td className="px-3 py-2"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">At Market</span></td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono text-xs">&gt; 1.15</td>
                <td className="px-3 py-2 text-gray-700">Above 115% of market midpoint</td>
                <td className="px-3 py-2"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">Above Market</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500">
          Source: <code className="bg-gray-100 px-1 rounded">functions/api/equity/current.js</code> —{' '}
          <code className="bg-gray-100 px-1 rounded">compa_ratio = salary / band.band_mid</code>
        </p>
      </FormulaSection>

      <FormulaSection id="percentile-in-band" number={7} title="Percentile in Band">
        <p className="text-sm text-gray-600 mb-2">
          Where a staff member's salary falls within their classification band range.
          Returns 0.0 (at minimum) to 1.0 (at maximum).
        </p>
        <FormulaBlock>
          Percentile in Band = (Annual Salary − Band Minimum) ÷ (Band Maximum − Band Minimum)
        </FormulaBlock>
        <VarTable rows={[
          ['Annual Salary', 'Current annual salary', 'salary_records'],
          ['Band Minimum', 'Minimum salary for this classification band', 'classification_bands.band_min'],
          ['Band Maximum', 'Maximum salary for this classification band', 'classification_bands.band_max'],
        ]} />
        <Example calc="Salary = $70,000, Band Min = $55,000, Band Max = $95,000 → ($70,000 − $55,000) ÷ ($95,000 − $55,000) = $15,000 ÷ $40,000 = 0.375 = 37.5th percentile" />
        <p className="text-xs text-gray-500">
          Source: <code className="bg-gray-100 px-1 rounded">const range = band.band_max - band.band_min; percentile_in_band = (salary - band.band_min) / range</code>
        </p>
      </FormulaSection>

      <FormulaSection id="equity-gap" number={8} title="Expected Salary by Tenure (Equity Gap)">
        <p className="text-sm text-gray-600 mb-2">
          Compares actual salary against the salary expected for someone with the staff member's tenure.
          Uses linear interpolation across the band range based on years of service.
        </p>
        <FormulaBlock>
          {'Tenure % = min(Years of Service ÷ Typical Years Max, 1.0)\n'}
          {'Expected Salary = Band Min + (Tenure % × (Band Max − Band Min))\n'}
          {'Equity Gap = Expected Salary − Actual Salary'}
        </FormulaBlock>
        <VarTable rows={[
          ['Years of Service', 'Time since start_date (or role_start_date)', 'users.start_date'],
          ['Typical Years Max', 'Expected years to reach top of band', 'classification_bands.typical_years_max (default: 10)'],
          ['Band Min / Max', 'Salary band boundaries', 'classification_bands'],
        ]} />
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 my-3 text-sm text-blue-900">
          <strong>Interpretation:</strong> Positive gap = underpaid relative to tenure expectations.
          Negative gap = above expected level for tenure.
        </div>
        <p className="text-xs text-gray-500">
          Source: <code className="bg-gray-100 px-1 rounded">functions/api/equity/current.js</code>
        </p>
      </FormulaSection>

      <FormulaSection id="loaded-rate-staff-plans" number={9} title="Loaded Rate for Staff Plans">
        <p className="text-sm text-gray-600 mb-2">
          Monthly cost estimate used in Staff Plan scenario projections. Applies both fringe and F&A
          to a fractional monthly salary based on the employee’s allocation percentage to the grant.
        </p>
        <FormulaBlock>
          {'Monthly Salary Rate = Annual Salary ÷ 12\n'}
          {'Estimated Monthly Cost = Monthly Salary Rate × Allocation % × (1 + Fringe Rate) × (1 + F&A Rate)'}
        </FormulaBlock>
        <VarTable rows={[
          ['Annual Salary', 'From most recent salary record', 'salary_records'],
          ['Allocation %', 'Fraction of time formally appointed to this grant (e.g., 0.50 = 50%)', 'staff_plan_scenario_rows.allocation_pct'],
          ['Fringe Rate', 'From salary record (e.g., 0.451 for AP SURS-eligible, FY2026)', 'salary_records.fringe_rate'],
          ['F&A Rate', 'From grant F&A rates (typically 0.317)', 'grant_fa_rates'],
        ]} />
        <Example calc="Salary = $75,000, Allocation = 50%, Fringe = 0.451, F&A = 0.317 → ($75,000 ÷ 12) × 0.50 × 1.451 × 1.317 = $5,977/month" />
        <p className="text-xs text-gray-500 mt-2 italic">
          Note: Staff Plan allocations reflect formal salary appointments, which cover 100% of an
          employee’s time including overhead activities. See Technical Reference → Two Cost Views
          for the distinction between this and timesheet-based cost tracking.
        </p>
      </FormulaSection>

      <FormulaSection id="runway" number={10} title="Program Runway">
        <p className="text-sm text-gray-600 mb-2">
          Estimates how long current grant balances will sustain the full program staffing level.
          Uses manually entered grant balance snapshots and full annual staff costs — not timesheet hours.
        </p>
        <FormulaBlock>
          {'Annual staff cost = Σ [ salary × (1 + fringe) × (1 + weighted F&A) ]\n'}
          {'Monthly burn rate = Annual staff cost ÷ 12\n'}
          {'Runway (months) = Total grant balances ÷ Monthly burn rate\n'}
          {'Weighted F&A = Σ(grant balance × F&A rate) ÷ Σ(grant balance)'}
        </FormulaBlock>
        <VarTable rows={[
          ['Annual salary', 'From most recent salary_records entry for each staff member', 'salary_records'],
          ['Fringe rate', 'From most recent salary_records entry', 'salary_records.fringe_rate'],
          ['Weighted F&A', 'Balance-weighted average F&A across included grants; defaults to 0.317 if no balances entered', 'grant_balances, grant_fa_rates'],
          ['Total grant balances', 'Sum of most recent manually entered balance snapshots for included grants', 'grant_balances'],
        ]} />
        <Example calc="3 staff with total annual cost (salary+fringe+F&A) of $450,000. Total grant balances = $1,350,000. Monthly burn = $450,000 ÷ 12 = $37,500. Runway = $1,350,000 ÷ $37,500 = 36 months." />
        <p className="text-xs text-gray-500 mt-2 italic">
          Runway does not use individual allocation percentages. It assumes all selected staff are
          collectively funded by the selected grants. GRF, indirect cost recovery, and trust fund
          grants are excluded from the calculation by default.
        </p>
      </FormulaSection>
    </div>
  );
}
