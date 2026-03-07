import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import Modal from '../../components/Modal';
import { PageLoader } from '../../components/LoadingSpinner';
import { formatDisplayDate } from '../../utils/dateUtils';

const APPOINTMENT_TYPES = [
  { value: 'surs', label: 'SURS (Academic Professional)' },
  { value: 'gra_half_plus', label: 'GRA >= half-time' },
  { value: 'gra_half_less', label: 'GRA < half-time' },
  { value: 'hourly_half_plus', label: 'Student Hourly >= half-time' },
  { value: 'non_surs', label: 'Non-SURS' },
];

const EMPTY_FORM = { appointment_type: 'surs', rate: '', effective_date: '', notes: '' };

export default function FringeRates() {
  const api = useApi();
  const { addToast } = useToast();
  const [rates, setRates] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

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
        rate: parseFloat(form.rate) / 100, // Convert percentage to decimal
      });
      addToast('Fringe rate added');
      setModalOpen(false);
      setForm(EMPTY_FORM);
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
        <h1 className="page-title">Fringe Rates</h1>
        <button className="btn-primary" onClick={() => { setForm(EMPTY_FORM); setModalOpen(true); }}>
          + Add Rate
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        University of Illinois fringe benefit rates, updated annually. Old rates are preserved for historical cost calculations.
      </p>

      {/* Current rates */}
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Current Rates</h2>
      <div className="table-container mb-8">
        <table className="table">
          <thead>
            <tr>
              <th>Appointment Type</th>
              <th>Rate</th>
              <th>Effective Date</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rates.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">No fringe rates configured.</td></tr>
            ) : rates.map((r) => (
              <tr key={r.id}>
                <td className="font-medium">{typeLabel(r.appointment_type)}</td>
                <td className="text-brand-600 font-semibold">{(r.rate * 100).toFixed(2)}%</td>
                <td>{formatDisplayDate(r.effective_date)}</td>
                <td className="text-gray-500 text-xs">{r.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* History */}
      {history.length > rates.length && (
        <>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Rate History</h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Appointment Type</th>
                  <th>Rate</th>
                  <th>Effective Date</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id}>
                    <td>{typeLabel(r.appointment_type)}</td>
                    <td>{(r.rate * 100).toFixed(2)}%</td>
                    <td>{formatDisplayDate(r.effective_date)}</td>
                    <td className="text-gray-500 text-xs">{r.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Fringe Rate">
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
          </div>
          <div>
            <label className="form-label">Notes</label>
            <input className="form-input" {...field('notes')} placeholder="e.g. FY2026 rate" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
