import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { PageLoader } from '../../components/LoadingSpinner';
import { formatDisplayDate } from '../../utils/dateUtils';

const EMPTY_PROJECT = { name: '', description: '', start_date: '', end_date: '', budget: '', estimated_hours: '', status: 'active', project_type: 'custom', study_area_id: '' };
const EMPTY_FA = { fa_rate: '', fa_basis: 'mtdc', effective_date: '', notes: '' };

function BudgetGauge({ pct }) {
  const color = pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-green-500';
  const textColor = pct > 90 ? 'text-red-600' : pct > 75 ? 'text-amber-600' : 'text-green-600';
  return (
    <div>
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-3 ${color} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <p className={`text-xs font-medium ${textColor} mt-1`}>{pct.toFixed(1)}% used</p>
    </div>
  );
}

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

  // Phase 2: F&A and budget
  const [faData, setFaData] = useState({ current: null, history: [] });
  const [budgetData, setBudgetData] = useState(null);
  const [faModalOpen, setFaModalOpen] = useState(false);
  const [faForm, setFaForm] = useState(EMPTY_FA);
  const [savingFa, setSavingFa] = useState(false);
  const [studyAreas, setStudyAreas] = useState([]);

  async function load() {
    try {
      const [grantRes, faRes, budgetRes, areaRes] = await Promise.all([
        api.get(`/api/grants/${id}`),
        api.get(`/api/grants/${id}/fa`).catch(() => ({ current: null, history: [] })),
        api.get(`/api/budget/grant/${id}`).catch(() => null),
        api.get('/api/study-areas').catch(() => ({ study_areas: [] })),
      ]);
      setGrant(grantRes.grant);
      setProjects(grantRes.projects || []);
      setFaData(faRes);
      setBudgetData(budgetRes);
      setStudyAreas(areaRes.study_areas || []);
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
    setForm({ name: p.name, description: p.description || '', start_date: p.start_date || '', end_date: p.end_date || '', budget: p.budget, estimated_hours: p.estimated_hours, status: p.status, project_type: p.project_type || 'custom', study_area_id: p.study_area_id || '' });
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, grant_id: Number(id), budget: Number(form.budget) || 0, estimated_hours: Number(form.estimated_hours) || 0, study_area_id: form.study_area_id ? Number(form.study_area_id) : null };
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

  async function handleSaveFa(e) {
    e.preventDefault();
    setSavingFa(true);
    try {
      await api.post(`/api/grants/${id}/fa`, {
        ...faForm,
        fa_rate: parseFloat(faForm.fa_rate) / 100,
      });
      addToast('F&A rate updated');
      setFaModalOpen(false);
      load();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSavingFa(false);
    }
  }

  const field = (key) => ({ value: form[key], onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })) });
  const faField = (key) => ({ value: faForm[key], onChange: (e) => setFaForm((f) => ({ ...f, [key]: e.target.value })) });

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

      {/* F&A Rate Section */}
      <div className="card p-5 mt-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">F&A (Indirect Cost) Rate</h2>
          <button className="btn-secondary btn-sm" onClick={() => { setFaForm(EMPTY_FA); setFaModalOpen(true); }}>
            {faData.current ? 'Update Rate' : 'Set Rate'}
          </button>
        </div>
        {faData.current ? (
          <div>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-2xl font-bold text-brand-600">{(faData.current.fa_rate * 100).toFixed(1)}%</span>
              <span className="text-sm text-gray-500 uppercase">{faData.current.fa_basis}</span>
            </div>
            <p className="text-xs text-gray-500">Effective {formatDisplayDate(faData.current.effective_date)}</p>
            {faData.current.notes && <p className="text-xs text-gray-400 mt-1">{faData.current.notes}</p>}
            {faData.history.length > 1 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">Rate History</p>
                {faData.history.map(r => (
                  <p key={r.id} className="text-xs text-gray-400">
                    {(r.fa_rate * 100).toFixed(1)}% {r.fa_basis.toUpperCase()} — {formatDisplayDate(r.effective_date)}
                    {r.notes ? ` (${r.notes})` : ''}
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No F&A rate set. Click "Set Rate" to configure.</p>
        )}
      </div>

      {/* Budget Summary Section */}
      {budgetData && (
        <div className="card p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Budget Summary</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500">FEMA Budget</p>
              <p className="text-lg font-bold">${Number(budgetData.totals.fema_budget).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Personnel Cost</p>
              <p className="text-lg font-bold text-brand-600">${Number(budgetData.totals.personnel_cost).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">F&A Cost</p>
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
          <BudgetGauge pct={budgetData.totals.pct_used} />

          {/* Per-project breakdown */}
          {budgetData.projects.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase">By Project</h3>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Budget</th>
                      <th>Personnel</th>
                      <th>F&A</th>
                      <th>Total Cost</th>
                      <th>Remaining</th>
                      <th>% Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetData.projects.map(p => (
                      <tr key={p.id}>
                        <td className="font-medium">
                          <Link to={`/admin/projects/${p.id}`} className="text-brand-600 hover:underline">{p.name}</Link>
                        </td>
                        <td>${Number(p.fema_budget).toLocaleString()}</td>
                        <td>${Number(p.personnel_cost).toLocaleString()}</td>
                        <td>${Number(p.fa_cost).toLocaleString()}</td>
                        <td>${Number(p.total_cost).toLocaleString()}</td>
                        <td className={p.remaining < 0 ? 'text-red-600' : ''}>${Number(p.remaining).toLocaleString()}</td>
                        <td>
                          <BudgetGauge pct={p.pct_used} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* F&A Modal */}
      <Modal isOpen={faModalOpen} onClose={() => setFaModalOpen(false)} title="Set F&A Rate">
        <form onSubmit={handleSaveFa} className="space-y-4">
          <div>
            <label className="form-label">F&A Rate (%)</label>
            <input className="form-input" type="number" step="0.1" min="0" max="100" required
              placeholder="e.g. 31.7" {...faField('fa_rate')} />
          </div>
          <div>
            <label className="form-label">Basis</label>
            <select className="form-select" {...faField('fa_basis')}>
              <option value="mtdc">MTDC (Modified Total Direct Costs)</option>
              <option value="tdc">TDC (Total Direct Costs)</option>
            </select>
          </div>
          <div>
            <label className="form-label">Effective Date</label>
            <input className="form-input" type="date" required {...faField('effective_date')} />
          </div>
          <div>
            <label className="form-label">Notes</label>
            <input className="form-input" {...faField('notes')} placeholder="e.g. DHS cooperative agreement" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setFaModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={savingFa}>{savingFa ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>

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
          <div>
            <label className="form-label">Project Type</label>
            <select className="form-select" {...field('project_type')}>
              <option value="custom">Custom</option>
              <option value="data_development">FEMA Data Development</option>
              <option value="mapping">FEMA Mapping</option>
            </select>
          </div>
          {(form.project_type === 'data_development' || form.project_type === 'mapping') && (
            <div>
              <label className="form-label">Study Area <span className="text-gray-400 font-normal">(optional)</span></label>
              <select className="form-select" {...field('study_area_id')}>
                <option value="">— None —</option>
                {studyAreas.map(sa => (
                  <option key={sa.id} value={sa.id}>{sa.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
