import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import Modal from '../../components/Modal';
import { PageLoader } from '../../components/LoadingSpinner';

const APPOINTMENT_TYPES = [
  { value: 'surs', label: 'SURS (Academic Professional)' },
  { value: 'gra_half_plus', label: 'GRA >= half-time' },
  { value: 'gra_half_less', label: 'GRA < half-time' },
  { value: 'hourly_half_plus', label: 'Student Hourly >= half-time' },
  { value: 'non_surs', label: 'Non-SURS' },
];

const EMPTY_FORM = { appointment_type: 'surs', rate: '', effective_date: '', notes: '' };

function fiscalYear(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  // U of I fiscal year starts July 1; FY label = calendar year of the July 1 start
  const month = d.getMonth() + 1; // 1-based
  const year = d.getFullYear();
  return month >= 7 ? `FY${year + 1}` : `FY${year}`;
}

function typeLabel(type) {
  return APPOINTMENT_TYPES.find(t => t.value === type)?.label || type;
}

export default function FringeRates() {
  const api = useApi();
  const { addToast } = useToast();
  const [rates, setRates] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add new rate modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Edit notes modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/fringe-rates');
      setRates(res.rates || []);
      setHistory(res.history || []);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/fringe-rates', {
        ...form,
        rate: parseFloat(form.rate) / 100,
      });
      addToast('Fringe rate added');
      setAddModalOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  function openEdit(r) {
    setEditing(r);
    setEditNotes(r.notes || '');
    setEditModalOpen(true);
  }

  async function handleSaveNotes(e) {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await api.put(`/api/fringe-rates/${editing.id}`, { notes: editNotes });
      addToast('Notes updated');
      setEditModalOpen(false);
      load();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSavingEdit(false);
    }
  }

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  if (loading) return <PageLoader />;

  const hasHistory = history.length > rates.length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Fringe Rates</h1>
        <button className="btn-primary" onClick={() => { setForm(EMPTY_FORM); setAddModalOpen(true); }}>
          + Add Rate
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
        <p className="font-semibold mb-1">How fringe rates work</p>
        <p>Each rate record is permanent and date-stamped. When calculating the cost of a timesheet entry,
        the system uses whichever rate was in effect <em>on the date that entry was logged</em> — so past
        costs are never retroactively changed. To update a rate for a new fiscal year, use <strong>+ Add Rate</strong>{' '}
        with the new effective date. Use <strong>Edit</strong> only to correct the notes label on an existing record.</p>
      </div>

      <h2 className="text-sm font-semibold text-gray-700 mb-3">Current Rates</h2>
      <div className="table-container mb-8">
        <table className="table">
          <thead>
            <tr>
              <th>Appointment Type</th>
              <th>Rate</th>
              <th>Fiscal Year</th>
              <th>Effective Date</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rates.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No fringe rates configured.</td></tr>
            ) : rates.map((r) => (
              <tr key={r.id}>
                <td className="font-medium">{typeLabel(r.appointment_type)}</td>
                <td className="text-brand-600 font-semibold">{(r.rate * 100).toFixed(2)}%</td>
                <td className="font-semibold text-gray-700">{fiscalYear(r.effective_date)}</td>
                <td className="text-sm text-gray-500">{r.effective_date}</td>
                <td className="text-gray-500 text-xs">{r.notes || '—'}</td>
                <td>
                  <button className="btn-secondary btn-sm" onClick={() => openEdit(r)}>Edit notes</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasHistory && (
        <>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Rate History (preserved for historical cost accuracy)</h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Appointment Type</th>
                  <th>Rate</th>
                  <th>Fiscal Year</th>
                  <th>Effective Date</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {history.filter(r => !rates.find(c => c.id === r.id)).map((r) => (
                  <tr key={r.id} className="text-gray-400">
                    <td>{typeLabel(r.appointment_type)}</td>
                    <td>{(r.rate * 100).toFixed(2)}%</td>
                    <td>{fiscalYear(r.effective_date)}</td>
                    <td className="text-sm">{r.effective_date}</td>
                    <td className="text-xs">{r.notes || '—'}</td>
                    <td>
                      <button className="btn-secondary btn-sm" onClick={() => openEdit(r)}>Edit notes</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add Rate Modal */}
      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Fringe Rate">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">Appointment Type</label>
            <select className="form-select" {...field('appointment_type')}>
              {APPOINTMENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Rate (%)</label>
            <input className="form-input" type="number" step="0.01" min="0" max="100" required
              placeholder="e.g. 45.10" {...field('rate')} />
            <p className="text-xs text-gray-400 mt-1">Enter as percentage (e.g. 45.10 for 45.10%)</p>
          </div>
          <div>
            <label className="form-label">Effective Date</label>
            <input className="form-input" type="date" required {...field('effective_date')} />
            <p className="text-xs text-gray-400 mt-1">Use July 1 of the fiscal year start (e.g. 2026-07-01 for FY2027)</p>
          </div>
          <div>
            <label className="form-label">Notes</label>
            <input className="form-input" {...field('notes')} placeholder="e.g. FY2026 rate — per U of I NICRA" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setAddModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit Notes Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Notes">
        {editing && (
          <form onSubmit={handleSaveNotes} className="space-y-4">
            <div className="bg-gray-50 rounded p-3 text-sm">
              <p><span className="font-medium">Type:</span> {typeLabel(editing.appointment_type)}</p>
              <p><span className="font-medium">Rate:</span> {(editing.rate * 100).toFixed(2)}%</p>
              <p><span className="font-medium">Fiscal Year:</span> {fiscalYear(editing.effective_date)}</p>
              <p className="text-xs text-gray-400 mt-2">Rate value and effective date cannot be changed — they are part of the historical cost audit trail. To update a rate, add a new record with the new effective date.</p>
            </div>
            <div>
              <label className="form-label">Notes</label>
              <input className="form-input" value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder="e.g. FY2026 rate — per U of I NICRA" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setEditModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={savingEdit}>{savingEdit ? 'Saving…' : 'Save Notes'}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
