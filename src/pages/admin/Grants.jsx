import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { PageLoader } from '../../components/LoadingSpinner';
import { formatDisplayDate } from '../../utils/dateUtils';
import { HelpButton } from '../../components/HelpButton';
import { TOOL_HELP } from '../../help/toolHelp';

const EMPTY_FORM = {
  name: '', funder: '', grant_number: '',
  start_date: '', end_date: '', total_budget: '', status: 'active', notes: '',
};

export default function AdminGrants() {
  const api = useApi();
  const { addToast } = useToast();
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGrant, setEditingGrant] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/grants');
      setGrants(res.grants || []);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditingGrant(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  async function handleDelete(g) {
    if (!confirm(`Delete grant "${g.name}"?\n\nThis will fail if the grant has projects. Delete all projects first.`)) return;
    try {
      await api.del(`/api/grants/${g.id}`);
      addToast('Grant deleted');
      load();
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  function openEdit(g) {
    setEditingGrant(g);
    setForm({
      name: g.name, funder: g.funder, grant_number: g.grant_number || '',
      start_date: g.start_date, end_date: g.end_date,
      total_budget: g.total_budget, status: g.status, notes: g.notes || '',
    });
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, total_budget: Number(form.total_budget) || 0 };
      if (editingGrant) {
        await api.put(`/api/grants/${editingGrant.id}`, payload);
        addToast('Grant updated');
      } else {
        await api.post('/api/grants', payload);
        addToast('Grant created');
      }
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

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2">
          <h1 className="page-title">Grants</h1>
          <HelpButton {...TOOL_HELP.grants} />
        </div>
        <button className="btn-primary" onClick={openCreate}>+ New Grant</button>
      </div>

      {grants.length === 0 ? (
        <EmptyState
          title="No grants yet"
          description="Create your first grant to start tracking projects."
          action={<button className="btn-primary" onClick={openCreate}>Create Grant</button>}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Grant</th>
                <th>Funder</th>
                <th>Grant #</th>
                <th>Period</th>
                <th>Budget</th>
                <th>Hours Logged</th>
                <th>Projects</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {grants.map((g) => (
                <tr key={g.id}>
                  <td>
                    <Link to={`/admin/grants/${g.id}`} className="font-medium text-brand-600 hover:underline">
                      {g.name}
                    </Link>
                  </td>
                  <td>{g.funder}</td>
                  <td>{g.grant_number || '—'}</td>
                  <td className="whitespace-nowrap">
                    {formatDisplayDate(g.start_date)} – {formatDisplayDate(g.end_date)}
                  </td>
                  <td>${Number(g.total_budget || 0).toLocaleString()}</td>
                  <td>{Number(g.hours_logged || 0).toFixed(1)}h</td>
                  <td>{g.project_count ?? 0}</td>
                  <td><Badge status={g.status} /></td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn-secondary btn-sm" onClick={() => openEdit(g)}>Edit</button>
                      <button className="btn-secondary btn-sm text-red-600" onClick={() => handleDelete(g)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingGrant ? 'Edit Grant' : 'New Grant'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">Grant Name *</label>
            <input className="form-input" required {...field('name')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Funder *</label>
              <input className="form-input" required placeholder="FEMA, IDOT…" {...field('funder')} />
            </div>
            <div>
              <label className="form-label">Grant Number</label>
              <input className="form-input" {...field('grant_number')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Start Date *</label>
              <input className="form-input" type="date" required {...field('start_date')} />
            </div>
            <div>
              <label className="form-label">End Date *</label>
              <input className="form-input" type="date" required {...field('end_date')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Total Budget ($)</label>
              <input className="form-input" type="number" min="0" step="0.01" {...field('total_budget')} />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-select" {...field('status')}>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="closed">Closed</option>
              </select>
            </div>
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
    </div>
  );
}
