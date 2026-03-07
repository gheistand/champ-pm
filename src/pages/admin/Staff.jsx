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

export default function AdminStaff() {
  const api = useApi();
  const { addToast } = useToast();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/staff');
      setStaff(res.staff || []);
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Staff</h1>
        <button className="btn-primary" onClick={openCreate}>+ Add Staff</button>
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
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="font-medium text-gray-900">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.email}</div>
                  </td>
                  <td>{s.title || '—'}</td>
                  <td>{s.classification || '—'}</td>
                  <td><Badge status={s.role} /></td>
                  <td>{formatDisplayDate(s.start_date) || '—'}</td>
                  <td>{s.assignment_count ?? 0}</td>
                  <td>{Number(s.total_allocated_hours || 0).toFixed(0)}h</td>
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
    </div>
  );
}
