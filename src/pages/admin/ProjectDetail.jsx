import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { PageLoader } from '../../components/LoadingSpinner';
import { formatDisplayDate } from '../../utils/dateUtils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

function BudgetGauge({ pct }) {
  const color = pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-green-500';
  const textColor = pct > 90 ? 'text-red-600' : pct > 75 ? 'text-amber-600' : 'text-green-600';
  return (
    <div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-2 ${color} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <p className={`text-xs font-medium ${textColor} mt-0.5`}>{pct.toFixed(1)}%</p>
    </div>
  );
}

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
  const [budgetData, setBudgetData] = useState(null);

  async function load() {
    try {
      const [res, budgetRes] = await Promise.all([
        api.get(`/api/projects/${id}`),
        api.get(`/api/budget/project/${id}`).catch(() => null),
      ]);
      setProject(res.project);
      setTasks(res.tasks || []);
      setBudgetData(budgetRes);
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

  async function handleDeleteTask(t) {
    if (!confirm(`Delete task "${t.name}"?\n\nThis will fail if the task has timesheet entries.`)) return;
    try {
      await api.del(`/api/tasks/${t.id}`);
      addToast('Task deleted');
      load();
    } catch (err) {
      addToast(err.message, 'error');
    }
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
                <td>
                  <div className="flex gap-2">
                    <button className="btn-secondary btn-sm" onClick={() => openEdit(t)}>Edit</button>
                    <button className="btn-secondary btn-sm text-red-600" onClick={() => handleDeleteTask(t)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Budget Breakdown */}
      {budgetData && budgetData.tasks.length > 0 && (
        <div className="card p-5 mt-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Budget Breakdown</h2>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500">FEMA Budget</p>
              <p className="text-lg font-bold">${Number(budgetData.totals.fema_budget).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Personnel</p>
              <p className="text-lg font-bold text-brand-600">${Number(budgetData.totals.personnel_cost).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">F&A ({(budgetData.fa_rate * 100).toFixed(1)}%)</p>
              <p className="text-lg font-bold text-purple-600">${Number(budgetData.totals.fa_cost).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Cost</p>
              <p className="text-lg font-bold">${Number(budgetData.totals.total_cost).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Remaining</p>
              <p className={`text-lg font-bold ${budgetData.totals.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                ${Number(budgetData.totals.remaining).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Bar chart */}
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={budgetData.tasks.map(t => ({
              name: t.name.length > 15 ? t.name.substring(0, 15) + '…' : t.name,
              Budget: t.fema_budget,
              Personnel: t.personnel_cost,
              'F&A': t.fa_cost,
              Remaining: Math.max(0, t.remaining),
            }))} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
              <Legend />
              <Bar dataKey="Personnel" fill="#3b82f6" />
              <Bar dataKey="F&A" fill="#8b5cf6" />
              <Bar dataKey="Remaining" fill="#d1d5db" />
            </BarChart>
          </ResponsiveContainer>

          {/* Per-task budget table */}
          <div className="mt-4 overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Budget</th>
                  <th>Hours</th>
                  <th>Personnel</th>
                  <th>F&A</th>
                  <th>Total</th>
                  <th>Remaining</th>
                  <th>% Used</th>
                </tr>
              </thead>
              <tbody>
                {budgetData.tasks.map(t => (
                  <tr key={t.id}>
                    <td className="font-medium">{t.name}</td>
                    <td>${Number(t.fema_budget).toLocaleString()}</td>
                    <td>{t.hours_logged}h</td>
                    <td>${Number(t.personnel_cost).toLocaleString()}</td>
                    <td>${Number(t.fa_cost).toLocaleString()}</td>
                    <td>${Number(t.total_cost).toLocaleString()}</td>
                    <td className={t.remaining < 0 ? 'text-red-600' : ''}>${Number(t.remaining).toLocaleString()}</td>
                    <td className="w-24"><BudgetGauge pct={t.pct_used} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
