import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { PageLoader } from '../../components/LoadingSpinner';
import { formatDisplayDate } from '../../utils/dateUtils';

const EMPTY_CONTACT_FORM = {
  first_name: '', last_name: '', org_id: '', role: '', email: '', phone: '', notes: '',
};

const EMPTY_INTERACTION_FORM = {
  type: 'call', interaction_date: '', grant_id: '', notes: '', next_action: '', next_action_due: '',
};

const INTERACTION_TYPE_LABELS = {
  call: 'Phone Call',
  email: 'Email',
  meeting: 'Meeting',
  other: 'Other',
};

export default function CRMContact() {
  const { id } = useParams();
  const api = useApi();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === 'admin';

  const [contact, setContact] = useState(null);
  const [grants, setGrants] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [allGrants, setAllGrants] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT_FORM);
  const [savingContact, setSavingContact] = useState(false);

  const [interactionModalOpen, setInteractionModalOpen] = useState(false);
  const [interactionForm, setInteractionForm] = useState(EMPTY_INTERACTION_FORM);
  const [savingInteraction, setSavingInteraction] = useState(false);

  const [linkGrantModalOpen, setLinkGrantModalOpen] = useState(false);
  const [linkGrantForm, setLinkGrantForm] = useState({ grant_id: '', relationship_type: '' });
  const [savingLink, setSavingLink] = useState(false);

  async function load() {
    try {
      const res = await api.get(`/api/crm/contacts/${id}`);
      setContact(res.contact);
      setGrants(res.grants || []);
      setInteractions(res.interactions || []);
      if (isAdmin) {
        const [grantsRes, orgsRes] = await Promise.all([
          api.get('/api/grants').catch(() => ({ grants: [] })),
          api.get('/api/crm/organizations').catch(() => ({ organizations: [] })),
        ]);
        setAllGrants(grantsRes.grants || []);
        setOrgs(orgsRes.organizations || []);
      }
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  function openEdit() {
    setContactForm({
      first_name: contact.first_name,
      last_name: contact.last_name,
      org_id: contact.org_id ? String(contact.org_id) : '',
      role: contact.role || '',
      email: contact.email || '',
      phone: contact.phone || '',
      notes: contact.notes || '',
    });
    setEditModalOpen(true);
  }

  async function handleSaveContact(e) {
    e.preventDefault();
    setSavingContact(true);
    try {
      await api.put(`/api/crm/contacts/${id}`, {
        ...contactForm,
        org_id: contactForm.org_id ? Number(contactForm.org_id) : null,
      });
      addToast('Contact updated');
      setEditModalOpen(false);
      load();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSavingContact(false);
    }
  }

  async function handleDeleteContact() {
    if (!confirm(`Delete contact "${contact.first_name} ${contact.last_name}"? This will also delete all their interactions.`)) return;
    try {
      await api.del(`/api/crm/contacts/${id}`);
      addToast('Contact deleted');
      navigate('/admin/crm');
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  async function handleLogInteraction(e) {
    e.preventDefault();
    setSavingInteraction(true);
    try {
      await api.post('/api/crm/interactions', {
        contact_id: Number(id),
        grant_id: interactionForm.grant_id ? Number(interactionForm.grant_id) : null,
        type: interactionForm.type,
        interaction_date: interactionForm.interaction_date,
        notes: interactionForm.notes || null,
        next_action: interactionForm.next_action || null,
        next_action_due: interactionForm.next_action_due || null,
      });
      addToast('Interaction logged');
      setInteractionModalOpen(false);
      setInteractionForm(EMPTY_INTERACTION_FORM);
      load();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSavingInteraction(false);
    }
  }

  async function handleMarkDone(interaction) {
    try {
      await api.put(`/api/crm/interactions/${interaction.id}`, {
        next_action_done: 1,
      });
      addToast('Marked as done');
      load();
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  async function handleDeleteInteraction(interaction) {
    if (!confirm('Delete this interaction?')) return;
    try {
      await api.del(`/api/crm/interactions/${interaction.id}`);
      addToast('Interaction deleted');
      load();
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  async function handleLinkGrant(e) {
    e.preventDefault();
    setSavingLink(true);
    try {
      await api.post(`/api/crm/contacts/${id}/grants`, {
        grant_id: Number(linkGrantForm.grant_id),
        relationship_type: linkGrantForm.relationship_type || null,
      });
      addToast('Grant linked');
      setLinkGrantModalOpen(false);
      setLinkGrantForm({ grant_id: '', relationship_type: '' });
      load();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSavingLink(false);
    }
  }

  async function handleUnlinkGrant(grantId) {
    if (!confirm('Remove this grant link?')) return;
    try {
      await api.del(`/api/crm/contacts/${id}/grants/${grantId}`);
      addToast('Grant unlinked');
      load();
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  const contactField = (key) => ({
    value: contactForm[key],
    onChange: (e) => setContactForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const interactionField = (key) => ({
    value: interactionForm[key],
    onChange: (e) => setInteractionForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const linkedGrantIds = new Set(grants.map((g) => g.id));
  const unlinkableGrants = allGrants.filter((g) => !linkedGrantIds.has(g.id));

  if (loading) return <PageLoader />;
  if (!contact) return <div className="text-gray-500 text-sm">Contact not found.</div>;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <Link to="/admin/crm" className="hover:text-brand-600">CRM</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800">{contact.first_name} {contact.last_name}</span>
      </nav>

      {/* Contact Header Card */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {contact.first_name} {contact.last_name}
            </h1>
            {contact.role && <p className="text-gray-600 mt-0.5">{contact.role}</p>}
            {contact.org_name && (
              <p className="text-sm text-gray-500 mt-1">{contact.org_name}</p>
            )}
          </div>
          {isAdmin && (
            <div className="flex gap-2 shrink-0">
              <button className="btn-secondary btn-sm" onClick={openEdit}>Edit</button>
              <button className="btn-secondary btn-sm text-red-600" onClick={handleDeleteContact}>Delete</button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-500">Email</p>
            {contact.email ? (
              <a href={`mailto:${contact.email}`} className="text-sm text-brand-600 hover:underline break-all">
                {contact.email}
              </a>
            ) : (
              <p className="text-sm text-gray-400">—</p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500">Phone</p>
            {contact.phone ? (
              <a href={`tel:${contact.phone}`} className="text-sm text-brand-600 hover:underline">
                {contact.phone}
              </a>
            ) : (
              <p className="text-sm text-gray-400">—</p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500">Organization</p>
            <p className="text-sm font-medium">{contact.org_name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Added</p>
            <p className="text-sm">{formatDisplayDate(contact.created_at?.split('T')[0] || contact.created_at)}</p>
          </div>
        </div>

        {contact.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
          </div>
        )}
      </div>

      {/* Linked Grants */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Linked Grants</h2>
          {isAdmin && (
            <button className="btn-secondary btn-sm" onClick={() => setLinkGrantModalOpen(true)}>
              + Link to Grant
            </button>
          )}
        </div>

        {grants.length === 0 ? (
          <p className="text-sm text-gray-500">No grants linked yet.</p>
        ) : (
          <div className="space-y-2">
            {grants.map((g) => (
              <div key={g.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <Link to={`/admin/grants/${g.id}`} className="text-sm font-medium text-brand-600 hover:underline">
                    {g.name}
                  </Link>
                  <span className="text-xs text-gray-400 ml-2">({g.funder})</span>
                  {g.relationship_type && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                      {g.relationship_type}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge status={g.status} />
                  {isAdmin && (
                    <button
                      className="text-xs text-red-500 hover:text-red-700"
                      onClick={() => handleUnlinkGrant(g.id)}
                    >
                      Unlink
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactions */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Interaction Log</h2>
          {isAdmin && (
            <button
              className="btn-primary btn-sm"
              onClick={() => {
                setInteractionForm({
                  ...EMPTY_INTERACTION_FORM,
                  interaction_date: new Date().toISOString().split('T')[0],
                });
                setInteractionModalOpen(true);
              }}
            >
              + Log Interaction
            </button>
          )}
        </div>

        {interactions.length === 0 ? (
          <p className="text-sm text-gray-500">No interactions logged yet.</p>
        ) : (
          <div className="space-y-4">
            {interactions.map((i) => (
              <div key={i.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      i.type === 'call' ? 'bg-blue-100 text-blue-800' :
                      i.type === 'email' ? 'bg-purple-100 text-purple-800' :
                      i.type === 'meeting' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {INTERACTION_TYPE_LABELS[i.type] || i.type}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDisplayDate(i.interaction_date)}
                    </span>
                    <span className="text-xs text-gray-400">by {i.user_id}</span>
                    {i.grant_name && (
                      <span className="text-xs text-gray-500">— {i.grant_name}</span>
                    )}
                  </div>
                  {isAdmin && (
                    <button
                      className="text-xs text-red-500 hover:text-red-700 shrink-0"
                      onClick={() => handleDeleteInteraction(i)}
                    >
                      Delete
                    </button>
                  )}
                </div>

                {i.notes && (
                  <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{i.notes}</p>
                )}

                {i.next_action && (
                  <div className={`mt-3 flex items-start gap-2 p-2 rounded ${
                    i.next_action_done ? 'bg-gray-50' : 'bg-amber-50'
                  }`}>
                    <div className="flex-1">
                      <p className={`text-xs font-medium ${i.next_action_done ? 'text-gray-500 line-through' : 'text-amber-800'}`}>
                        Next Action: {i.next_action}
                      </p>
                      {i.next_action_due && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Due: {formatDisplayDate(i.next_action_due)}
                        </p>
                      )}
                    </div>
                    {isAdmin && !i.next_action_done && (
                      <button
                        className="text-xs text-green-600 hover:text-green-800 font-medium shrink-0"
                        onClick={() => handleMarkDone(i)}
                      >
                        Mark done
                      </button>
                    )}
                    {i.next_action_done && (
                      <span className="text-xs text-gray-400 shrink-0">Done</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Contact Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Contact" size="md">
        <form onSubmit={handleSaveContact} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">First Name *</label>
              <input className="form-input" required {...contactField('first_name')} />
            </div>
            <div>
              <label className="form-label">Last Name *</label>
              <input className="form-input" required {...contactField('last_name')} />
            </div>
          </div>
          <div>
            <label className="form-label">Organization</label>
            <select className="form-select" {...contactField('org_id')}>
              <option value="">— None —</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Role / Title</label>
            <input className="form-input" {...contactField('role')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Email</label>
              <input className="form-input" type="email" {...contactField('email')} />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input className="form-input" type="tel" {...contactField('phone')} />
            </div>
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea className="form-input" rows={2} {...contactField('notes')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setEditModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={savingContact}>
              {savingContact ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Log Interaction Modal */}
      <Modal isOpen={interactionModalOpen} onClose={() => setInteractionModalOpen(false)} title="Log Interaction" size="md">
        <form onSubmit={handleLogInteraction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Type *</label>
              <select className="form-select" required {...interactionField('type')}>
                <option value="call">Phone Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="form-label">Date *</label>
              <input className="form-input" type="date" required {...interactionField('interaction_date')} />
            </div>
          </div>
          <div>
            <label className="form-label">Related Grant</label>
            <select className="form-select" {...interactionField('grant_id')}>
              <option value="">— None —</option>
              {allGrants.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea className="form-input" rows={3} placeholder="What was discussed?" {...interactionField('notes')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Next Action</label>
              <input className="form-input" placeholder="e.g. Follow up on budget" {...interactionField('next_action')} />
            </div>
            <div>
              <label className="form-label">Next Action Due</label>
              <input className="form-input" type="date" {...interactionField('next_action_due')} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setInteractionModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={savingInteraction}>
              {savingInteraction ? 'Saving…' : 'Log Interaction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Link Grant Modal */}
      <Modal isOpen={linkGrantModalOpen} onClose={() => setLinkGrantModalOpen(false)} title="Link to Grant" size="sm">
        <form onSubmit={handleLinkGrant} className="space-y-4">
          <div>
            <label className="form-label">Grant *</label>
            <select
              className="form-select"
              required
              value={linkGrantForm.grant_id}
              onChange={(e) => setLinkGrantForm((f) => ({ ...f, grant_id: e.target.value }))}
            >
              <option value="">— Select a grant —</option>
              {unlinkableGrants.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            {unlinkableGrants.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">All grants are already linked.</p>
            )}
          </div>
          <div>
            <label className="form-label">Relationship Type</label>
            <select
              className="form-select"
              value={linkGrantForm.relationship_type}
              onChange={(e) => setLinkGrantForm((f) => ({ ...f, relationship_type: e.target.value }))}
            >
              <option value="">— None —</option>
              <option value="program officer">Program Officer</option>
              <option value="subrecipient">Subrecipient</option>
              <option value="partner">Partner</option>
              <option value="consultant">Consultant</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setLinkGrantModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={savingLink || unlinkableGrants.length === 0}>
              {savingLink ? 'Linking…' : 'Link Grant'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
