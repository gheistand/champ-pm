import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { PageLoader } from '../../components/LoadingSpinner';
import { formatDisplayDate } from '../../utils/dateUtils';

const EMPTY_TASK = { name: '', description: '', start_date: '', end_date: '', budget: '', estimated_hours: '', status: 'active' };

export default function ProjectDetail() {
  const { id } = useParams();
  const api = useApi();
  const { addToast } = useToast();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState(EMPTY_TASK);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await api.get(`/api/projects/${id}`);
      setProject(res.project);
      setTasks(res.tasks || []);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  function openCreate() {
    setEditingTask(null);
    setForm(EMPTY_TASK);
    setModalOpen(true);
  }

  function openEdit(t) {
    setEditingTask(t);
    setForm({ name: t.name, description: t.description || '', start_date: t.start_date || '', end_date: t.end_date || '', budget: t.budget, estimated_hours: t.estimated_hours, status: t.status });
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, project_id: Number(id), budget: Number(form.budget) || 0, estimated_hours: Number(form.estimated_hours) || 0 };
      if (editingTask) {
        await api.put(`/api/tasks/${editingTask.id}`, payload);
        addToast('Task updated');
      } else {
        await api.post('/api/tasks', payload);
        addToast('Task created');
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
  if (!project) return <p className="text-red-600">Project not found.</p>;

  return (
    <div>
      <div className="mb-4">
        <Link to={`/admin/grants/${project.grant_id}`} className="text-sm text-brand-600 hover:underline">
          ← {project.grant_name}
        </Link>
      </div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{project.name}</h1>
          <p className="text-sm text-gray-500">{project.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge status={project.status} />
          <button className="btn-primary" onClick={openCreate}>+ New Task</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-card"><div className="stat-value">${Number(project.budget || 0).toLocaleString()}</div><div className="stat-label">Budget</div></div>
        <div className="stat-card"><div className="stat-value">{Number(project.estimated_hours || 0).toFixed(0)}h</div><div className="stat-label">Estimated Hours</div></div>
        <div className="stat-card"><div className="stat-value">{tasks.length}</div><div className="stat-label">Tasks</div></div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>Task</th><th>Period</th><th>Budget</th><th>Est. Hours</th><th>Logged</th><th>Assigned</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">No tasks yet.</td></tr>
            ) : tasks.map((t) => (
              <tr key={t.id}>
                <td className="font-medium">{t.name}</td>
                <td>{t.start_date ? `${formatDisplayDate(t.start_date)} – ${formatDisplayDate(t.end_date)}` : '—'}</td>
                <td>${Number(t.budget || 0).toLocaleString()}</td>
                <td>{Number(t.estimated_hours || 0).toFixed(0)}h</td>
                <td>{Number(t.hours_logged || 0).toFixed(1)}h</td>
                <td>{t.assigned_count ?? 0} staff</td>
                <td><Badge status={t.status} /></td>
                <td><button className="btn-secondary btn-sm" onClick={() => openEdit(t)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingTask ? 'Edit Task' : 'New Task'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="form-label">Task Name *</label><input className="form-input" required {...field('name')} /></div>
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
