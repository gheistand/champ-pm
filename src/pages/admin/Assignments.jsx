import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import { PageLoader } from '../../components/LoadingSpinner';

const EMPTY_FORM = { user_id: '', task_id: '', allocated_hours: '', allocated_pct: '', notes: '' };

export default function AdminAssignments() {
  const api = useApi();
  const { addToast } = useToast();
  const [assignments, setAssignments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [userFilter, setUserFilter] = useState('');

  const load = useCallback(async () => {
    try {
      const url = userFilter ? `/api/assignments?user_id=${userFilter}` : '/api/assignments';
      const [assignRes, staffRes, tasksRes] = await Promise.all([
        api.get(url),
        api.get('/api/staff'),
        api.get('/api/tasks'),
      ]);
      setAssignments(assignRes.assignments || []);
      setStaff(staffRes.staff || []);
      setTasks(tasksRes.tasks || []);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [userFilter]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditingAssignment(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(a) {
    setEditingAssignment(a);
    setForm({ user_id: a.user_id, task_id: a.task_id, allocated_hours: a.allocated_hours, allocated_pct: a.allocated_pct || '', notes: a.notes || '' });
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, allocated_hours: Number(form.allocated_hours) || 0, allocated_pct: form.allocated_pct ? Number(form.allocated_pct) : null };
      if (editingAssignment) {
        await api.put(`/api/assignments/${editingAssignment.id}`, payload);
        addToast('Assignment updated');
      } else {
        await api.post('/api/assignments', payload);
        addToast('Assignment created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(a) {
    if (!confirm(`Remove ${a.user_name} from "${a.task_name}"?`)) return;
    try {
      await api.del(`/api/assignments/${a.id}`);
      addToast('Assignment removed');
      load();
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  const field = (key) => ({ value: form[key], onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })) });

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Assignments</h1>
        <div className="flex items-center gap-3">
          <select className="form-select w-48" value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
            <option value="">All Staff</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn-primary" onClick={openCreate}>+ Assign Staff</button>
        </div>
      </div>

      {assignments.length === 0 ? (
        <EmptyState
          title="No assignments"
          description="Assign staff to tasks to track their work."
          action={<button className="btn-primary" onClick={openCreate}>Assign Staff</button>}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Task</th>
                <th>Project</th>
                <th>Grant</th>
                <th>Allocated Hours</th>
                <th>Logged</th>
                <th>Remaining</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => {
                const remaining = Number(a.hours_remaining || 0);
                return (
                  <tr key={a.id}>
                    <td className="font-medium">{a.user_name}</td>
                    <td>{a.task_name}</td>
                    <td>{a.project_name}</td>
                    <td>{a.grant_name}</td>
                    <td>{Number(a.allocated_hours || 0).toFixed(0)}h</td>
                    <td>{Number(a.hours_logged || 0).toFixed(1)}h</td>
                    <td className={remaining < 0 ? 'text-red-600 font-medium' : ''}>{remaining.toFixed(1)}h</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn-secondary btn-sm" onClick={() => openEdit(a)}>Edit</button>
                        <button className="btn-danger btn-sm" onClick={() => handleDelete(a)}>Remove</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingAssignment ? 'Edit Assignment' : 'Assign Staff to Task'}>
        <form onSubmit={handleSave} className="space-y-4">
          {!editingAssignment && (
            <>
              <div>
                <label className="form-label">Staff Member *</label>
                <select className="form-select" required value={form.user_id} onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value }))}>
                  <option value="">Select staff…</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Task *</label>
                <select className="form-select" required value={form.task_id} onChange={(e) => setForm((f) => ({ ...f, task_id: e.target.value }))}>
                  <option value="">Select task…</option>
                  {tasks.map((t) => <option key={t.id} value={t.id}>{t.grant_name} → {t.project_name} → {t.name}</option>)}
                </select>
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Allocated Hours *</label>
              <input className="form-input" type="number" min="0" step="0.5" required {...field('allocated_hours')} />
            </div>
            <div>
              <label className="form-label">FTE % (optional)</label>
              <input className="form-input" type="number" min="0" max="100" step="1" placeholder="25" {...field('allocated_pct')} />
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
