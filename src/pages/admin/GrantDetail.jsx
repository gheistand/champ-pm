import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { PageLoader } from '../../components/LoadingSpinner';
import { formatDisplayDate } from '../../utils/dateUtils';

const EMPTY_PROJECT = { name: '', description: '', start_date: '', end_date: '', budget: '', estimated_hours: '', status: 'active' };

export default function GrantDetail() {
  const { id } = useParams();
  const api = useApi();
  const { addToast } = useToast();
  const [grant, setGrant] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form, setForm] = useState(EMPTY_PROJECT);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await api.get(`/api/grants/${id}`);
      setGrant(res.grant);
      setProjects(res.projects || []);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  function openCreate() {
    setEditingProject(null);
    setForm(EMPTY_PROJECT);
    setModalOpen(true);
  }

  function openEdit(p) {
    setEditingProject(p);
    setForm({ name: p.name, description: p.description || '', start_date: p.start_date || '', end_date: p.end_date || '', budget: p.budget, estimated_hours: p.estimated_hours, status: p.status });
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, grant_id: Number(id), budget: Number(form.budget) || 0, estimated_hours: Number(form.estimated_hours) || 0 };
      if (editingProject) {
        await api.put(`/api/projects/${editingProject.id}`, payload);
        addToast('Project updated');
      } else {
        await api.post('/api/projects', payload);
        addToast('Project created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const field = (key) => ({ value: form[key], onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })) });

  if (loading) return <PageLoader />;
  if (!grant) return <p className="text-red-600">Grant not found.</p>;

  return (
    <div>
      <div className="mb-4">
        <Link to="/admin/grants" className="text-sm text-brand-600 hover:underline">← Grants</Link>
      </div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{grant.name}</h1>
          <p className="text-sm text-gray-500">{grant.funder} · {formatDisplayDate(grant.start_date)} – {formatDisplayDate(grant.end_date)}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge status={grant.status} />
          <button className="btn-primary" onClick={openCreate}>+ New Project</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-card"><div className="stat-value">${Number(grant.total_budget || 0).toLocaleString()}</div><div className="stat-label">Total Budget</div></div>
        <div className="stat-card"><div className="stat-value">{projects.length}</div><div className="stat-label">Projects</div></div>
        <div className="stat-card"><div className="stat-value">{Number(grant.hours_logged || 0).toFixed(1)}h</div><div className="stat-label">Hours Logged</div></div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>Project</th><th>Period</th><th>Budget</th><th>Est. Hours</th><th>Logged</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {projects.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">No projects yet.</td></tr>
            ) : projects.map((p) => (
              <tr key={p.id}>
                <td><Link to={`/admin/projects/${p.id}`} className="font-medium text-brand-600 hover:underline">{p.name}</Link></td>
                <td>{p.start_date ? `${formatDisplayDate(p.start_date)} – ${formatDisplayDate(p.end_date)}` : '—'}</td>
                <td>${Number(p.budget || 0).toLocaleString()}</td>
                <td>{Number(p.estimated_hours || 0).toFixed(0)}h</td>
                <td>{Number(p.hours_logged || 0).toFixed(1)}h</td>
                <td><Badge status={p.status} /></td>
                <td><button className="btn-secondary btn-sm" onClick={() => openEdit(p)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingProject ? 'Edit Project' : 'New Project'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="form-label">Project Name *</label><input className="form-input" required {...field('name')} /></div>
          <div><label className="form-label">Description</label><textarea className="form-input" rows={2} {...field('description')} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">Start Date</label><input className="form-input" type="date" {...field('start_date')} /></div>
            <div><label className="form-label">End Date</label><input className="form-input" type="date" {...field('end_date')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">Budget ($)</label><input className="form-input" type="number" min="0" step="0.01" {...field('budget')} /></div>
            <div><label className="form-label">Est. Hours</label><input className="form-input" type="number" min="0" step="0.5" {...field('estimated_hours')} /></div>
          </div>
          <div><label className="form-label">Status</label><select className="form-select" {...field('status')}><option value="active">Active</option><option value="on_hold">On Hold</option><option value="complete">Complete</option></select></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
