export default function Assumptions() {
  const rows = [
    {
      assumption: 'Full-time annual hours',
      value: '2,080',
      appliesTo: 'All salary/rate calculations',
      notes: '52 weeks × 40 hrs/week — standard FLSA full-time year',
    },
    {
      assumption: 'Fiscal year start',
      value: 'July 1',
      appliesTo: 'Budget periods, runway, reporting',
      notes: 'FY2026 = Jul 1, 2025 – Jun 30, 2026',
    },
    {
      assumption: 'FEMA/DHS F&A rate',
      value: '31.7% MTDC',
      appliesTo: 'All DHS-funded grants',
      notes: '"Other Sponsored Activity" rate at ISWS. Verify per-grant via F&A Rates tab.',
    },
    {
      assumption: 'F&A basis (MTDC)',
      value: 'Personnel costs only',
      appliesTo: 'F&A calculations',
      notes: 'Excludes equipment, subcontracts >$25K, patient care costs',
    },
    {
      assumption: 'Equity flag: underpaid threshold',
      value: 'Compa-ratio < 0.85',
      appliesTo: 'Equity dashboard',
      notes: 'Below 85% of salary band midpoint',
    },
    {
      assumption: 'Equity flag: above market threshold',
      value: 'Compa-ratio > 1.15',
      appliesTo: 'Equity dashboard',
      notes: 'Above 115% of salary band midpoint',
    },
    {
      assumption: 'Equity tenure model',
      value: 'Linear interpolation',
      appliesTo: 'Expected salary / equity gap calculation',
      notes: 'Expected salary = band_min + (years_of_service / typical_years_max) × (band_max − band_min)',
    },
    {
      assumption: 'Overhead grant ID',
      value: 'Grant ID 19 (OVERHEAD)',
      appliesTo: 'Time entry availability',
      notes: 'Overhead tasks always visible to all staff; hours excluded from FEMA budget burn',
    },
    {
      assumption: 'Timesheet week boundary',
      value: 'Monday–Sunday',
      appliesTo: 'Timesheet grouping',
      notes: 'week_start is always a Monday date',
    },
    {
      assumption: 'Currency rounding',
      value: '2 decimal places',
      appliesTo: 'All cost calculations',
      notes: 'Round at final display output, not at intermediate steps — avoids compound rounding error',
    },
    {
      assumption: 'Authentication provider',
      value: 'Clerk',
      appliesTo: 'All API endpoints',
      notes: 'JWT verified via JWKS. Role in publicMetadata: admin | staff | hourly',
    },
    {
      assumption: 'Staff plan min appointment',
      value: '5%',
      appliesTo: 'Staff plan optimizer',
      notes: 'PRIDE system minimum — no appointment below 5% is allowed',
    },
    {
      assumption: 'Staff plan fringe assumption',
      value: '45.1% (AP SURS-eligible, FY2026)',
      appliesTo: 'Staff plan cost projections',
      notes: 'All staff in scope treated as Academic Professional (AP) appointment type for planning',
    },
    {
      assumption: 'Database',
      value: 'Cloudflare D1 (SQLite)',
      appliesTo: 'All data storage',
      notes: 'Edge SQLite, globally replicated. No connection pooling or transactions needed for typical queries.',
    },
    {
      assumption: 'Approved hours only in reports',
      value: 'approved status',
      appliesTo: 'Budget burndown, cost reports, runway',
      notes: 'Pending and rejected timesheets are excluded from all cost calculations',
    },
  ];

  return (
    <div className="docs-content max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Assumptions &amp; Configuration</h2>
        <p className="text-gray-500 text-sm mt-1">
          Fixed values, thresholds, and configuration choices baked into CHAMP-PM calculations.
          <span className="ml-3 text-gray-400">Last reviewed: April 2026</span>
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-sm text-amber-900">
        <strong>Note:</strong> These are the values as of April 2026. Some values (fringe rates, F&A rates)
        change annually. Always verify current rates via the Fringe Rates and F&A Rates pages before
        relying on projections.
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-medium text-gray-600">Assumption</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Value</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Applies To</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{r.assumption}</td>
                <td className="px-4 py-3 font-mono text-xs text-blue-700 whitespace-nowrap">{r.value}</td>
                <td className="px-4 py-3 text-gray-600">{r.appliesTo}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{r.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
