import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import { PageLoader } from '../../components/LoadingSpinner';
import { formatDisplayDate } from '../../utils/dateUtils';

const EMPTY_FORM = {
  classification: '', band_min: '', band_mid: '', band_max: '',
  typical_years_min: '', typical_years_max: '', notes: '', effective_date: '',
};

export default function Classifications() {
  const api = useApi();
  const { addToast } = useToast();
  const [bands, setBands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Promotion criteria state
  const [criteria, setCriteria] = useState([]);
  const [criteriaModalOpen, setCriteriaModalOpen] = useState(false);
  const [criteriaForm, setCriteriaForm] = useState({
    from_classification: '', to_classification: '', min_years_in_role: '3', min_years_total: '0', notes: '',
  });
  const [savingCriteria, setSavingCriteria] = useState(false);

  const load = useCallback(async () => {
    try {
      const [bandsRes, criteriaRes] = await Promise.all([
        api.get('/api/classifications'),
        api.get('/api/promotion-criteria'),
      ]);
      setBands(bandsRes.bands || []);
      setCriteria(criteriaRes.criteria || []);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(b) {
    setEditing(b);
    setForm({
      classification: b.classification,
      band_min: b.band_min, band_mid: b.band_mid, band_max: b.band_max,
      typical_years_min: b.typical_years_min ?? '',
      typical_years_max: b.typical_years_max ?? '',
      notes: b.notes || '', effective_date: b.effective_date,
    });
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        band_min: parseFloat(form.band_min),
        band_mid: parseFloat(form.band_mid),
        band_max: parseFloat(form.band_max),
        typical_years_min: form.typical_years_min ? parseInt(form.typical_years_min) : null,
        typical_years_max: form.typical_years_max ? parseInt(form.typical_years_max) : null,
      };
      if (editing) {
        await api.put(`/api/classifications/${editing.id}`, payload);
        addToast('Classification updated');
      } else {
        await api.post('/api/classifications', payload);
        addToast('Classification created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(b) {
    if (!confirm(`Delete classification "${b.classification}"?`)) return;
    try {
      await api.del(`/api/classifications/${b.id}`);
      addToast('Classification deleted');
      load();
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  async function handleSaveCriteria(e) {
    e.preventDefault();
    setSavingCriteria(true);
    try {
      await api.post('/api/promotion-criteria', {
        ...criteriaForm,
        min_years_in_role: parseInt(criteriaForm.min_years_in_role) || 3,
        min_years_total: parseInt(criteriaForm.min_years_total) || 0,
      });
      addToast('Promotion criterion added');
      setCriteriaModalOpen(false);
      load();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSavingCriteria(false);
    }
  }

  const field = (key) => ({ value: form[key], onChange: (e) => setForm(f => ({ ...f, [key]: e.target.value })) });
  const cField = (key) => ({ value: criteriaForm[key], onChange: (e) => setCriteriaForm(f => ({ ...f, [key]: e.target.value })) });

  if (loading) return <PageLoader />;

  const classNames = bands.map(b => b.classification);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Classification Bands</h1>
        <button className="btn-primary" onClick={openCreate}>+ Add Band</button>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        U of I Academic Professional classification levels with salary bands. Used for equity analysis and promotion readiness calculations.
      </p>

      {bands.length === 0 ? (
        <EmptyState
          title="No classification bands"
          description="Add classification levels to enable equity analysis."
          action={<button className="btn-primary" onClick={openCreate}>Add Classification</button>}
        />
      ) : (
        <div className="table-container mb-8">
          <table className="table">
            <thead>
              <tr>
                <th>Classification</th>
                <th>Min</th>
                <th>Midpoint</th>
                <th>Max</th>
                <th>Range</th>
                <th>Typical Years</th>
                <th>Effective</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bands.map(b => (
                <tr key={b.id}>
                  <td className="font-medium">{b.classification}</td>
                  <td>${Number(b.band_min).toLocaleString()}</td>
                  <td className="font-semibold text-brand-600">${Number(b.band_mid).toLocaleString()}</td>
                  <td>${Number(b.band_max).toLocaleString()}</td>
                  <td className="text-xs text-gray-500">
                    ${Number(b.band_max - b.band_min).toLocaleString()}
                  </td>
                  <td className="text-sm">
                    {b.typical_years_min != null ? `${b.typical_years_min}–${b.typical_years_max || '?'} yrs` : '—'}
                  </td>
                  <td className="text-sm">{formatDisplayDate(b.effective_date)}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn-secondary btn-sm" onClick={() => openEdit(b)}>Edit</button>
                      <button className="btn-secondary btn-sm text-red-600" onClick={() => handleDelete(b)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Promotion Criteria Section */}
      <div className="page-header mt-8">
        <h2 className="text-lg font-semibold text-gray-800">Promotion Criteria</h2>
        <button className="btn-secondary" onClick={() => {
          setCriteriaForm({ from_classification: classNames[0] || '', to_classification: classNames[1] || '', min_years_in_role: '3', min_years_total: '0', notes: '' });
          setCriteriaModalOpen(true);
        }}>+ Add Criterion</button>
      </div>

      {criteria.length === 0 ? (
        <p className="text-sm text-gray-400 mt-2">No promotion criteria defined.</p>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Min Years in Role</th>
                <th>Min Years Total</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map(c => (
                <tr key={c.id}>
                  <td className="font-medium">{c.from_classification}</td>
                  <td className="font-medium text-brand-600">{c.to_classification}</td>
                  <td>{c.min_years_in_role} years</td>
                  <td>{c.min_years_total} years</td>
                  <td className="text-xs text-gray-500">{c.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Classification Band Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Classification' : 'Add Classification'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">Classification *</label>
            <input className="form-input" required placeholder="e.g. Academic Professional Level 3" {...field('classification')} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">Min Salary ($) *</label>
              <input className="form-input" type="number" step="0.01" min="0" required {...field('band_min')} />
            </div>
            <div>
              <label className="form-label">Midpoint ($) *</label>
              <input className="form-input" type="number" step="0.01" min="0" required {...field('band_mid')} />
            </div>
            <div>
              <label className="form-label">Max Salary ($) *</label>
              <input className="form-input" type="number" step="0.01" min="0" required {...field('band_max')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Typical Years Min</label>
              <input className="form-input" type="number" min="0" {...field('typical_years_min')} />
            </div>
            <div>
              <label className="form-label">Typical Years Max</label>
              <input className="form-input" type="number" min="0" {...field('typical_years_max')} />
            </div>
          </div>
          <div>
            <label className="form-label">Effective Date *</label>
            <input className="form-input" type="date" required {...field('effective_date')} />
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea className="form-input" rows={2} {...field('notes')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      {/* Promotion Criteria Modal */}
      <Modal isOpen={criteriaModalOpen} onClose={() => setCriteriaModalOpen(false)} title="Add Promotion Criterion">
        <form onSubmit={handleSaveCriteria} className="space-y-4">
          <div>
            <label className="form-label">From Classification *</label>
            <input className="form-input" required placeholder="e.g. AP Level 2" {...cField('from_classification')} />
          </div>
          <div>
            <label className="form-label">To Classification *</label>
            <input className="form-input" required placeholder="e.g. AP Level 3" {...cField('to_classification')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Min Years in Role</label>
              <input className="form-input" type="number" min="0" {...cField('min_years_in_role')} />
            </div>
            <div>
              <label className="form-label">Min Years Total</label>
              <input className="form-input" type="number" min="0" {...cField('min_years_total')} />
            </div>
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea className="form-input" rows={2} {...cField('notes')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setCriteriaModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={savingCriteria}>{savingCriteria ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
