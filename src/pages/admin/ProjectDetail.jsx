import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { PageLoader } from '../../components/LoadingSpinner';
import { formatDisplayDate } from '../../utils/dateUtils';
import GanttChart from '../../components/schedule/GanttChart';
import ScheduleTable from '../../components/schedule/ScheduleTable';
import ScheduleSetup from '../../components/schedule/ScheduleSetup';
import WhatIfPanel from '../../components/schedule/WhatIfPanel';
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
const EMPTY_PHASE = { label: '', start_date: '', end_date: '', duration_days: '', notes: '' };
const EMPTY_MILESTONE = { label: '', target_date: '', is_key_decision: 0, is_pop_anchor: 0, display_order: 0, notes: '' };

const TABS = ['Tasks', 'Schedule'];

// ── CSV export helper ─────────────────────────────────────────────────────────
function exportScheduleCSV(phases, milestones) {
  const rows = [['Type', 'Label', 'Start Date', 'End Date', 'Duration (days)', 'Notes']];
  for (const p of phases) {
    const start = p.override?.start_date ?? p.start_date;
    const end = p.override?.end_date ?? p.end_date;
    const dur = p.override?.duration_days ?? p.duration_days ?? '';
    rows.push(['Phase', p.label, start, end, dur, p.notes || '']);
  }
  for (const m of milestones) {
    const date = m.override?.target_date ?? m.target_date;
    rows.push(['Milestone', m.label, date, date, '', m.notes || '']);
  }
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'schedule.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function ProjectDetail() {
  const { id } = useParams();
  const api = useApi();
  const { addToast } = useToast();

  // ── core state ──────────────────────────────────────────────────────────────
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Tasks');

  // tasks tab
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState(EMPTY_TASK);
  const [saving, setSaving] = useState(false);
  const [budgetData, setBudgetData] = useState(null);

  // schedule tab
  const [phases, setPhases] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [studyAreas, setStudyAreas] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [whatIfMode, setWhatIfMode] = useState(false);
  const [activeScenario, setActiveScenario] = useState(null);
  const [compareBase, setCompareBase] = useState(false);
  const [addPhaseOpen, setAddPhaseOpen] = useState(false);
  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false);
  const [phaseForm, setPhaseForm] = useState(EMPTY_PHASE);
  const [milestoneForm, setMilestoneForm] = useState(EMPTY_MILESTONE);
  const [savingPhase, setSavingPhase] = useState(false);
  const [savingMilestone, setSavingMilestone] = useState(false);

  // ── load project + tasks ────────────────────────────────────────────────────
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

  // ── load schedule data ──────────────────────────────────────────────────────
  const loadSchedule = useCallback(async () => {
    setScheduleLoading(true);
    try {
      const [phaseRes, msRes, scenRes, areaRes] = await Promise.all([
        api.get(`/api/schedule/phases?project_id=${id}`),
        api.get(`/api/schedule/milestones?project_id=${id}`),
        api.get(`/api/schedule/scenarios?project_id=${id}`),
        api.get('/api/study-areas'),
      ]);
      setPhases(phaseRes.phases || []);
      setMilestones(msRes.milestones || []);
      setScenarios(scenRes.scenarios || []);
      setStudyAreas(areaRes.study_areas || []);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setScheduleLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [id]);
  useEffect(() => { if (activeTab === 'Schedule') loadSchedule(); }, [activeTab, id]);

  // ── load scenario overrides when activeScenario changes ────────────────────
  useEffect(() => {
    if (!activeScenario) return;
    async function loadOverrides() {
      try {
        const res = await api.get(`/api/schedule/scenario-overrides?scenario_id=${activeScenario.id}`);
        setPhases(res.phases || []);
        setMilestones(res.milestones || []);
      } catch (e) {
        addToast(e.message, 'error');
      }
    }
    loadOverrides();
  }, [activeScenario]);

  // ── tasks tab handlers ──────────────────────────────────────────────────────
  function openCreate() { setEditingTask(null); setForm(EMPTY_TASK); setModalOpen(true); }

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
  const phaseField = (key) => ({ value: phaseForm[key], onChange: (e) => setPhaseForm((f) => ({ ...f, [key]: e.target.value })) });
  const msField = (key) => ({ value: milestoneForm[key], onChange: (e) => setMilestoneForm((f) => ({ ...f, [key]: e.target.value })) });

  // ── schedule setup ──────────────────────────────────────────────────────────
  async function handleScheduleSetup({ phases: tplPhases, milestones: tplMilestones }) {
    try {
      await Promise.all([
        ...tplPhases.map(ph =>
          api.post('/api/schedule/phases', { project_id: Number(id), ...ph })
        ),
        ...tplMilestones.map(ms =>
          api.post('/api/schedule/milestones', { project_id: Number(id), ...ms })
        ),
      ]);
      addToast('Schedule set up');
      loadSchedule();
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  async function handleProjectTypeChange({ project_type, study_area_id, _createArea }) {
    if (_createArea) {
      try {
        const res = await api.post('/api/study-areas', { name: _createArea });
        setStudyAreas(prev => [...prev, res.study_area]);
        addToast('Study area created');
      } catch (err) {
        addToast(err.message, 'error');
      }
      return;
    }
    try {
      await api.put(`/api/projects/${id}/schedule-type`, { project_type, study_area_id });
      setProject(prev => ({ ...prev, project_type, study_area_id }));
      addToast('Project type updated');
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  // ── phase CRUD ──────────────────────────────────────────────────────────────
  async function handleAddPhase(e) {
    e.preventDefault();
    setSavingPhase(true);
    try {
      const popDate = project?.grant_end_date;
      if (popDate && phaseForm.end_date > popDate) {
        addToast(`Phase end date exceeds Grant PoP (${formatDisplayDate(popDate)})`, 'error');
        return;
      }
      await api.post('/api/schedule/phases', {
        project_id: Number(id),
        label: phaseForm.label,
        start_date: phaseForm.start_date,
        end_date: phaseForm.end_date,
        duration_days: phaseForm.duration_days ? Number(phaseForm.duration_days) : null,
        display_order: phases.length,
        notes: phaseForm.notes,
      });
      addToast('Phase added');
      setAddPhaseOpen(false);
      setPhaseForm(EMPTY_PHASE);
      loadSchedule();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSavingPhase(false);
    }
  }

  async function handlePhaseChange(phaseId, updates) {
    if (whatIfMode && activeScenario) {
      // Write to scenario override, not base
      try {
        await api.post('/api/schedule/scenario-overrides', {
          type: 'phase',
          scenario_id: activeScenario.id,
          phase_id: phaseId,
          ...updates,
        });
        // Reload merged overrides
        const res = await api.get(`/api/schedule/scenario-overrides?scenario_id=${activeScenario.id}`);
        setPhases(res.phases || []);
        setMilestones(res.milestones || []);
      } catch (err) {
        addToast(err.message, 'error');
      }
    } else {
      try {
        await api.put('/api/schedule/phases', { id: phaseId, ...updates });
        loadSchedule();
      } catch (err) {
        addToast(err.message, 'error');
      }
    }
  }

  async function handlePhaseDelete(phaseId) {
    if (!confirm('Delete this phase?')) return;
    try {
      await api.del(`/api/schedule/phases?id=${phaseId}`);
      addToast('Phase deleted');
      loadSchedule();
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  // ── milestone CRUD ──────────────────────────────────────────────────────────
  async function handleAddMilestone(e) {
    e.preventDefault();
    setSavingMilestone(true);
    try {
      const popDate = project?.grant_end_date;
      if (popDate && milestoneForm.target_date > popDate) {
        addToast(`Milestone date exceeds Grant PoP (${formatDisplayDate(popDate)})`, 'error');
        return;
      }
      await api.post('/api/schedule/milestones', {
        project_id: Number(id),
        label: milestoneForm.label,
        target_date: milestoneForm.target_date,
        is_key_decision: Number(milestoneForm.is_key_decision),
        is_pop_anchor: Number(milestoneForm.is_pop_anchor),
        display_order: milestones.length,
        notes: milestoneForm.notes,
      });
      addToast('Milestone added');
      setAddMilestoneOpen(false);
      setMilestoneForm(EMPTY_MILESTONE);
      loadSchedule();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSavingMilestone(false);
    }
  }

  async function handleMilestoneChange(msId, updates) {
    if (whatIfMode && activeScenario) {
      try {
        await api.post('/api/schedule/scenario-overrides', {
          type: 'milestone',
          scenario_id: activeScenario.id,
          milestone_id: msId,
          ...updates,
        });
        const res = await api.get(`/api/schedule/scenario-overrides?scenario_id=${activeScenario.id}`);
        setPhases(res.phases || []);
        setMilestones(res.milestones || []);
      } catch (err) {
        addToast(err.message, 'error');
      }
    } else {
      try {
        await api.put('/api/schedule/milestones', { id: msId, ...updates });
        loadSchedule();
      } catch (err) {
        addToast(err.message, 'error');
      }
    }
  }

  async function handleMilestoneDelete(msId) {
    if (!confirm('Delete this milestone?')) return;
    try {
      await api.del(`/api/schedule/milestones?id=${msId}`);
      addToast('Milestone deleted');
      loadSchedule();
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  // ── what-if scenario handlers ───────────────────────────────────────────────
  async function handleEnterWhatIf() {
    // Create a new draft scenario
    try {
      const res = await api.post('/api/schedule/scenarios', {
        project_id: Number(id),
        name: 'Draft What-if',
        status: 'draft',
      });
      setActiveScenario(res.scenario);
      setWhatIfMode(true);
      addToast('What-if mode active — changes are sandboxed');
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  async function handleSaveScenario({ name }) {
    if (!activeScenario) return;
    try {
      const res = await api.put('/api/schedule/scenarios', { id: activeScenario.id, name, status: 'saved' });
      setActiveScenario(res.scenario);
      setScenarios(prev => prev.map(s => s.id === res.scenario.id ? res.scenario : s));
      addToast('Scenario saved');
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  function handleExitWhatIf() {
    setWhatIfMode(false);
    setActiveScenario(null);
    setCompareBase(false);
    loadSchedule();
  }

  async function handleLoadScenario(scenario) {
    setActiveScenario(scenario);
    setWhatIfMode(true);
    try {
      const res = await api.get(`/api/schedule/scenario-overrides?scenario_id=${scenario.id}`);
      setPhases(res.phases || []);
      setMilestones(res.milestones || []);
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  async function handleDeleteScenario(scenarioId) {
    if (!confirm('Delete this scenario?')) return;
    try {
      await api.del(`/api/schedule/scenarios?id=${scenarioId}`);
      if (activeScenario?.id === scenarioId) handleExitWhatIf();
      else {
        setScenarios(prev => prev.filter(s => s.id !== scenarioId));
        addToast('Scenario deleted');
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  // ── guards ──────────────────────────────────────────────────────────────────
  if (loading) return <PageLoader />;
  if (!project) return <p className="text-red-600">Project not found.</p>;

  const popDate = project.grant_end_date || null;
  const hasSchedule = phases.length > 0 || milestones.length > 0;

  // ── render ──────────────────────────────────────────────────────────────────
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
          {activeTab === 'Tasks' && (
            <button className="btn-primary" onClick={openCreate}>+ New Task</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-card"><div className="stat-value">${Number(project.budget || 0).toLocaleString()}</div><div className="stat-label">Budget</div></div>
        <div className="stat-card"><div className="stat-value">{Number(project.estimated_hours || 0).toFixed(0)}h</div><div className="stat-label">Estimated Hours</div></div>
        <div className="stat-card"><div className="stat-value">{tasks.length}</div><div className="stat-label">Tasks</div></div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-0 mb-4 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
            {tab === 'Schedule' && phases.length === 0 && milestones.length === 0 && activeTab !== 'Schedule' && (
              <span className="ml-1.5 inline-flex items-center justify-center w-2 h-2 rounded-full bg-amber-400" title="No schedule set up" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tasks tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'Tasks' && (
        <>
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
                <div><p className="text-xs text-gray-500">FEMA Budget</p><p className="text-lg font-bold">${Number(budgetData.totals.fema_budget).toLocaleString()}</p></div>
                <div><p className="text-xs text-gray-500">Personnel</p><p className="text-lg font-bold text-brand-600">${Number(budgetData.totals.personnel_cost).toLocaleString()}</p></div>
                <div><p className="text-xs text-gray-500">F&A ({(budgetData.fa_rate * 100).toFixed(1)}%)</p><p className="text-lg font-bold text-purple-600">${Number(budgetData.totals.fa_cost).toLocaleString()}</p></div>
                <div><p className="text-xs text-gray-500">Total Cost</p><p className="text-lg font-bold">${Number(budgetData.totals.total_cost).toLocaleString()}</p></div>
                <div><p className="text-xs text-gray-500">Remaining</p><p className={`text-lg font-bold ${budgetData.totals.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>${Number(budgetData.totals.remaining).toLocaleString()}</p></div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={budgetData.tasks.map(t => ({
                  name: t.name.length > 15 ? t.name.substring(0, 15) + '…' : t.name,
                  Budget: t.fema_budget, Personnel: t.personnel_cost, 'F&A': t.fa_cost, Remaining: Math.max(0, t.remaining),
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
              <div className="mt-4 overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Task</th><th>Budget</th><th>Hours</th><th>Personnel</th><th>F&A</th><th>Total</th><th>Remaining</th><th>% Used</th></tr></thead>
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
        </>
      )}

      {/* ── Schedule tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'Schedule' && (
        <div>
          {scheduleLoading ? (
            <PageLoader />
          ) : !hasSchedule ? (
            <ScheduleSetup
              project={{ ...project, grant_end_date: popDate }}
              studyAreas={studyAreas}
              onSetup={handleScheduleSetup}
              onProjectTypeChange={handleProjectTypeChange}
            />
          ) : (
            <div className="space-y-4">
              {/* Header bar */}
              <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded text-sm">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-700">{project.name}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-500">{project.grant_name}</span>
                  {popDate && (
                    <>
                      <span className="text-gray-400 mx-2">·</span>
                      <span className="text-red-600 font-medium">Grant PoP: {formatDisplayDate(popDate)}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!whatIfMode && (
                    <button className="btn-secondary btn-sm" onClick={handleEnterWhatIf}>What-if Mode</button>
                  )}
                  {scenarios.length > 0 && !whatIfMode && (
                    <select
                      className="form-select py-1 text-xs"
                      defaultValue=""
                      onChange={(e) => {
                        const s = scenarios.find(x => String(x.id) === e.target.value);
                        if (s) handleLoadScenario(s);
                        e.target.value = '';
                      }}
                    >
                      <option value="" disabled>Load Scenario…</option>
                      {scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => exportScheduleCSV(phases, milestones)}
                  >
                    Export CSV
                  </button>
                  <button className="btn-primary btn-sm" onClick={() => setAddPhaseOpen(true)}>+ Phase</button>
                  <button className="btn-secondary btn-sm" onClick={() => setAddMilestoneOpen(true)}>+ Milestone</button>
                </div>
              </div>

              {/* What-if panel */}
              {whatIfMode && (
                <WhatIfPanel
                  scenario={activeScenario}
                  scenarios={scenarios}
                  onSave={handleSaveScenario}
                  onExit={handleExitWhatIf}
                  onLoad={handleLoadScenario}
                  onDelete={handleDeleteScenario}
                  compareEnabled={compareBase}
                  onToggleCompare={setCompareBase}
                />
              )}

              {/* Gantt chart */}
              <GanttChart
                phases={phases}
                milestones={milestones}
                popDate={popDate}
                todayDate={new Date().toISOString().slice(0, 10)}
                readOnly={!whatIfMode}
                onPhaseChange={handlePhaseChange}
                onMilestoneChange={handleMilestoneChange}
              />

              {/* Schedule table */}
              <ScheduleTable
                phases={phases}
                milestones={milestones}
                popDate={popDate}
                readOnly={!whatIfMode && true}
                onPhaseChange={(phaseId, updates) => handlePhaseChange(phaseId, updates)}
                onPhaseDelete={handlePhaseDelete}
                onMilestoneChange={(msId, updates) => handleMilestoneChange(msId, updates)}
                onMilestoneDelete={handleMilestoneDelete}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Task modal ───────────────────────────────────────────────────────── */}
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

      {/* ── Add Phase modal ──────────────────────────────────────────────────── */}
      <Modal isOpen={addPhaseOpen} onClose={() => setAddPhaseOpen(false)} title="Add Phase">
        <form onSubmit={handleAddPhase} className="space-y-4">
          <div><label className="form-label">Label *</label><input className="form-input" required {...phaseField('label')} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">Start Date *</label><input className="form-input" type="date" required {...phaseField('start_date')} /></div>
            <div><label className="form-label">End Date *</label><input className="form-input" type="date" required max={popDate || undefined} {...phaseField('end_date')} /></div>
          </div>
          {popDate && phaseForm.end_date > popDate && (
            <p className="text-red-600 text-sm">This date exceeds the Grant Period of Performance ({formatDisplayDate(popDate)}). Please adjust.</p>
          )}
          <div><label className="form-label">Notes</label><textarea className="form-input" rows={2} {...phaseField('notes')} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setAddPhaseOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={savingPhase || (popDate && phaseForm.end_date > popDate)}>{savingPhase ? 'Adding…' : 'Add Phase'}</button>
          </div>
        </form>
      </Modal>

      {/* ── Add Milestone modal ──────────────────────────────────────────────── */}
      <Modal isOpen={addMilestoneOpen} onClose={() => setAddMilestoneOpen(false)} title="Add Milestone">
        <form onSubmit={handleAddMilestone} className="space-y-4">
          <div><label className="form-label">Label *</label><input className="form-input" required {...msField('label')} /></div>
          <div><label className="form-label">Target Date *</label><input className="form-input" type="date" required max={popDate || undefined} {...msField('target_date')} /></div>
          {popDate && milestoneForm.target_date > popDate && (
            <p className="text-red-600 text-sm">This date exceeds the Grant Period of Performance ({formatDisplayDate(popDate)}). Please adjust.</p>
          )}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!milestoneForm.is_key_decision} onChange={e => setMilestoneForm(f => ({ ...f, is_key_decision: e.target.checked ? 1 : 0 }))} />
              Key Decision Point
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!milestoneForm.is_pop_anchor} onChange={e => setMilestoneForm(f => ({ ...f, is_pop_anchor: e.target.checked ? 1 : 0 }))} />
              PoP Anchor
            </label>
          </div>
          <div><label className="form-label">Notes</label><textarea className="form-input" rows={2} {...msField('notes')} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setAddMilestoneOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={savingMilestone || (popDate && milestoneForm.target_date > popDate)}>{savingMilestone ? 'Adding…' : 'Add Milestone'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
