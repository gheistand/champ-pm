import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { PageLoader } from '../../components/LoadingSpinner';
import { formatDisplayDate } from '../../utils/dateUtils';

const EMPTY_FORM = {
  id: '', email: '', name: '', role: 'staff',
  title: '', classification: '', department: 'CHAMP', start_date: '',
};

function ScoreBadge({ score }) {
  const color = score >= 100 ? 'bg-green-100 text-green-700' :
    score >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {score}/100
    </span>
  );
}

export default function AdminStaff() {
  const api = useApi();
  const { addToast } = useToast();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showCosts, setShowCosts] = useState(false);
  const [salaryData, setSalaryData] = useState({});

  // Staff detail modal (Phase 3)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('equity');
  const [staffDetail, setStaffDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [staffRes, salaryRes] = await Promise.all([
        api.get('/api/staff'),
        api.get('/api/salary/list').catch(() => ({ staff: [] })),
      ]);
      setStaff(staffRes.staff || []);

      // Build salary map by user_id
      const salaryMap = {};
      for (const s of (salaryRes.staff || [])) {
        salaryMap[s.id] = s;
      }
      setSalaryData(salaryMap);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditingStaff(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(s) {
    setEditingStaff(s);
    setForm({
      id: s.id, email: s.email, name: s.name, role: s.role,
      title: s.title || '', classification: s.classification || '',
      department: s.department || 'CHAMP', start_date: s.start_date || '',
    });
    setModalOpen(true);
  }

  async function openDetail(s) {
    setDetailTab('equity');
    setDetailLoading(true);
    setDetailModalOpen(true);
    setStaffDetail(null);
    try {
      const [equityRes, promoRes, adjRes] = await Promise.all([
        api.get('/api/equity/current').catch(() => ({ analysis: [] })),
        api.get(`/api/promotions/staff/${s.id}`).catch(() => null),
        api.get('/api/salary-adjustments').catch(() => ({ adjustments: [] })),
      ]);

      const equityItem = (equityRes.analysis || []).find(a => a.user_id === s.id);
      const adjustments = (adjRes.adjustments || []).filter(a => a.user_id === s.id);

      setStaffDetail({
        staff: s,
        equity: equityItem || null,
        promotion: promoRes,
        adjustments,
      });
    } catch (err) {
      addToast(err.message, 'error');
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingStaff) {
        await api.put(`/api/staff/${editingStaff.id}`, form);
        addToast('Staff member updated');
      } else {
        await api.post('/api/staff', form);
        addToast('Staff member added');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s) {
    try {
      await api.put(`/api/staff/${s.id}`, { is_active: s.is_active ? 0 : 1 });
      addToast(`${s.name} ${s.is_active ? 'deactivated' : 'activated'}`);
      load();
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  if (loading) return <PageLoader />;

  const tabs = [
    { key: 'equity', label: 'Equity Summary' },
    { key: 'promotion', label: 'Promotion Readiness' },
    { key: 'adjustments', label: 'Adjustments' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Staff</h1>
        <div className="flex items-center gap-3">
          <button
            className={`btn-sm ${showCosts ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowCosts(!showCosts)}
          >
            {showCosts ? '$ Hide Costs' : '$ Show Costs'}
          </button>
          <button className="btn-primary" onClick={openCreate}>+ Add Staff</button>
        </div>
      </div>

      {staff.length === 0 ? (
        <EmptyState
          title="No staff yet"
          description="Add your first staff member to get started."
          action={<button className="btn-primary" onClick={openCreate}>Add Staff</button>}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Title</th>
                <th>Classification</th>
                <th>Role</th>
                <th>Start Date</th>
                <th>Assignments</th>
                <th>Allocated Hours</th>
                {showCosts && <th>Salary</th>}
                {showCosts && <th>Loaded Rate</th>}
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td>
                    <button className="text-left" onClick={() => openDetail(s)}>
                      <div className="font-medium text-brand-600 hover:underline">{s.name}</div>
                      <div className="text-xs text-gray-400">{s.email}</div>
                    </button>
                  </td>
                  <td>{s.title || '—'}</td>
                  <td>{s.classification || '—'}</td>
                  <td><Badge status={s.role} /></td>
                  <td>{formatDisplayDate(s.start_date) || '—'}</td>
                  <td>{s.assignment_count ?? 0}</td>
                  <td>{Number(s.total_allocated_hours || 0).toFixed(0)}h</td>
                  {showCosts && (
                    <td className="font-medium">
                      {salaryData[s.id]?.annual_salary
                        ? `$${Number(salaryData[s.id].annual_salary).toLocaleString()}`
                        : '—'}
                    </td>
                  )}
                  {showCosts && (
                    <td className="text-brand-600 font-semibold">
                      {salaryData[s.id]?.loaded_hourly_rate
                        ? `$${salaryData[s.id].loaded_hourly_rate.toFixed(2)}/hr`
                        : '—'}
                    </td>
                  )}
                  <td>
                    <Badge status={s.is_active ? 'active' : 'closed'} label={s.is_active ? 'Active' : 'Inactive'} />
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn-secondary btn-sm" onClick={() => openEdit(s)}>Edit</button>
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => toggleActive(s)}
                      >
                        {s.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit/Create Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingStaff ? 'Edit Staff' : 'Add Staff'}>
        <form onSubmit={handleSave} className="space-y-4">
          {!editingStaff && (
            <div>
              <label className="form-label">Clerk User ID *</label>
              <input className="form-input" placeholder="user_2abc..." required {...field('id')} />
              <p className="text-xs text-gray-400 mt-1">Find in Clerk dashboard → Users → User ID</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Full Name *</label>
              <input className="form-input" required {...field('name')} />
            </div>
            <div>
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" required {...field('email')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Title</label>
              <input className="form-input" {...field('title')} />
            </div>
            <div>
              <label className="form-label">Role</label>
              <select className="form-select" {...field('role')}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
                <option value="hourly">Hourly</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Classification</label>
              <input className="form-input" placeholder="AP Level 3" {...field('classification')} />
            </div>
            <div>
              <label className="form-label">Start Date</label>
              <input className="form-input" type="date" {...field('start_date')} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Staff Detail Modal (Phase 3) */}
      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)}
        title={staffDetail?.staff?.name || 'Staff Detail'} size="xl">
        {detailLoading ? (
          <div className="py-8 text-center text-gray-400">Loading…</div>
        ) : staffDetail ? (
          <div>
            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200 mb-4">
              {tabs.map(t => (
                <button
                  key={t.key}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${detailTab === t.key
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setDetailTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Equity Tab */}
            {detailTab === 'equity' && (
              <div>
                {staffDetail.equity ? (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="card p-4">
                      <p className="text-xs text-gray-500">Classification</p>
                      <p className="font-semibold">{staffDetail.equity.classification || '—'}</p>
                    </div>
                    <div className="card p-4">
                      <p className="text-xs text-gray-500">Salary</p>
                      <p className="font-semibold">${Number(staffDetail.equity.annual_salary).toLocaleString()}</p>
                    </div>
                    <div className="card p-4">
                      <p className="text-xs text-gray-500">Band Midpoint</p>
                      <p className="font-semibold">
                        {staffDetail.equity.band_mid ? `$${Number(staffDetail.equity.band_mid).toLocaleString()}` : '—'}
                      </p>
                    </div>
                    <div className="card p-4">
                      <p className="text-xs text-gray-500">Compa-Ratio</p>
                      <p className={`font-semibold ${staffDetail.equity.compa_ratio < 0.85 ? 'text-red-600' : staffDetail.equity.compa_ratio > 1.15 ? 'text-blue-600' : 'text-green-600'}`}>
                        {staffDetail.equity.compa_ratio?.toFixed(3) || '—'}
                      </p>
                    </div>
                    <div className="card p-4">
                      <p className="text-xs text-gray-500">Equity Gap</p>
                      <p className={`font-semibold ${staffDetail.equity.equity_gap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {staffDetail.equity.equity_gap != null
                          ? `${staffDetail.equity.equity_gap > 0 ? '+' : ''}$${Number(staffDetail.equity.equity_gap).toLocaleString()}`
                          : '—'}
                      </p>
                    </div>
                    <div className="card p-4">
                      <p className="text-xs text-gray-500">Flag</p>
                      {staffDetail.equity.flag === 'underpaid' && <Badge status="rejected" label="Underpaid" />}
                      {staffDetail.equity.flag === 'at_market' && <Badge status="active" label="At Market" />}
                      {staffDetail.equity.flag === 'above_market' && <Badge status="submitted" label="Above Market" />}
                      {!staffDetail.equity.flag && <span className="text-gray-400">—</span>}
                    </div>
                    {staffDetail.equity.band_min != null && (
                      <div className="col-span-full card p-4">
                        <p className="text-xs text-gray-500 mb-2">Band Position</p>
                        <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                          <div className="absolute inset-y-0 left-0 bg-green-200 rounded-full"
                            style={{ width: `${Math.min((staffDetail.equity.percentile_in_band || 0) * 100, 100)}%` }} />
                          <div className="absolute inset-y-0 bg-brand-500 rounded-full w-2"
                            style={{ left: `${Math.min((staffDetail.equity.percentile_in_band || 0) * 100, 100)}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>${Number(staffDetail.equity.band_min).toLocaleString()}</span>
                          <span>Mid: ${Number(staffDetail.equity.band_mid).toLocaleString()}</span>
                          <span>${Number(staffDetail.equity.band_max).toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-4">No equity data available. Ensure this staff member has a salary record and their classification has a band defined.</p>
                )}
              </div>
            )}

            {/* Promotion Tab */}
            {detailTab === 'promotion' && (
              <div>
                {staffDetail.promotion?.promotion_paths?.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="card p-4">
                        <p className="text-xs text-gray-500">Years Total</p>
                        <p className="font-semibold">{staffDetail.promotion.years_total} yr</p>
                      </div>
                      <div className="card p-4">
                        <p className="text-xs text-gray-500">Years in Role</p>
                        <p className="font-semibold">{staffDetail.promotion.years_in_role} yr</p>
                      </div>
                    </div>
                    {staffDetail.promotion.promotion_paths.map((path, i) => (
                      <div key={i} className="card p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold">→ {path.to_classification}</h3>
                          <ScoreBadge score={path.readiness_score} />
                        </div>
                        <div className="space-y-2">
                          {path.checks.map((check, ci) => (
                            <div key={ci} className="flex items-center gap-3 text-sm">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${check.met ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                                {check.met ? '✓' : '✗'}
                              </span>
                              <span className={check.met ? 'text-gray-700' : 'text-gray-400'}>{check.label}</span>
                              <span className="text-xs text-gray-400 ml-auto">Current: {check.value ?? '—'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-4">No promotion criteria defined for this classification.</p>
                )}
              </div>
            )}

            {/* Adjustments Tab */}
            {detailTab === 'adjustments' && (
              <div>
                {staffDetail.adjustments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Current</th>
                          <th>Proposed</th>
                          <th>Change</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffDetail.adjustments.map(a => (
                          <tr key={a.id}>
                            <td className="capitalize">{a.adjustment_type}</td>
                            <td>${Number(a.current_salary).toLocaleString()}</td>
                            <td className="font-semibold">${Number(a.proposed_salary).toLocaleString()}</td>
                            <td className={a.proposed_salary > a.current_salary ? 'text-green-600' : 'text-red-600'}>
                              {a.proposed_salary > a.current_salary ? '+' : ''}
                              ${Number(a.proposed_salary - a.current_salary).toLocaleString()}
                            </td>
                            <td><Badge status={a.status === 'approved' ? 'submitted' : a.status === 'applied' ? 'active' : a.status} label={a.status} /></td>
                            <td className="text-sm">{formatDisplayDate(a.effective_date) || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-4">No salary adjustments for this staff member.</p>
                )}
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
