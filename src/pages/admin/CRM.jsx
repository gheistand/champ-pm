import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import { PageLoader } from '../../components/LoadingSpinner';
import { formatDisplayDate } from '../../utils/dateUtils';
import { HelpButton } from '../../components/HelpButton';
import { TOOL_HELP } from '../../help/toolHelp';

const EMPTY_FORM = {
  first_name: '', last_name: '', org_id: '', role: '', email: '', phone: '', notes: '',
};

export default function CRM() {
  const api = useApi();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === 'admin';

  const [contacts, setContacts] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [contactsRes, orgsRes] = await Promise.all([
        api.get('/api/crm/contacts'),
        api.get('/api/crm/organizations'),
      ]);
      setContacts(contactsRes.contacts || []);
      setOrgs(orgsRes.organizations || []);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, org_id: form.org_id ? Number(form.org_id) : null };
      const res = await api.post('/api/crm/contacts', payload);
      addToast('Contact created');
      setModalOpen(false);
      load();
      navigate(`/admin/crm/${res.contact.id}`);
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

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    if (!q) return true;
    const name = `${c.first_name} ${c.last_name}`.toLowerCase();
    const org = (c.org_name || '').toLowerCase();
    return name.includes(q) || org.includes(q);
  });

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2">
          <h1 className="page-title">CRM — Contacts</h1>
          <HelpButton {...TOOL_HELP.crm} />
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={openCreate}>+ New Contact</button>
        )}
      </div>

      <div className="mb-4">
        <input
          className="form-input max-w-sm"
          placeholder="Search by name or organization…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        contacts.length === 0 ? (
          <EmptyState
            title="No contacts yet"
            description="Add your first contact to start building the CRM."
            action={isAdmin ? <button className="btn-primary" onClick={openCreate}>Add Contact</button> : null}
          />
        ) : (
          <p className="text-sm text-gray-500">No contacts match your search.</p>
        )
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Organization</th>
                <th>Role</th>
                <th>Email</th>
                <th>Linked Grants</th>
                <th>Last Interaction</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/admin/crm/${c.id}`)}
                >
                  <td className="font-medium text-brand-600">
                    {c.first_name} {c.last_name}
                  </td>
                  <td>{c.org_name || <span className="text-gray-400">—</span>}</td>
                  <td>{c.role || <span className="text-gray-400">—</span>}</td>
                  <td>
                    {c.email ? (
                      <a
                        href={`mailto:${c.email}`}
                        className="text-brand-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {c.email}
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td>
                    {c.grant_count > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-100 text-brand-800">
                        {c.grant_count} grant{c.grant_count !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        No grants
                      </span>
                    )}
                  </td>
                  <td className="text-gray-500">
                    {c.last_interaction_date
                      ? formatDisplayDate(c.last_interaction_date)
                      : <span className="text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Contact" size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">First Name *</label>
              <input className="form-input" required {...field('first_name')} />
            </div>
            <div>
              <label className="form-label">Last Name *</label>
              <input className="form-input" required {...field('last_name')} />
            </div>
          </div>
          <div>
            <label className="form-label">Organization</label>
            <select className="form-select" {...field('org_id')}>
              <option value="">— None —</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Role / Title</label>
            <input className="form-input" placeholder="e.g. Program Officer" {...field('role')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Email</label>
              <input className="form-input" type="email" {...field('email')} />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input className="form-input" type="tel" {...field('phone')} />
            </div>
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea className="form-input" rows={2} {...field('notes')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create Contact'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
