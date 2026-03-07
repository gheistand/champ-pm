import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import { PageLoader } from '../../components/LoadingSpinner';
import { formatDisplayDate } from '../../utils/dateUtils';

const APPOINTMENT_TYPES = [
  { value: 'surs', label: 'SURS (Academic Professional)' },
  { value: 'gra_half_plus', label: 'GRA >= half-time' },
  { value: 'gra_half_less', label: 'GRA < half-time' },
  { value: 'hourly_half_plus', label: 'Student Hourly >= half-time' },
  { value: 'non_surs', label: 'Non-SURS' },
];

const CHANGE_TYPES = [
  { value: 'initial', label: 'Initial' },
  { value: 'merit', label: 'Merit' },
  { value: 'equity', label: 'Equity' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'cola', label: 'COLA' },
];

const EMPTY_FORM = {
  user_id: '', annual_salary: '', appointment_type: 'surs',
  effective_date: '', change_type: 'initial', classification: '', notes: '',
};

export default function AdminSalary() {
  const api = useApi();
  const { addToast } = useToast();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [fringeRates, setFringeRates] = useState({});

  const load = useCallback(async () => {
    try {
      const [salaryRes, fringeRes] = await Promise.all([
        api.get('/api/salary/list'),
        api.get('/api/fringe-rates'),
      ]);
      setStaffList(salaryRes.staff || []);

      // Build fringe rate map: appointment_type -> rate
      const rateMap = {};
      for (const r of (fringeRes.rates || [])) {
        rateMap[r.appointment_type] = r.rate;
      }
      setFringeRates(rateMap);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd(staff) {
    setForm({
      ...EMPTY_FORM,
      user_id: staff?.id || '',
      classification: staff?.classification || '',
      appointment_type: staff?.appointment_type || 'surs',
    });
    setModalOpen(true);
  }

  async function openHistory(staff) {
    setSelectedStaff(staff);
    try {
      const res = await api.get(`/api/salary/${staff.id}`);
      setSalaryHistory(res.records || []);
      setHistoryModalOpen(true);
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/salary', {
        ...form,
        annual_salary: parseFloat(form.annual_salary),
      });
      addToast('Salary record added');
      setModalOpen(false);
      load();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  function typeLabel(type) {
    return APPOINTMENT_TYPES.find(t => t.value === type)?.label || type;
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Salary Management</h1>
        <button className="btn-primary" onClick={() => openAdd(null)}>+ Add Salary Record</button>
      </div>

      {staffList.length === 0 ? (
        <EmptyState
          title="No salary data"
          description="Add salary records for staff members."
          action={<button className="btn-primary" onClick={() => openAdd(null)}>Add Salary Record</button>}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Appointment Type</th>
                <th>Annual Salary</th>
                <th>Fringe Rate</th>
                <th>Loaded Hourly</th>
                <th>Effective Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="font-medium text-gray-900">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.title || s.classification || '—'}</div>
                  </td>
                  <td className="text-xs">{s.appointment_type ? typeLabel(s.appointment_type) : '—'}</td>
                  <td className="font-medium">
                    {s.annual_salary ? `$${Number(s.annual_salary).toLocaleString()}` : '—'}
                  </td>
                  <td>{s.fringe_rate ? `${(s.fringe_rate * 100).toFixed(2)}%` : '—'}</td>
                  <td>
                    {s.loaded_hourly_rate ? (
                      <span className="text-brand-600 font-semibold" title={`(${Number(s.annual_salary).toLocaleString()} / 2080) × (1 + ${(s.fringe_rate * 100).toFixed(1)}%) = $${s.loaded_hourly_rate.toFixed(2)}/hr`}>
                        ${s.loaded_hourly_rate.toFixed(2)}/hr
                      </span>
                    ) : '—'}
                  </td>
                  <td>{formatDisplayDate(s.effective_date) || '—'}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn-secondary btn-sm" onClick={() => openHistory(s)}>History</button>
                      <button className="btn-secondary btn-sm" onClick={() => openAdd(s)}>+ Record</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Salary Record Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Salary Record">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">Staff Member *</label>
            <select className="form-select" required value={form.user_id}
              onChange={(e) => setForm(f => ({ ...f, user_id: e.target.value }))}>
              <option value="">Select staff…</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Annual Salary ($) *</label>
            <input className="form-input" type="number" step="0.01" min="0" required {...field('annual_salary')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Appointment Type *</label>
              <select className="form-select" {...field('appointment_type')}>
                {APPOINTMENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {fringeRates[form.appointment_type] !== undefined && (
                <p className="text-xs text-gray-500 mt-1">
                  Fringe rate: {(fringeRates[form.appointment_type] * 100).toFixed(2)}%
                </p>
              )}
            </div>
            <div>
              <label className="form-label">Change Type *</label>
              <select className="form-select" {...field('change_type')}>
                {CHANGE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Effective Date *</label>
              <input className="form-input" type="date" required {...field('effective_date')} />
            </div>
            <div>
              <label className="form-label">Classification</label>
              <input className="form-input" placeholder="e.g. AP Level 3" {...field('classification')} />
            </div>
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea className="form-input" rows={2} {...field('notes')} />
          </div>

          {/* Preview loaded rate */}
          {form.annual_salary && form.appointment_type && fringeRates[form.appointment_type] !== undefined && (
            <div className="p-3 bg-brand-50 rounded-lg border border-brand-100">
              <p className="text-xs text-gray-500 mb-1">Loaded Hourly Rate Preview</p>
              <p className="text-lg font-bold text-brand-700">
                ${((parseFloat(form.annual_salary) / 2080) * (1 + fringeRates[form.appointment_type])).toFixed(2)}/hr
              </p>
              <p className="text-xs text-gray-400 mt-1">
                (${Number(form.annual_salary).toLocaleString()} / 2080) × (1 + {(fringeRates[form.appointment_type] * 100).toFixed(1)}%)
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      {/* Salary History Modal */}
      <Modal isOpen={historyModalOpen} onClose={() => setHistoryModalOpen(false)} title={`Salary History — ${selectedStaff?.name}`} size="lg">
        {salaryHistory.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">No salary records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Effective Date</th>
                  <th>Change Type</th>
                  <th>Annual Salary</th>
                  <th>Fringe Rate</th>
                  <th>Loaded Hourly</th>
                  <th>Classification</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {salaryHistory.map((r) => {
                  const loaded = (r.annual_salary / 2080) * (1 + r.fringe_rate);
                  return (
                    <tr key={r.id}>
                      <td>{formatDisplayDate(r.effective_date)}</td>
                      <td className="capitalize">{r.change_type}</td>
                      <td className="font-medium">${Number(r.annual_salary).toLocaleString()}</td>
                      <td>{(r.fringe_rate * 100).toFixed(2)}%</td>
                      <td className="text-brand-600 font-semibold">${loaded.toFixed(2)}/hr</td>
                      <td>{r.classification || '—'}</td>
                      <td className="text-xs text-gray-500 max-w-32 truncate">{r.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
