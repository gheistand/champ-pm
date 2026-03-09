import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { PageLoader } from '../../components/LoadingSpinner';

const fmt$ = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
const fmtH = (n) => `${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h`;
const fmtPct = (n) => `${(Number(n || 0) * 100).toFixed(1)}%`;

// Current FY: July 1 – June 30
function fyDates(offset = 0) {
  const now = new Date();
  const fyYear = now.getMonth() >= 6 ? now.getFullYear() + offset : now.getFullYear() - 1 + offset;
  return { start: `${fyYear}-07-01`, end: `${fyYear + 1}-06-30` };
}

function calYearDates(offset = 0) {
  const y = new Date().getFullYear() + offset;
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}

export default function Reports() {
  const api = useApi();
  const { getToken } = useAuth();
  const { addToast } = useToast();

  const [grants, setGrants] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [groupBy, setGroupBy] = useState('grant'); // grant | staff | project | task

  // Filters
  const [grantId, setGrantId] = useState('all');
  const [startDate, setStartDate] = useState(() => fyDates().start);
  const [endDate, setEndDate] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return today;
  });
  const [userId, setUserId] = useState('all');

  useEffect(() => {
    async function init() {
      try {
        const [gr, st] = await Promise.all([
          api.get('/api/grants'),
          api.get('/api/staff'),
        ]);
        setGrants(gr.grants || []);
        setStaff((st.staff || []).filter(s => s.is_active));
      } catch (e) {
        addToast(e.message, 'error');
      } finally {
        setInitLoading(false);
      }
    }
    init();
  }, []);

  const runReport = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setReport(null);
    try {
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
      if (grantId !== 'all') params.set('grant_id', grantId);
      if (userId !== 'all') params.set('user_id', userId);
      const res = await api.get(`/api/reports/timesheet?${params}`);
      setReport(res);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, grantId, userId]);

  async function downloadCsv() {
    const params = new URLSearchParams({
      start_date: startDate, end_date: endDate, format: 'csv',
    });
    if (grantId !== 'all') params.set('grant_id', grantId);
    if (userId !== 'all') params.set('user_id', userId);
    try {
      const token = await getToken();
      const r = await fetch(`/api/reports/timesheet?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error('Download failed');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `champ-report-${startDate}-${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      addToast('CSV download failed', 'error');
    }
  }

  function setPreset(preset) {
    if (preset === 'fy0') { const d = fyDates(0); setStartDate(d.start); setEndDate(d.end); }
    else if (preset === 'fy-1') { const d = fyDates(-1); setStartDate(d.start); setEndDate(d.end); }
    else if (preset === 'cy') { const d = calYearDates(0); setStartDate(d.start); setEndDate(d.end); }
    else if (preset === 'cy-1') { const d = calYearDates(-1); setStartDate(d.start); setEndDate(d.end); }
  }

  // Group report rows
  function buildGrouped(rows) {
    if (!rows) return [];
    if (groupBy === 'grant') {
      const map = {};
      for (const r of rows) {
        const key = r.grant_id;
        if (!map[key]) map[key] = { label: r.grant_name, sub: r.grant_number, rows: [] };
        map[key].rows.push(r);
      }
      return Object.values(map);
    }
    if (groupBy === 'project') {
      const map = {};
      for (const r of rows) {
        const key = r.project_id;
        if (!map[key]) map[key] = { label: r.project_name, sub: r.grant_name, rows: [] };
        map[key].rows.push(r);
      }
      return Object.values(map);
    }
    if (groupBy === 'staff') {
      const map = {};
      for (const r of rows) {
        const key = r.user_id;
        if (!map[key]) map[key] = { label: r.user_name, sub: '', rows: [] };
        map[key].rows.push(r);
      }
      return Object.values(map);
    }
    // task — flat, no grouping
    return [{ label: null, rows }];
  }

  function groupTotals(rows) {
    return rows.reduce((acc, r) => ({
      hours: acc.hours + r.hours,
      personnel_cost: acc.personnel_cost + r.personnel_cost,
      fa_cost: acc.fa_cost + r.fa_cost,
      total_cost: acc.total_cost + r.total_cost,
    }), { hours: 0, personnel_cost: 0, fa_cost: 0, total_cost: 0 });
  }

  if (initLoading) return <PageLoader />;

  const grouped = report ? buildGrouped(report.rows) : [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        {report && (
          <div className="flex gap-2">
            <button className="btn-secondary btn-sm" onClick={downloadCsv}>
              ↓ Export CSV
            </button>
            <button className="btn-secondary btn-sm" onClick={() => window.print()}>
              🖨 Print
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-6 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="form-label">Grant</label>
            <select className="form-select" value={grantId} onChange={e => setGrantId(e.target.value)}>
              <option value="all">All Grants</option>
              {grants.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Staff Member</label>
            <select className="form-select" value={userId} onChange={e => setUserId(e.target.value)}>
              <option value="all">All Staff</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Start Date</label>
            <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="form-label">End Date</label>
            <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date presets */}
          <span className="text-xs text-gray-500 mr-1">Quick:</span>
          <button className="btn-secondary btn-sm" onClick={() => setPreset('fy0')}>Current FY</button>
          <button className="btn-secondary btn-sm" onClick={() => setPreset('fy-1')}>Prior FY</button>
          <button className="btn-secondary btn-sm" onClick={() => setPreset('cy')}>This Year</button>
          <button className="btn-secondary btn-sm" onClick={() => setPreset('cy-1')}>Last Year</button>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-500">Group by:</span>
            {['grant', 'project', 'staff', 'task'].map(g => (
              <button
                key={g}
                className={`btn-sm ${groupBy === g ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setGroupBy(g)}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
            <button
              className="btn-primary btn-sm ml-2"
              onClick={runReport}
              disabled={loading}
            >
              {loading ? 'Running…' : 'Run Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {report && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="text-xs text-gray-500 mb-1">Total Hours</div>
            <div className="text-2xl font-bold text-gray-900">{fmtH(report.totals.hours)}</div>
          </div>
          <div className="card">
            <div className="text-xs text-gray-500 mb-1">Personnel Cost</div>
            <div className="text-2xl font-bold text-gray-900">{fmt$(report.totals.personnel_cost)}</div>
          </div>
          <div className="card">
            <div className="text-xs text-gray-500 mb-1">F&A Cost</div>
            <div className="text-2xl font-bold text-gray-900">{fmt$(report.totals.fa_cost)}</div>
          </div>
          <div className="card">
            <div className="text-xs text-gray-500 mb-1">Total Cost</div>
            <div className="text-2xl font-bold text-brand-700">{fmt$(report.totals.total_cost)}</div>
          </div>
        </div>
      )}

      {/* Grant summary pills */}
      {report && report.by_grant && report.by_grant.length > 1 && (
        <div className="card mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">By Grant</h3>
          <div className="overflow-x-auto">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th>Grant</th>
                  <th className="text-right">Hours</th>
                  <th className="text-right">Personnel</th>
                  <th className="text-right">F&A</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {report.by_grant.map(g => (
                  <tr key={g.grant_id}>
                    <td>
                      <div className="font-medium text-gray-900">{g.grant_name}</div>
                      <div className="text-xs text-gray-400">{g.grant_number}</div>
                    </td>
                    <td className="text-right tabular-nums">{fmtH(g.hours)}</td>
                    <td className="text-right tabular-nums">{fmt$(g.personnel_cost)}</td>
                    <td className="text-right tabular-nums">{fmt$(g.fa_cost)}</td>
                    <td className="text-right tabular-nums font-semibold">{fmt$(g.total_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail table */}
      {report && grouped.length > 0 && (
        <div className="card print:shadow-none">
          <div className="flex items-center justify-between mb-3 print:hidden">
            <h3 className="text-sm font-semibold text-gray-700">
              Detail — {report.rows.length} line{report.rows.length !== 1 ? 's' : ''}
            </h3>
            <span className="text-xs text-gray-400">{startDate} to {endDate}</span>
          </div>

          {/* Print header */}
          <div className="hidden print:block mb-4">
            <h2 className="text-lg font-bold">CHAMP Timesheet Report</h2>
            <p className="text-sm text-gray-600">{startDate} to {endDate}{grantId !== 'all' ? ` · ${grants.find(g => String(g.id) === grantId)?.name}` : ''}</p>
          </div>

          <div className="overflow-x-auto">
            {grouped.map((group, gi) => (
              <div key={gi} className={gi > 0 ? 'mt-6' : ''}>
                {group.label && (
                  <div className="flex items-baseline gap-2 mb-2 pb-1 border-b border-gray-200">
                    <span className="font-semibold text-gray-900 text-sm">{group.label}</span>
                    {group.sub && <span className="text-xs text-gray-400">{group.sub}</span>}
                    {(() => {
                      const t = groupTotals(group.rows);
                      return (
                        <span className="ml-auto text-xs text-gray-500">
                          {fmtH(t.hours)} · {fmt$(t.total_cost)}
                        </span>
                      );
                    })()}
                  </div>
                )}
                <table className="table text-sm w-full">
                  <thead>
                    <tr>
                      {groupBy !== 'staff' && <th>Staff</th>}
                      {groupBy !== 'grant' && <th>Grant</th>}
                      {groupBy !== 'project' && <th>Project</th>}
                      {groupBy !== 'task' && <th>Task</th>}
                      <th className="text-right">Hours</th>
                      <th className="text-right">Hrly Rate</th>
                      <th className="text-right">Personnel</th>
                      <th className="text-right">F&A ({fmtPct(group.rows[0]?.fa_rate)})</th>
                      <th className="text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((r, ri) => (
                      <tr key={ri}>
                        {groupBy !== 'staff' && <td>{r.user_name}</td>}
                        {groupBy !== 'grant' && (
                          <td>
                            <div className="text-xs text-gray-500">{r.grant_name}</div>
                          </td>
                        )}
                        {groupBy !== 'project' && <td className="text-xs">{r.project_name}</td>}
                        {groupBy !== 'task' && <td className="text-xs">{r.task_name}</td>}
                        <td className="text-right tabular-nums">{fmtH(r.hours)}</td>
                        <td className="text-right tabular-nums text-gray-500">{fmt$(r.hourly_loaded)}</td>
                        <td className="text-right tabular-nums">{fmt$(r.personnel_cost)}</td>
                        <td className="text-right tabular-nums text-gray-500">{fmt$(r.fa_cost)}</td>
                        <td className="text-right tabular-nums font-medium">{fmt$(r.total_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {(() => {
                      const t = groupTotals(group.rows);
                      return (
                        <tr className="bg-gray-50 font-semibold text-sm">
                          <td colSpan={5 - [
                            groupBy === 'staff', groupBy === 'grant',
                            groupBy === 'project', groupBy === 'task',
                          ].filter(Boolean).length} className="px-4 py-2">
                            Subtotal
                          </td>
                          <td className="text-right px-4 py-2 tabular-nums">{fmtH(t.hours)}</td>
                          <td></td>
                          <td className="text-right px-4 py-2 tabular-nums">{fmt$(t.personnel_cost)}</td>
                          <td className="text-right px-4 py-2 tabular-nums">{fmt$(t.fa_cost)}</td>
                          <td className="text-right px-4 py-2 tabular-nums">{fmt$(t.total_cost)}</td>
                        </tr>
                      );
                    })()}
                  </tfoot>
                </table>
              </div>
            ))}
          </div>

          {/* Grand total */}
          <div className="mt-4 pt-3 border-t-2 border-gray-300 flex justify-end gap-8 text-sm font-semibold">
            <span>Grand Total</span>
            <span className="tabular-nums">{fmtH(report.totals.hours)}</span>
            <span className="tabular-nums">{fmt$(report.totals.personnel_cost)} personnel</span>
            <span className="tabular-nums">{fmt$(report.totals.fa_cost)} F&A</span>
            <span className="tabular-nums text-brand-700 text-base">{fmt$(report.totals.total_cost)}</span>
          </div>
        </div>
      )}

      {report && report.rows.length === 0 && (
        <div className="card text-center py-12 text-gray-400">
          No timesheet entries found for the selected period and filters.
        </div>
      )}
    </div>
  );
}
