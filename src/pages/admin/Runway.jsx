import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { PageLoader } from '../../components/LoadingSpinner';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { HelpButton } from '../../components/HelpButton';
import { TOOL_HELP } from '../../help/toolHelp';

function fmt$(n) {
  if (n == null) return '—';
  return '$' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
}
function fmtPct(n) { return (n * 100).toFixed(1) + '%'; }

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

function monthsBetween(a, b) {
  const da = new Date(a), db = new Date(b);
  return (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth());
}

export default function AdminRunway() {
  const api = useApi();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [grants, setGrants] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [saveNotes, setSaveNotes] = useState('');

  // Per-grant editable state: { [grant_id]: { balance, fa_rate, included } }
  const [grantState, setGrantState] = useState({});
  // Per-staff excluded set
  const [excludedStaff, setExcludedStaff] = useState(new Set());

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/runway');
      setGrants(res.grants || []);
      setAllStaff(res.staff || []);
      setHistory(res.history || []);

      // Init grant state from latest saved balances
      const init = {};
      for (const g of (res.grants || [])) {
        init[g.id] = {
          balance: g.current_balance ?? '',
          fa_rate: g.fa_rate ?? 0.317,
          included: true,
        };
      }
      setGrantState(init);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function setGs(id, key, val) {
    setGrantState(s => ({ ...s, [id]: { ...s[id], [key]: val } }));
  }

  // ── Calculations ──────────────────────────────────────────────────────────

  const calc = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    // Total balance
    let totalBalance = 0;
    for (const g of grants) {
      const gs = grantState[g.id];
      if (!gs?.included) continue;
      const bal = parseFloat(gs?.balance);
      if (!isNaN(bal)) totalBalance += bal;
    }

    // Monthly burn: sum of all included staff (salary+fringe) * (1 + weighted_fa)
    // Weighted avg F&A = weighted by grant balance
    let weightedFaSum = 0, weightedFaTotal = 0;
    for (const g of grants) {
      const gs = grantState[g.id];
      if (!gs?.included) continue;
      const bal = parseFloat(gs?.balance);
      if (!isNaN(bal) && bal > 0) {
        const fa = parseFloat(gs?.fa_rate) || 0;
        weightedFaSum += bal * fa;
        weightedFaTotal += bal;
      }
    }
    const weightedFa = weightedFaTotal > 0 ? weightedFaSum / weightedFaTotal : 0.317;

    let annualPersonnel = 0;
    const staffCosts = [];
    for (const s of allStaff) {
      if (excludedStaff.has(s.id)) continue;
      const sal = s.annual_salary || 0;
      const fringe = s.fringe_rate || 0;
      const loaded = sal * (1 + fringe);
      const withFa = loaded * (1 + weightedFa);
      annualPersonnel += withFa;
      staffCosts.push({ ...s, loaded, withFa });
    }
    const monthlyBurn = annualPersonnel / 12;
    const runwayMonths = monthlyBurn > 0 ? totalBalance / monthlyBurn : null;
    const zeroDate = runwayMonths != null ? addMonths(today, runwayMonths) : null;

    // Build projection data (monthly points from today to zero)
    const projectionData = [];
    if (runwayMonths != null && runwayMonths > 0) {
      const steps = Math.min(Math.ceil(runwayMonths) + 1, 120);
      for (let m = 0; m <= steps; m++) {
        const date = addMonths(today, m);
        const bal = Math.max(0, totalBalance - monthlyBurn * m);
        projectionData.push({ date: date.slice(0, 7), balance: Math.round(bal) });
      }
    }

    return { totalBalance, monthlyBurn, annualPersonnel, runwayMonths, zeroDate, weightedFa, staffCosts, projectionData };
  }, [grants, grantState, allStaff, excludedStaff]);

  // ── Save snapshot ─────────────────────────────────────────────────────────

  async function handleSave() {
    const entries = grants
      .filter(g => grantState[g.id]?.included && grantState[g.id]?.balance !== '')
      .map(g => ({
        grant_id: g.id,
        balance: parseFloat(grantState[g.id].balance),
        fa_rate: parseFloat(grantState[g.id].fa_rate),
      }))
      .filter(e => !isNaN(e.balance));

    if (!entries.length) { addToast('Enter at least one balance to save', 'error'); return; }
    setSaving(true);
    try {
      await api.post('/api/runway', { entries, as_of_date: asOfDate, notes: saveNotes });
      addToast(`Snapshot saved for ${asOfDate}`);
      setSaveNotes('');
      load();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  // ── Chart data (history + projection merged) ──────────────────────────────

  const combinedChartData = useMemo(() => {
    const hist = history.map(h => ({ date: h.as_of_date.slice(0, 7), historical: h.total_balance, projected: undefined }));
    const proj = calc.projectionData.map(p => ({ date: p.date, historical: undefined, projected: p.balance }));
    // Merge by date, history first
    const map = {};
    for (const h of hist) map[h.date] = { ...h };
    for (const p of proj) {
      if (map[p.date]) map[p.date].projected = p.projected;
      else map[p.date] = { ...p };
    }
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [history, calc.projectionData]);

  const runwayColor = calc.runwayMonths == null ? 'gray'
    : calc.runwayMonths < 12 ? 'red'
    : calc.runwayMonths < 24 ? 'amber'
    : 'green';

  const colorClass = { red: 'text-red-600', amber: 'text-amber-600', green: 'text-green-600', gray: 'text-gray-400' };
  const bgClass = { red: 'bg-red-50 border-red-200', amber: 'bg-amber-50 border-amber-200', green: 'bg-green-50 border-green-200', gray: 'bg-gray-50 border-gray-200' };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-8">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <h1 className="page-title">Program Runway Calculator</h1>
          <HelpButton {...TOOL_HELP.runway} />
        </div>
        <p className="text-sm text-gray-500">Enter current account balances to project how long the program can sustain the full team.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total Balance</p>
          <p className="text-xl font-bold text-gray-800">{fmt$(calc.totalBalance)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Monthly Burn Rate</p>
          <p className="text-xl font-bold text-gray-800">{fmt$(calc.monthlyBurn)}</p>
          <p className="text-xs text-gray-400">salary + fringe + F&A</p>
        </div>
        <div className={`card p-4 border ${bgClass[runwayColor]}`}>
          <p className="text-xs text-gray-500 mb-1">Runway</p>
          <p className={`text-xl font-bold ${colorClass[runwayColor]}`}>
            {calc.runwayMonths != null ? `${calc.runwayMonths.toFixed(1)} months` : '—'}
          </p>
          <p className="text-xs text-gray-400">{calc.runwayMonths != null ? `${(calc.runwayMonths / 12).toFixed(1)} years` : 'Enter balances'}</p>
        </div>
        <div className={`card p-4 border ${bgClass[runwayColor]}`}>
          <p className="text-xs text-gray-500 mb-1">Projected Zero Date</p>
          <p className={`text-xl font-bold ${colorClass[runwayColor]}`}>
            {calc.zeroDate ? new Date(calc.zeroDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
          </p>
          <p className="text-xs text-gray-400">weighted F&A: {fmtPct(calc.weightedFa)}</p>
        </div>
      </div>

      {/* Chart */}
      {combinedChartData.length > 1 && (
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Program Balance — History & Projection</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={combinedChartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tickFormatter={v => '$' + (v / 1000000).toFixed(1) + 'M'} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => fmt$(v)} />
              <Legend />
              <Area type="monotone" dataKey="historical" name="Actual Balance" stroke="#3b82f6" fill="url(#histGrad)" strokeWidth={2} dot={{ r: 4 }} connectNulls={false} />
              <Area type="monotone" dataKey="projected" name="Projected" stroke="#f59e0b" fill="url(#projGrad)" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} />
              {calc.zeroDate && (
                <ReferenceLine x={calc.zeroDate.slice(0, 7)} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Zero', fill: '#ef4444', fontSize: 11 }} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Grant balances */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Grant Balances & F&A Rates</h2>
          <div className="card overflow-hidden">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-6"></th>
                  <th>Grant</th>
                  <th>Current Balance ($)</th>
                  <th>F&A Rate (%)</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {grants.map(g => {
                  const gs = grantState[g.id] || {};
                  return (
                    <tr key={g.id} className={!gs.included ? 'opacity-40' : ''}>
                      <td>
                        <input type="checkbox" checked={gs.included ?? true}
                          onChange={e => setGs(g.id, 'included', e.target.checked)}
                          className="rounded" />
                      </td>
                      <td className="font-medium text-sm">{g.name}</td>
                      <td>
                        <input
                          type="number" min="0" step="1000"
                          className="form-input w-36 text-sm"
                          placeholder="0"
                          value={gs.balance ?? ''}
                          onChange={e => setGs(g.id, 'balance', e.target.value)}
                          disabled={!gs.included}
                        />
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <input
                            type="number" min="0" max="100" step="0.1"
                            className="form-input w-20 text-sm"
                            value={gs.fa_rate != null ? (gs.fa_rate * 100).toFixed(1) : ''}
                            onChange={e => setGs(g.id, 'fa_rate', parseFloat(e.target.value) / 100)}
                            disabled={!gs.included}
                          />
                          <span className="text-xs text-gray-400">%</span>
                        </div>
                      </td>
                      <td className="text-xs text-gray-400">{g.balance_as_of || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Save snapshot */}
          <div className="card p-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Save Snapshot</h3>
            <div className="flex gap-3 flex-wrap items-end">
              <div>
                <label className="form-label">As of Date</label>
                <input type="date" className="form-input" value={asOfDate}
                  onChange={e => setAsOfDate(e.target.value)} />
              </div>
              <div className="flex-1 min-w-48">
                <label className="form-label">Notes (optional)</label>
                <input className="form-input" placeholder="e.g. March 2026 check" value={saveNotes}
                  onChange={e => setSaveNotes(e.target.value)} />
              </div>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Snapshot'}
              </button>
            </div>
          </div>
        </div>

        {/* Staff panel */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Staff ({allStaff.length - excludedStaff.size} of {allStaff.length} included)
          </h2>
          <div className="card p-3 space-y-1 max-h-96 overflow-y-auto">
            {allStaff.map(s => {
              const excluded = excludedStaff.has(s.id);
              const sc = calc.staffCosts.find(x => x.id === s.id);
              return (
                <div key={s.id} className={`flex items-center justify-between py-1 px-1 rounded hover:bg-gray-50 ${excluded ? 'opacity-40' : ''}`}>
                  <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                    <input type="checkbox" checked={!excluded}
                      onChange={() => setExcludedStaff(prev => {
                        const next = new Set(prev);
                        if (next.has(s.id)) next.delete(s.id);
                        else next.add(s.id);
                        return next;
                      })}
                      className="rounded flex-shrink-0" />
                    <span className="text-sm truncate">{s.name}</span>
                  </label>
                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                    {sc ? fmt$(sc.withFa / 12) + '/mo' : '—'}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="card p-4 mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Annual salary+fringe</span>
              <span className="font-medium">{fmt$(calc.staffCosts.reduce((s, x) => s + x.loaded, 0))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">+ F&A ({fmtPct(calc.weightedFa)})</span>
              <span className="font-medium">{fmt$(calc.annualPersonnel - calc.staffCosts.reduce((s, x) => s + x.loaded, 0))}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t pt-2">
              <span>Total annual cost</span>
              <span>{fmt$(calc.annualPersonnel)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Monthly</span>
              <span>{fmt$(calc.monthlyBurn)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
