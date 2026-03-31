import { useState, useEffect, useRef } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';

const TABS = ['Grant Balances', 'Appointments', 'Plan Builder', 'Saved Plans'];

export default function StaffPlans() {
  const [tab, setTab] = useState(0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staff Plans</h1>
        <p className="text-sm text-gray-500 mt-1">Optimize staff allocations across FEMA grants</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                tab === i
                  ? 'border-brand-500 text-brand-700 bg-brand-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {tab === 0 && <GrantBalancesTab />}
      {tab === 1 && <AppointmentsTab />}
      {tab === 2 && <PlanBuilderTab />}
      {tab === 3 && <SavedPlansTab />}
    </div>
  );
}

// ─── Grant Balances Tab ──────────────────────────────────────────────────────

function GrantBalancesTab() {
  const api = useApi();
  const { addToast } = useToast();
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_BALANCE);

  useEffect(() => { loadBalances(); }, []);

  async function loadBalances() {
    setLoading(true);
    try {
      const data = await api.get('/api/staff-plans/balances');
      setBalances(data.balances || []);
    } catch {
      addToast('Failed to load balances', 'error');
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditRow(null);
    setForm(EMPTY_BALANCE);
    setShowModal(true);
  }

  function openEdit(b) {
    setEditRow(b);
    setForm({ ...b });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.post('/api/staff-plans/balances', form);
      addToast('Balance saved', 'success');
      setShowModal(false);
      loadBalances();
    } catch {
      addToast('Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this balance record?')) return;
    try {
      await api.delete(`/api/staff-plans/balances/${id}`);
      addToast('Deleted', 'success');
      loadBalances();
    } catch {
      addToast('Delete failed', 'error');
    }
  }

  const totalBalance = balances.reduce((s, b) => s + (b.remaining_balance || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-sm text-gray-500">Total remaining: </span>
          <span className="font-semibold text-gray-900">{fmtDollar(totalBalance)}</span>
        </div>
        <button onClick={openAdd} className="btn-primary">+ Add Balance</button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Loading…</div>
      ) : balances.length === 0 ? (
        <div className="text-gray-400 text-sm py-8 text-center">No balances yet. Add grant balances from PRIDE.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-3 py-2">Fund</th>
                <th className="px-3 py-2">Account String</th>
                <th className="px-3 py-2 text-right">Remaining Balance</th>
                <th className="px-3 py-2">POP End Date</th>
                <th className="px-3 py-2">As Of</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {balances.map(b => {
                const urgency = popUrgency(b.pop_end_date);
                return (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono font-medium text-gray-900">{b.fund_number}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600">{b.full_account_string || '—'}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">{fmtDollar(b.remaining_balance)}</td>
                    <td className={`px-3 py-2 font-medium ${urgency === 'red' ? 'text-red-600' : urgency === 'yellow' ? 'text-yellow-600' : 'text-gray-700'}`}>
                      {b.pop_end_date}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{b.as_of_date}</td>
                    <td className="px-3 py-2 text-gray-500 max-w-xs truncate">{b.notes || ''}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(b)} className="text-xs text-brand-600 hover:underline">Edit</button>
                        <button onClick={() => handleDelete(b.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editRow ? 'Edit Balance' : 'Add Balance'} onClose={() => setShowModal(false)}>
          <div className="space-y-3">
            <Field label="Fund Number *" value={form.fund_number} onChange={v => setForm(f => ({ ...f, fund_number: v }))} />
            <Field label="Full Account String" value={form.full_account_string} onChange={v => setForm(f => ({ ...f, full_account_string: v }))} />
            <Field label="Remaining Balance ($) *" type="number" value={form.remaining_balance} onChange={v => setForm(f => ({ ...f, remaining_balance: v }))} />
            <Field label="POP End Date *" type="date" value={form.pop_end_date} onChange={v => setForm(f => ({ ...f, pop_end_date: v }))} />
            <Field label="As Of Date *" type="date" value={form.as_of_date} onChange={v => setForm(f => ({ ...f, as_of_date: v }))} />
            <Field label="Notes" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const EMPTY_BALANCE = {
  fund_number: '', full_account_string: '', remaining_balance: '',
  pop_end_date: '', as_of_date: new Date().toISOString().slice(0, 10), notes: ''
};

// ─── Appointments Tab ────────────────────────────────────────────────────────

function AppointmentsTab() {
  const api = useApi();
  const { addToast } = useToast();
  const fileRef = useRef(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [filters, setFilters] = useState({ user_id: '', fund: '', date_from: '', date_to: '' });
  const [preview, setPreview] = useState(null);

  useEffect(() => { loadAppointments(); }, []);

  async function loadAppointments() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.user_id) params.set('user_id', filters.user_id);
      if (filters.fund) params.set('fund', filters.fund);
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);
      const data = await api.get(`/api/staff-plans/appointments?${params}`);
      setAppointments(data.appointments || []);
    } catch {
      addToast('Failed to load appointments', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      setPreview(rows);
    } catch {
      addToast('Failed to parse file', 'error');
    }
    e.target.value = '';
  }

  async function confirmImport() {
    if (!preview) return;
    setImporting(true);
    try {
      const data = await api.post('/api/staff-plans/appointments/import', { rows: preview });
      addToast(`Imported ${data.imported} rows${data.errors ? ` (${data.errors.length} errors)` : ''}`, data.errors ? 'warning' : 'success');
      if (data.errors) console.warn('Import errors:', data.errors);
      setPreview(null);
      loadAppointments();
    } catch {
      addToast('Import failed', 'error');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 flex-wrap">
          <input
            className="input-sm" placeholder="Filter by user ID"
            value={filters.user_id} onChange={e => setFilters(f => ({ ...f, user_id: e.target.value }))}
          />
          <input
            className="input-sm" placeholder="Filter by fund"
            value={filters.fund} onChange={e => setFilters(f => ({ ...f, fund: e.target.value }))}
          />
          <input type="date" className="input-sm" value={filters.date_from}
            onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
          <input type="date" className="input-sm" value={filters.date_to}
            onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
          <button onClick={loadAppointments} className="btn-secondary text-xs">Filter</button>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".csv,.json" className="hidden" onChange={handleFileChange} />
          <button onClick={() => fileRef.current?.click()} className="btn-primary">Import from Spreadsheet</button>
        </div>
      </div>

      {preview && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-800 mb-2">{preview.length} rows ready to import</p>
          <div className="overflow-x-auto max-h-48">
            <table className="text-xs min-w-full">
              <thead><tr className="bg-blue-100">
                {Object.keys(preview[0] || {}).slice(0, 6).map(k => <th key={k} className="px-2 py-1 text-left">{k}</th>)}
              </tr></thead>
              <tbody>{preview.slice(0, 5).map((r, i) => (
                <tr key={i}>{Object.values(r).slice(0, 6).map((v, j) => <td key={j} className="px-2 py-1">{String(v)}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={confirmImport} disabled={importing} className="btn-primary text-xs">{importing ? 'Importing…' : 'Confirm Import'}</button>
            <button onClick={() => setPreview(null)} className="btn-secondary text-xs">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Loading…</div>
      ) : appointments.length === 0 ? (
        <div className="text-gray-400 text-sm py-8 text-center">No appointments found. Import from spreadsheet to get started.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-3 py-2">Staff</th>
                <th className="px-3 py-2">Fund</th>
                <th className="px-3 py-2">Period Start</th>
                <th className="px-3 py-2">Period End</th>
                <th className="px-3 py-2 text-right">Alloc %</th>
                <th className="px-3 py-2 text-right">Salary Rate</th>
                <th className="px-3 py-2">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {appointments.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-900">{a.user_name || a.user_id}</td>
                  <td className="px-3 py-2 font-mono text-gray-700">{a.fund_number}</td>
                  <td className="px-3 py-2 text-gray-600">{a.period_start}</td>
                  <td className="px-3 py-2 text-gray-600">{a.period_end}</td>
                  <td className="px-3 py-2 text-right font-medium">{a.allocation_pct}%</td>
                  <td className="px-3 py-2 text-right text-gray-600">{a.salary_rate ? fmtDollar(a.salary_rate) : '—'}</td>
                  <td className="px-3 py-2"><span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{a.source}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-2">{appointments.length} records</p>
        </div>
      )}
    </div>
  );
}

// ─── Plan Builder Tab ────────────────────────────────────────────────────────

function PlanBuilderTab() {
  const api = useApi();
  const { addToast } = useToast();
  const [scenarios, setScenarios] = useState([]);
  const [activeScenario, setActiveScenario] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [view, setView] = useState('staff'); // 'staff' | 'grant'
  const [expandedUsers, setExpandedUsers] = useState(new Set());
  const [newForm, setNewForm] = useState({
    name: '',
    description: '',
    plan_start_date: new Date().toISOString().slice(0, 10),
    plan_end_date: addMonths(new Date(), 24).toISOString().slice(0, 10),
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadScenarios(); }, []);

  async function loadScenarios() {
    try {
      const data = await api.get('/api/staff-plans/scenarios');
      setScenarios(data.scenarios || []);
    } catch {
      addToast('Failed to load scenarios', 'error');
    }
  }

  async function openScenario(id) {
    setLoading(true);
    try {
      const data = await api.get(`/api/staff-plans/scenarios/${id}`);
      setActiveScenario(data.scenario);
      setRows(data.rows || []);
    } catch {
      addToast('Failed to load scenario', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function createScenario() {
    if (!newForm.name) return addToast('Name is required', 'error');
    setCreating(true);
    try {
      const data = await api.post('/api/staff-plans/scenarios', newForm);
      addToast(`Created "${data.scenario.name}" with ${data.row_count} rows`, 'success');
      setShowNewModal(false);
      await loadScenarios();
      openScenario(data.scenario.id);
    } catch {
      addToast('Failed to create scenario', 'error');
    } finally {
      setCreating(false);
    }
  }

  async function recalculate() {
    if (!activeScenario) return;
    setRecalculating(true);
    try {
      const data = await api.post(`/api/staff-plans/scenarios/${activeScenario.id}/recalculate`, {});
      setRows(data.rows || []);
      addToast(`Recalculated: ${data.row_count} rows`, 'success');
    } catch {
      addToast('Recalculate failed', 'error');
    } finally {
      setRecalculating(false);
    }
  }

  async function exportScenario() {
    if (!activeScenario) return;
    try {
      const data = await api.post(`/api/staff-plans/scenarios/${activeScenario.id}/export`, {});
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeScenario.name.replace(/\s+/g, '_')}_export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      addToast('Export failed', 'error');
    }
  }

  async function updateRow(rowId, newPct) {
    if (!activeScenario) return;
    try {
      const data = await api.put(`/api/staff-plans/scenarios/${activeScenario.id}/rows/${rowId}`, { allocation_pct: newPct });
      setRows(prev => prev.map(r => r.id === rowId ? data.row : r));
    } catch {
      addToast('Failed to save override', 'error');
    }
  }

  function toggleUser(userId) {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  }

  // Group rows by user
  const byUser = {};
  for (const r of rows) {
    if (!byUser[r.user_id]) byUser[r.user_id] = { name: r.user_name || r.user_id, rows: [] };
    byUser[r.user_id].rows.push(r);
  }

  // Group rows by fund (grant view)
  const byFund = {};
  for (const r of rows) {
    if (!byFund[r.fund_number]) byFund[r.fund_number] = [];
    byFund[r.fund_number].push(r);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-2">
          {scenarios.slice(0, 5).map(s => (
            <button
              key={s.id}
              onClick={() => openScenario(s.id)}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                activeScenario?.id === s.id
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
        <button onClick={() => setShowNewModal(true)} className="btn-primary text-xs">+ New Plan</button>
        {activeScenario && (
          <>
            <button onClick={recalculate} disabled={recalculating} className="btn-secondary text-xs">
              {recalculating ? 'Recalculating…' : 'Recalculate'}
            </button>
            <button onClick={exportScenario} className="btn-secondary text-xs">Export JSON</button>
            <div className="ml-auto flex gap-1">
              <button onClick={() => setView('staff')} className={`text-xs px-2 py-1 rounded ${view === 'staff' ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'}`}>Staff View</button>
              <button onClick={() => setView('grant')} className={`text-xs px-2 py-1 rounded ${view === 'grant' ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'}`}>Grant View</button>
            </div>
          </>
        )}
      </div>

      {loading && <div className="text-gray-400 text-sm py-8 text-center">Loading scenario…</div>}

      {!loading && activeScenario && (
        <>
          <div className="mb-3 text-sm text-gray-600">
            <span className="font-medium">{activeScenario.name}</span>
            {' — '}
            {activeScenario.plan_start_date} to {activeScenario.plan_end_date}
            {' · '}
            <span className={`text-xs px-1.5 py-0.5 rounded ${activeScenario.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{activeScenario.status}</span>
          </div>

          {view === 'staff' ? (
            <StaffView byUser={byUser} expandedUsers={expandedUsers} onToggle={toggleUser} onUpdateRow={updateRow} />
          ) : (
            <GrantView byFund={byFund} />
          )}
        </>
      )}

      {!loading && !activeScenario && (
        <div className="text-gray-400 text-sm py-12 text-center">
          Select a saved plan above or create a new one.
        </div>
      )}

      {showNewModal && (
        <Modal title="New Plan" onClose={() => setShowNewModal(false)}>
          <div className="space-y-3">
            <Field label="Plan Name *" value={newForm.name} onChange={v => setNewForm(f => ({ ...f, name: v }))} />
            <Field label="Description" value={newForm.description} onChange={v => setNewForm(f => ({ ...f, description: v }))} />
            <Field label="Start Date *" type="date" value={newForm.plan_start_date} onChange={v => setNewForm(f => ({ ...f, plan_start_date: v }))} />
            <Field label="End Date *" type="date" value={newForm.plan_end_date} onChange={v => setNewForm(f => ({ ...f, plan_end_date: v }))} />
            <p className="text-xs text-gray-500">Optimization will run automatically using current grant balances and appointment history.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowNewModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={createScenario} disabled={creating} className="btn-primary">{creating ? 'Generating…' : 'Generate Plan'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StaffView({ byUser, expandedUsers, onToggle, onUpdateRow }) {
  return (
    <div className="space-y-2">
      {Object.entries(byUser).map(([userId, { name, rows }]) => {
        const expanded = expandedUsers.has(userId);
        const totalCost = rows.reduce((s, r) => s + (r.estimated_cost || 0), 0);
        const hasFlags = rows.some(r => r.flag);
        return (
          <div key={userId} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
              onClick={() => onToggle(userId)}
            >
              <div className="flex items-center gap-2">
                {hasFlags && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Has flags" />}
                <span className="font-medium text-gray-900">{name}</span>
                <span className="text-xs text-gray-500">{rows.length} rows</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">{fmtDollar(totalCost)} est.</span>
                <ChevronIcon expanded={expanded} />
              </div>
            </button>
            {expanded && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-white border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
                      <th className="px-4 py-2 text-left">Period</th>
                      <th className="px-4 py-2 text-left">Fund</th>
                      <th className="px-4 py-2 text-right">Alloc %</th>
                      <th className="px-4 py-2 text-right">Est. Cost</th>
                      <th className="px-4 py-2 text-left">Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map(r => (
                      <EditableRow key={r.id} row={r} onSave={onUpdateRow} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EditableRow({ row, onSave }) {
  const [editing, setEditing] = useState(false);
  const [pct, setPct] = useState(row.allocation_pct);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(row.id, parseFloat(pct));
    setSaving(false);
    setEditing(false);
  }

  return (
    <tr className={`hover:bg-gray-50 ${row.flag ? 'bg-red-50' : ''} ${row.is_override ? 'bg-yellow-50' : ''}`}>
      <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{row.period_start} – {row.period_end}</td>
      <td className="px-4 py-2 font-mono text-gray-700">{row.fund_number}</td>
      <td className="px-4 py-2 text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            <input
              type="number" min="0" max="100"
              value={pct} onChange={e => setPct(e.target.value)}
              className="w-16 text-right border border-brand-400 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              autoFocus
            />
            <button onClick={save} disabled={saving} className="text-xs text-green-600 font-medium">{saving ? '…' : '✓'}</button>
            <button onClick={() => { setPct(row.allocation_pct); setEditing(false); }} className="text-xs text-gray-400">✗</button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="font-medium text-gray-900 hover:text-brand-600 group"
            title="Click to edit"
          >
            {row.allocation_pct}%
            {row.is_override ? <span className="ml-1 text-yellow-500 text-xs">✎</span> : null}
          </button>
        )}
      </td>
      <td className="px-4 py-2 text-right text-gray-600">{row.estimated_cost ? fmtDollar(row.estimated_cost) : '—'}</td>
      <td className="px-4 py-2">
        {row.flag && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
            row.flag === 'low_pct' ? 'bg-orange-100 text-orange-700' :
            row.flag === 'over_budget' ? 'bg-red-100 text-red-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>{row.flag}</span>
        )}
      </td>
    </tr>
  );
}

function GrantView({ byFund }) {
  return (
    <div className="space-y-4">
      {Object.entries(byFund).map(([fund, rows]) => {
        const totalCost = rows.reduce((s, r) => s + (r.estimated_cost || 0), 0);
        return (
          <div key={fund} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 flex justify-between items-center">
              <span className="font-mono font-medium text-gray-900">{fund}</span>
              <span className="text-sm text-gray-600">Total est. spend: {fmtDollar(totalCost)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-white border-b text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-2 text-left">Staff</th>
                    <th className="px-4 py-2 text-left">Period</th>
                    <th className="px-4 py-2 text-right">Alloc %</th>
                    <th className="px-4 py-2 text-right">Est. Cost</th>
                    <th className="px-4 py-2 text-left">Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map(r => (
                    <tr key={r.id} className={`hover:bg-gray-50 ${r.flag ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-2 text-gray-900">{r.user_name || r.user_id}</td>
                      <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{r.period_start} – {r.period_end}</td>
                      <td className="px-4 py-2 text-right font-medium">{r.allocation_pct}%</td>
                      <td className="px-4 py-2 text-right text-gray-600">{r.estimated_cost ? fmtDollar(r.estimated_cost) : '—'}</td>
                      <td className="px-4 py-2">
                        {r.flag && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">{r.flag}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Saved Plans Tab ─────────────────────────────────────────────────────────

function SavedPlansTab() {
  const api = useApi();
  const { addToast } = useToast();
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadScenarios(); }, []);

  async function loadScenarios() {
    setLoading(true);
    try {
      const data = await api.get('/api/staff-plans/scenarios');
      setScenarios(data.scenarios || []);
    } catch {
      addToast('Failed to load scenarios', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, status) {
    try {
      // Use balances upsert pattern — we'll PATCH via PUT row endpoint isn't ideal;
      // for now do it via a direct DB-updating endpoint... but we don't have one.
      // We'll just refresh after a no-op for now.
      addToast('Status update coming soon', 'info');
    } catch {
      addToast('Failed to update status', 'error');
    }
  }

  async function deleteScenario(id, name) {
    if (!confirm(`Delete scenario "${name}"?`)) return;
    try {
      await api.delete(`/api/staff-plans/scenarios/${id}`);
      addToast('Deleted', 'success');
      loadScenarios();
    } catch {
      addToast('Delete failed', 'error');
    }
  }

  return (
    <div>
      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Loading…</div>
      ) : scenarios.length === 0 ? (
        <div className="text-gray-400 text-sm py-8 text-center">No saved plans yet. Create one in the Plan Builder tab.</div>
      ) : (
        <div className="space-y-3">
          {scenarios.map(s => (
            <div key={s.id} className="border border-gray-200 rounded-lg p-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">{s.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    s.status === 'active' ? 'bg-green-100 text-green-700' :
                    s.status === 'archived' ? 'bg-gray-100 text-gray-500' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{s.status}</span>
                </div>
                {s.description && <p className="text-sm text-gray-500 mb-1">{s.description}</p>}
                <p className="text-xs text-gray-400">
                  {s.plan_start_date} – {s.plan_end_date}
                  {' · '}
                  {s.row_count} rows
                  {' · Created by '}
                  {s.created_by_name || s.created_by}
                  {' · '}
                  {fmtDateTime(s.created_at)}
                </p>
              </div>
              <div className="flex gap-2 shrink-0 ml-4">
                <button onClick={() => deleteScenario(s.id, s.name)} className="text-xs text-red-500 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
      />
    </div>
  );
}

function ChevronIcon({ expanded }) {
  return (
    <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function fmtDollar(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
}

function fmtDateTime(s) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function popUrgency(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  const end = new Date(dateStr);
  const days = (end - today) / (1000 * 60 * 60 * 24);
  if (days < 90) return 'red';
  if (days < 180) return 'yellow';
  return null;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// Parse CSV text to array of objects (assumes header row)
function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
}
