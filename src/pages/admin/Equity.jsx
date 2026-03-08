import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { PageLoader } from '../../components/LoadingSpinner';
import { formatDisplayDate } from '../../utils/dateUtils';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ZAxis,
  ReferenceArea,
} from 'recharts';

const FLAG_COLORS = { underpaid: '#ef4444', at_market: '#22c55e', above_market: '#3b82f6' };

const ADJUSTMENT_TYPES = [
  { value: 'equity', label: 'Equity' },
  { value: 'merit', label: 'Merit' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'cola', label: 'COLA' },
];

export default function Equity() {
  const api = useApi();
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortCol, setSortCol] = useState('equity_gap');
  const [sortDir, setSortDir] = useState('desc');

  // Adjustment modal
  const [adjModalOpen, setAdjModalOpen] = useState(false);
  const [adjForm, setAdjForm] = useState({
    user_id: '', adjustment_type: 'equity', current_salary: '', proposed_salary: '',
    reason: '', effective_date: '', status: 'draft',
  });
  const [savingAdj, setSavingAdj] = useState(false);

  // Snapshot
  const [savingSnapshot, setSavingSnapshot] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/equity/current');
      setData(res);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSort(col) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir(col === 'name' ? 'asc' : 'desc');
    }
  }

  function openAdjustment(staff) {
    // Calculate expected salary based on tenure
    const typicalMax = staff.band_max && staff.band_min
      ? staff.band_min + ((staff.years_of_service / 10) * (staff.band_max - staff.band_min))
      : staff.annual_salary;
    const proposed = staff.equity_gap && staff.equity_gap > 0
      ? Math.round(staff.annual_salary + staff.equity_gap)
      : Math.round(typicalMax);

    setAdjForm({
      user_id: staff.user_id,
      user_name: staff.name,
      adjustment_type: 'equity',
      current_salary: staff.annual_salary,
      proposed_salary: proposed,
      reason: `Equity adjustment — compa-ratio ${staff.compa_ratio?.toFixed(3) || 'N/A'}, gap $${Number(staff.equity_gap || 0).toLocaleString()}`,
      effective_date: '',
      status: 'draft',
    });
    setAdjModalOpen(true);
  }

  async function handleSaveAdj(e) {
    e.preventDefault();
    setSavingAdj(true);
    try {
      await api.post('/api/salary-adjustments', {
        user_id: adjForm.user_id,
        adjustment_type: adjForm.adjustment_type,
        current_salary: parseFloat(adjForm.current_salary),
        proposed_salary: parseFloat(adjForm.proposed_salary),
        reason: adjForm.reason,
        effective_date: adjForm.effective_date || null,
        status: adjForm.status,
      });
      addToast('Adjustment recommendation saved');
      setAdjModalOpen(false);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSavingAdj(false);
    }
  }

  async function saveSnapshot() {
    setSavingSnapshot(true);
    try {
      await api.post('/api/equity/snapshot', {
        notes: `Snapshot taken ${new Date().toLocaleDateString()}`,
        items: data.analysis,
      });
      addToast('Equity snapshot saved');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSavingSnapshot(false);
    }
  }

  if (loading) return <PageLoader />;
  if (!data) return <EmptyState title="Unable to load equity data" />;

  const { analysis, summary, bands } = data;

  // Sort analysis
  const sorted = [...analysis].sort((a, b) => {
    let av = a[sortCol], bv = b[sortCol];
    if (av == null) av = sortDir === 'asc' ? Infinity : -Infinity;
    if (bv == null) bv = sortDir === 'asc' ? Infinity : -Infinity;
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  // Pie chart data
  const pieData = [
    { name: 'Underpaid', value: summary.underpaid, color: '#ef4444' },
    { name: 'At Market', value: summary.at_market, color: '#22c55e' },
    { name: 'Above Market', value: summary.above_market, color: '#3b82f6' },
    { name: 'No Band', value: summary.no_band, color: '#d1d5db' },
  ].filter(d => d.value > 0);

  // Scatter plot data grouped by classification
  const scatterByClass = {};
  for (const s of analysis) {
    if (!s.classification || !s.annual_salary) continue;
    if (!scatterByClass[s.classification]) scatterByClass[s.classification] = [];
    scatterByClass[s.classification].push({
      name: s.name,
      salary: s.annual_salary,
      years: s.years_of_service,
      compa: s.compa_ratio,
      flag: s.flag,
    });
  }

  const SortHeader = ({ col, label }) => (
    <th className="cursor-pointer select-none" onClick={() => handleSort(col)}>
      {label} {sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

  function rowColor(item) {
    if (!item.equity_gap) return '';
    if (item.equity_gap > 5000) return 'bg-red-50';
    if (item.equity_gap > 2000) return 'bg-amber-50';
    return '';
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Equity Dashboard</h1>
        <div className="flex items-center gap-3">
          <button className="btn-secondary" onClick={saveSnapshot} disabled={savingSnapshot}>
            {savingSnapshot ? 'Saving…' : 'Save Snapshot'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-value">{summary.total}</div>
          <div className="stat-label">Total Staff</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-red-600">{summary.underpaid}</div>
          <div className="stat-label">Underpaid</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-green-600">{summary.at_market}</div>
          <div className="stat-label">At Market</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-amber-600">{summary.needing_attention}</div>
          <div className="stat-label">Gap {'>'}$3K</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-gray-400">{summary.no_band}</div>
          <div className="stat-label">No Band Set</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Donut Chart */}
        {pieData.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Distribution</h2>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v} staff`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Classification Scatter Plot */}
        {Object.keys(scatterByClass).length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Salary vs. Years of Service</h2>
            <ResponsiveContainer width="100%" height={240}>
              <ScatterChart margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="years" name="Years" tick={{ fontSize: 11 }}
                  label={{ value: 'Years of Service', position: 'bottom', fontSize: 11 }} />
                <YAxis type="number" dataKey="salary" name="Salary" tick={{ fontSize: 11 }}
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <ZAxis range={[40, 40]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }}
                  formatter={(v, name) => name === 'Salary' ? `$${Number(v).toLocaleString()}` : v}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ''} />
                {/* Show band regions */}
                {bands.map(b => (
                  <ReferenceArea key={b.id} y1={b.band_min} y2={b.band_max}
                    fill="#3b82f6" fillOpacity={0.05} stroke="#3b82f6" strokeOpacity={0.2} />
                ))}
                {Object.entries(scatterByClass).map(([cls, points], i) => {
                  const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#22c55e'];
                  return <Scatter key={cls} name={cls} data={points} fill={colors[i % colors.length]} />;
                })}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Equity Table */}
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Staff Equity Analysis</h2>
      {sorted.length === 0 ? (
        <EmptyState title="No staff with salary data" description="Add salary records and classification bands to see equity analysis." />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <SortHeader col="name" label="Name" />
                <SortHeader col="classification" label="Classification" />
                <SortHeader col="years_of_service" label="Years" />
                <SortHeader col="annual_salary" label="Salary" />
                <th>Band Mid</th>
                <SortHeader col="compa_ratio" label="Compa-Ratio" />
                <SortHeader col="equity_gap" label="Equity Gap" />
                <th>Flag</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(s => (
                <tr key={s.user_id} className={rowColor(s)}>
                  <td>
                    <div className="font-medium text-gray-900">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.title || ''}</div>
                  </td>
                  <td className="text-sm">{s.classification || '—'}</td>
                  <td>{s.years_of_service != null ? `${s.years_of_service} yr` : '—'}</td>
                  <td className="font-medium">{s.annual_salary ? `$${Number(s.annual_salary).toLocaleString()}` : '—'}</td>
                  <td className="text-sm">{s.band_mid ? `$${Number(s.band_mid).toLocaleString()}` : '—'}</td>
                  <td>
                    {s.compa_ratio != null ? (
                      <span className={`font-semibold ${s.compa_ratio < 0.85 ? 'text-red-600' : s.compa_ratio > 1.15 ? 'text-blue-600' : 'text-green-600'}`}>
                        {s.compa_ratio.toFixed(3)}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {s.equity_gap != null ? (
                      <span className={`font-semibold ${s.equity_gap > 3000 ? 'text-red-600' : s.equity_gap > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        {s.equity_gap > 0 ? '+' : ''}${Number(s.equity_gap).toLocaleString()}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {s.flag === 'underpaid' && <Badge status="rejected" label="Underpaid" />}
                    {s.flag === 'at_market' && <Badge status="active" label="At Market" />}
                    {s.flag === 'above_market' && <Badge status="submitted" label="Above" />}
                    {!s.flag && <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td>
                    {s.annual_salary && s.band_mid && (
                      <button className="btn-secondary btn-sm" onClick={() => openAdjustment(s)}>
                        Adjust
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recommend Adjustment Modal */}
      <Modal isOpen={adjModalOpen} onClose={() => setAdjModalOpen(false)} title={`Recommend Adjustment — ${adjForm.user_name || ''}`} size="lg">
        <form onSubmit={handleSaveAdj} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Current Salary</label>
              <input className="form-input bg-gray-50" type="number" step="0.01" readOnly value={adjForm.current_salary} />
            </div>
            <div>
              <label className="form-label">Proposed Salary *</label>
              <input className="form-input" type="number" step="0.01" min="0" required
                value={adjForm.proposed_salary}
                onChange={(e) => setAdjForm(f => ({ ...f, proposed_salary: e.target.value }))} />
              {adjForm.proposed_salary && adjForm.current_salary && (
                <p className="text-xs text-gray-500 mt-1">
                  Change: ${Number(adjForm.proposed_salary - adjForm.current_salary).toLocaleString()}
                  ({((adjForm.proposed_salary / adjForm.current_salary - 1) * 100).toFixed(1)}%)
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Adjustment Type *</label>
              <select className="form-select" value={adjForm.adjustment_type}
                onChange={(e) => setAdjForm(f => ({ ...f, adjustment_type: e.target.value }))}>
                {ADJUSTMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Effective Date</label>
              <input className="form-input" type="date"
                value={adjForm.effective_date}
                onChange={(e) => setAdjForm(f => ({ ...f, effective_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="form-label">Reason / Notes</label>
            <textarea className="form-input" rows={3} value={adjForm.reason}
              onChange={(e) => setAdjForm(f => ({ ...f, reason: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Status</label>
            <select className="form-select" value={adjForm.status}
              onChange={(e) => setAdjForm(f => ({ ...f, status: e.target.value }))}>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setAdjModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={savingAdj}>{savingAdj ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
