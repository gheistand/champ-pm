import { useState, useEffect, useRef } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import * as XLSX from 'xlsx';
import { HelpButton } from '../../components/HelpButton';
import { TOOL_HELP } from '../../help/toolHelp';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ReferenceLine } from 'recharts';

const TABS = ['Grant Balances', 'Appointments', 'Plan Builder', 'Saved Plans', 'Visualizations'];

const STAFF_NAME_MAP = {
  carnold3: 'Camden Arnold',
  arpitab2: 'Arpita Banerjee',
  gbuckley: 'Greta Buckley',
  byard: 'Gregory Byard',
  bchaille: 'Brian Chaille',
  dianad: 'Diana Davisson',
  mlfuller: 'Michelle Fuller',
  hanstad: 'Christopher Hanstad',
  heistand: 'Glenn Heistand',
  nazmul: 'Nazmul Huda',
  mrjeffer: 'Matthew Jefferson',
  asjobe: 'Addison Jobe',
  tannerj: 'Tanner Jones',
  lkumar: 'Love Kumar',
  marnilaw: 'Marni Law',
  clebeda: 'Caitlin Lebeda',
  makdah2: 'Lena Makdah',
  bmcvay: 'Brad McVay',
  rmeekma: 'Ryan Meekma',
  smilton: 'Sarah Milton',
  spantha: 'Samikshya Pantha',
  spaudel: 'Sabin Paudel',
  powell: 'James Powell',
  mjr: 'Mary Richardson',
  sangwan2: 'Nikhil Sangwan',
  fghiami: 'Fereshteh Ghiami Shomami',
  abthomas: 'Aaron Thomas',
  zaloudek: 'Zoe Zaloudek',
};

export default function StaffPlans() {
  const [tab, setTab] = useState(0);
  const [activeScenario, setActiveScenario] = useState(null);
  const [rows, setRows] = useState([]);

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">Staff Plans</h1>
          <HelpButton {...TOOL_HELP.staffPlans} />
        </div>
        <p className="text-sm text-gray-500 mt-1">Optimize staff allocations across FEMA grants</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1 flex-wrap">
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
      {tab === 2 && <PlanBuilderTab activeScenario={activeScenario} setActiveScenario={setActiveScenario} rows={rows} setRows={setRows} />}
      {tab === 3 && <SavedPlansTab />}
      {tab === 4 && <VisualizationsTab activeScenario={activeScenario} rows={rows} />}
    </div>
  );
}

// ─── Grant Balances Tab ──────────────────────────────────────────────────────

const SORT_FIELDS = ['full_account_string', 'pop_end_date', 'current_balance', 'is_manual_override'];

function GrantBalancesTab() {
  const api = useApi();
  const { addToast } = useToast();
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingAccount, setSyncingAccount] = useState(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null); // full_account_string being inline-edited
  const [editForm, setEditForm] = useState({});
  const [savingAccount, setSavingAccount] = useState(null);
  const [sortField, setSortField] = useState('priority_rank');
  const [sortDir, setSortDir] = useState('asc');
  const [manualForm, setManualForm] = useState(EMPTY_MANUAL);
  const [savingManual, setSavingManual] = useState(false);
  const [savingPriority, setSavingPriority] = useState(null);
  const [savingPin, setSavingPin] = useState(null);

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

  function toggleSort(field) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function sortedBalances() {
    return [...balances].sort((a, b) => {
      let av = a[sortField];
      let bv = b[sortField];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  async function syncAll() {
    setSyncingAll(true);
    try {
      const data = await api.post('/api/staff-plans/balances/sync', { all: true });
      addToast(`Synced ${data.synced} grants from Runway`, 'success');
      loadBalances();
    } catch {
      addToast('Sync failed', 'error');
    } finally {
      setSyncingAll(false);
    }
  }

  async function syncAccount(full_account_string) {
    setSyncingAccount(full_account_string);
    try {
      await api.post('/api/staff-plans/balances/sync', { full_account_string });
      addToast('Synced from Runway', 'success');
      loadBalances();
    } catch {
      addToast('Sync failed', 'error');
    } finally {
      setSyncingAccount(null);
    }
  }

  function startEdit(b) {
    setEditingAccount(b.full_account_string);
    setEditForm({
      remaining_balance: b.current_balance ?? '',
      pop_end_date: b.pop_end_date ?? '',
      notes: b.notes ?? '',
    });
  }

  function cancelEdit() {
    setEditingAccount(null);
    setEditForm({});
  }

  async function saveEdit(b) {
    setSavingAccount(b.full_account_string);
    try {
      await api.post('/api/staff-plans/balances', {
        full_account_string: b.full_account_string,
        remaining_balance: parseFloat(editForm.remaining_balance),
        pop_end_date: editForm.pop_end_date,
        notes: editForm.notes,
        grant_name: b.grant_name,
      });
      addToast('Balance saved', 'success');
      setEditingAccount(null);
      loadBalances();
    } catch {
      addToast('Save failed', 'error');
    } finally {
      setSavingAccount(null);
    }
  }

  async function handleDelete(b) {
    if (!b.id) return;
    if (!confirm(`Delete balance record for ${b.full_account_string}?`)) return;
    try {
      await api.delete(`/api/staff-plans/balances/${b.id}`);
      addToast('Deleted', 'success');
      loadBalances();
    } catch {
      addToast('Delete failed', 'error');
    }
  }

  async function saveManual() {
    if (!manualForm.full_account_string || manualForm.remaining_balance === '' || !manualForm.pop_end_date) {
      addToast('Account string, balance, and POP end date are required', 'error');
      return;
    }
    setSavingManual(true);
    try {
      await api.post('/api/staff-plans/balances', {
        full_account_string: manualForm.full_account_string,
        remaining_balance: parseFloat(manualForm.remaining_balance),
        pop_end_date: manualForm.pop_end_date,
        notes: manualForm.notes,
        grant_name: manualForm.grant_name,
      });
      addToast('Manual grant added', 'success');
      setShowManualModal(false);
      setManualForm(EMPTY_MANUAL);
      loadBalances();
    } catch {
      addToast('Save failed', 'error');
    } finally {
      setSavingManual(false);
    }
  }

  async function savePriority(full_account_string, priority_rank) {
    setSavingPriority(full_account_string);
    try {
      await api.post('/api/staff-plans/balances/priority', {
        updates: [{ full_account_string, priority_rank: priority_rank === '' ? 99 : parseInt(priority_rank, 10) }],
      });
      setBalances(prev => prev.map(b =>
        b.full_account_string === full_account_string
          ? { ...b, priority_rank: priority_rank === '' ? 99 : parseInt(priority_rank, 10) }
          : b
      ));
    } catch {
      addToast('Failed to save priority', 'error');
    } finally {
      setSavingPriority(null);
    }
  }

  async function togglePin(b) {
    setSavingPin(b.full_account_string);
    const newPinned = b.is_pinned ? 0 : 1;
    try {
      await api.post('/api/staff-plans/balances/priority', {
        updates: [{ full_account_string: b.full_account_string, is_pinned: newPinned }],
      });
      setBalances(prev => prev.map(x =>
        x.full_account_string === b.full_account_string ? { ...x, is_pinned: newPinned } : x
      ));
    } catch {
      addToast('Failed to update pin', 'error');
    } finally {
      setSavingPin(null);
    }
  }

  const totalBalance = balances.reduce((s, b) => s + (b.current_balance || 0), 0);
  const sorted = sortedBalances();

  function SortTh({ field, label, className = '' }) {
    const active = sortField === field;
    return (
      <th
        className={`px-3 py-2 cursor-pointer select-none hover:text-gray-700 ${active ? 'text-brand-600' : ''} ${className}`}
        onClick={() => toggleSort(field)}
      >
        {label}
        {active && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </th>
    );
  }

  return (
    <div>
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
        Set <strong>priority</strong> to control optimizer order (lower number = higher priority). <strong>Pinned</strong> grants keep their original appointment percentages unchanged during recalculate.
      </div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <span className="text-sm text-gray-500">Total current balance: </span>
          <span className="font-semibold text-gray-900">{fmtDollar(totalBalance)}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={syncAll}
            disabled={syncingAll}
            className="btn-secondary text-xs"
            title="Sync all Runway grants to latest balances (clears manual overrides for those funds)"
          >
            {syncingAll ? 'Syncing…' : '↺ Sync All from Runway'}
          </button>
          <button onClick={() => setShowManualModal(true)} className="btn-primary text-xs">
            + Add Manual Grant
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Loading…</div>
      ) : sorted.length === 0 ? (
        <div className="text-gray-400 text-sm py-8 text-center">
          No balances found. Click "Sync All from Runway" to pull grant data, or add a manual grant.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <SortTh field="full_account_string" label="Account" />
                <th className="px-3 py-2">Grant Name</th>
                <SortTh field="pop_end_date" label="POP End Date" />
                <th className="px-3 py-2 text-right">Runway Balance</th>
                <SortTh field="current_balance" label="Current Balance" className="text-right" />
                <th className="px-3 py-2">As Of</th>
                <SortTh field="is_manual_override" label="Override?" />
                <SortTh field="priority_rank" label="Priority" />
                <th className="px-3 py-2">Pin</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map(b => {
                const urgency = popUrgency(b.pop_end_date);
                const accountKey = b.full_account_string;
                const isEditing = editingAccount === accountKey;
                const isSaving = savingAccount === accountKey;
                const isSyncing = syncingAccount === accountKey;

                return (
                  <tr key={accountKey} className={`hover:bg-gray-50 ${b.is_manual_override ? 'bg-amber-50' : ''}`}>
                    {/* Account */}
                    <td className="px-3 py-2 font-mono font-medium text-gray-900 whitespace-nowrap">
                      <div>{b.full_account_string}</div>
                      {b.fund_number && <div className="text-xs text-gray-400">Fund {b.fund_number}</div>}
                    </td>

                    {/* Grant Name */}
                    <td className="px-3 py-2 text-gray-700 max-w-[180px] truncate" title={b.grant_name}>
                      {b.grant_name || <span className="text-gray-400">—</span>}
                    </td>

                    {/* POP End Date */}
                    <td className={`px-3 py-2 font-medium whitespace-nowrap ${
                      urgency === 'red' ? 'text-red-600' :
                      urgency === 'yellow' ? 'text-amber-600' :
                      'text-gray-700'
                    }`}>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editForm.pop_end_date}
                          onChange={e => setEditForm(f => ({ ...f, pop_end_date: e.target.value }))}
                          className="border border-gray-300 rounded px-1 py-0.5 text-xs w-32"
                        />
                      ) : (b.pop_end_date || '—')}
                    </td>

                    {/* Runway Balance */}
                    <td className="px-3 py-2 text-right">
                      {b.in_runway ? (
                        b.is_manual_override ? (
                          <span className="line-through text-gray-400">{fmtDollar(b.runway_balance)}</span>
                        ) : (
                          <span className="text-gray-700">{fmtDollar(b.runway_balance)}</span>
                        )
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Current Balance */}
                    <td className={`px-3 py-2 text-right font-medium ${b.is_manual_override ? 'text-amber-700' : 'text-gray-900'}`}>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.remaining_balance}
                          onChange={e => setEditForm(f => ({ ...f, remaining_balance: e.target.value }))}
                          className="border border-brand-400 rounded px-1 py-0.5 text-xs w-28 text-right focus:outline-none focus:ring-1 focus:ring-brand-500"
                          autoFocus
                        />
                      ) : fmtDollar(b.current_balance)}
                    </td>

                    {/* As Of */}
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap text-xs">
                      {b.runway_as_of_date || '—'}
                    </td>

                    {/* Override badge */}
                    <td className="px-3 py-2">
                      {!b.in_runway ? (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">Manual Only</span>
                      ) : b.is_manual_override ? (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Override</span>
                      ) : null}
                    </td>

                    {/* Priority */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="1"
                        max="99"
                        defaultValue={b.priority_rank === 99 ? '' : b.priority_rank}
                        placeholder="—"
                        className="w-14 text-center border border-gray-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                        title="Priority rank (1 = highest, blank = unranked)"
                        onBlur={e => {
                          const val = e.target.value;
                          const cur = b.priority_rank === 99 ? '' : String(b.priority_rank);
                          if (val !== cur) savePriority(b.full_account_string, val);
                        }}
                        disabled={savingPriority === b.full_account_string}
                      />
                      {b.priority_rank < 99 && (
                        <span className={`ml-1 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                          b.priority_rank <= 3 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {b.priority_rank}
                        </span>
                      )}
                    </td>

                    {/* Pin toggle */}
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => togglePin(b)}
                        disabled={savingPin === b.full_account_string}
                        title={b.is_pinned ? 'Pinned — optimizer will not change this grant. Click to unpin.' : 'Click to pin (lock allocations)'}
                        className={`text-base transition-opacity ${savingPin === b.full_account_string ? 'opacity-40' : 'hover:opacity-70'}`}
                      >
                        {b.is_pinned ? '📌' : <span className="text-gray-300 text-base">📌</span>}
                      </button>
                    </td>

                    {/* Notes */}
                    <td className="px-3 py-2 text-gray-500 max-w-[160px] truncate">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.notes}
                          onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                          placeholder="Notes"
                          className="border border-gray-300 rounded px-1 py-0.5 text-xs w-full"
                        />
                      ) : (b.notes || '')}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => saveEdit(b)}
                            disabled={isSaving}
                            className="text-xs text-green-600 font-medium hover:underline"
                          >
                            {isSaving ? '…' : 'Save'}
                          </button>
                          <button onClick={cancelEdit} className="text-xs text-gray-400 hover:underline">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={() => startEdit(b)}
                            className="text-xs text-brand-600 hover:underline"
                            title="Edit balance"
                          >
                            Edit
                          </button>
                          {b.in_runway && (
                            <button
                              onClick={() => syncAccount(b.full_account_string)}
                              disabled={isSyncing}
                              className="text-xs text-gray-500 hover:text-brand-600 hover:underline"
                              title={b.runway_balance != null
                                ? `Reset to Runway balance (${fmtDollar(b.runway_balance)} as of ${b.runway_as_of_date || 'unknown'})`
                                : 'Sync from Runway'}
                            >
                              {isSyncing ? (
                                <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-brand-500 rounded-full animate-spin" />
                              ) : '↺'}
                            </button>
                          )}
                          {b.id && (
                            <button
                              onClick={() => handleDelete(b)}
                              className="text-xs text-red-500 hover:underline"
                            >
                              Del
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showManualModal && (
        <Modal title="Add Manual Grant" onClose={() => { setShowManualModal(false); setManualForm(EMPTY_MANUAL); }}>
          <div className="space-y-3">
            <Field label="Full Account String *" value={manualForm.full_account_string} onChange={v => setManualForm(f => ({ ...f, full_account_string: v }))} />
            <Field label="Grant Name" value={manualForm.grant_name} onChange={v => setManualForm(f => ({ ...f, grant_name: v }))} />
            <Field label="Current Balance ($) *" type="number" value={manualForm.remaining_balance} onChange={v => setManualForm(f => ({ ...f, remaining_balance: v }))} />
            <Field label="POP End Date *" type="date" value={manualForm.pop_end_date} onChange={v => setManualForm(f => ({ ...f, pop_end_date: v }))} />
            <Field label="Notes" value={manualForm.notes} onChange={v => setManualForm(f => ({ ...f, notes: v }))} />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setShowManualModal(false); setManualForm(EMPTY_MANUAL); }} className="btn-secondary">Cancel</button>
              <button onClick={saveManual} disabled={savingManual} className="btn-primary">{savingManual ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const EMPTY_MANUAL = {
  full_account_string: '', grant_name: '',
  remaining_balance: '', pop_end_date: '', notes: '',
};

// ─── Appointments Tab ────────────────────────────────────────────────────────

function AppointmentsTab() {
  const api = useApi();
  const { addToast } = useToast();
  const fileRef = useRef(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [nameFilter, setNameFilter] = useState('');
  const [preview, setPreview] = useState(null);
  const [collapsed, setCollapsed] = useState({});

  useEffect(() => { loadAppointments(); }, []);

  async function loadAppointments() {
    setLoading(true);
    try {
      const data = await api.get('/api/staff-plans/appointments');
      setAppointments(data.appointments || []);
    } catch {
      addToast('Failed to load appointments', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Group appointments by staff name
  const grouped = {};
  for (const a of appointments) {
    const key = a.user_name || a.user_id || 'Unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  }
  const staffNames = Object.keys(grouped).sort();
  const filteredNames = nameFilter.trim()
    ? staffNames.filter(n => n.toLowerCase().includes(nameFilter.toLowerCase()))
    : staffNames;

  function toggleSection(name) {
    setCollapsed(c => ({ ...c, [name]: !c[name] }));
  }
  function collapseAll() {
    const c = {};
    staffNames.forEach(n => { c[n] = true; });
    setCollapsed(c);
  }
  function expandAll() {
    setCollapsed({});
  }

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      const rows = [];
      // Standardized format: all 27 sheets use identical columns
      for (const sheetName of workbook.SheetNames) {
        if (sheetName === 'Summary') continue;
        const ws = workbook.Sheets[sheetName];
        const raw = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
        for (const r of raw) {
          const name = r.Employee_Name || sheetName;
          const startDate = r.Period_Start_Date || '';
          const endDate = r.Period_End_Date || '';
          const fund = String(r.Fund || '').trim();
          const pct = parseFloat(r.Allocation_Percent) || 0;
          const salary = parseFloat(r.Salary_Rate) || 0;
          if (!startDate || !endDate || !fund || !pct) continue;
          rows.push({
            Employee_Name: name,
            Employee_Type: r.Employee_Type || 'AP',
            Period_Start_Date: startDate,
            Period_End_Date: endDate,
            Chart: parseInt(r.Chart) || 1,
            Fund: fund,
            Org: r.Org || '',
            Program: r.Program || '',
            Activity: r.Activity || '',
            Allocation_Percent: pct,
            Salary_Rate: salary,
            Full_Account_String: r.Full_Account_String || '',
            Notes: r.Notes || '',
          });
        }
      }
      if (rows.length === 0) {
        addToast('No data found in spreadsheet', 'error');
      } else {
        setPreview(rows);
        addToast(`Parsed ${rows.length} rows from ${workbook.SheetNames.length - 1} staff sheets`, 'success');
      }
    } catch (err) {
      console.error('XLSX parse error:', err);
      addToast('Failed to parse Excel file: ' + err.message, 'error');
    }
    e.target.value = '';
  }

  async function clearAppointments() {
    if (!confirm('Clear ALL imported appointments? This only affects Staff Plans data — no other CHAMP-PM data will be changed.')) return;
    try {
      await api.del('/api/staff-plans/appointments');
      addToast('Appointments cleared', 'success');
      loadAppointments();
    } catch {
      addToast('Clear failed', 'error');
    }
  }

  async function confirmImport() {
    if (!preview) return;
    setImporting(true);
    try {
      const data = await api.post('/api/staff-plans/appointments/import', { rows: preview, replace: true });
      addToast(`Imported ${data.imported} rows${data.errors ? ` (${data.errors.length} errors)` : ''}`, data.errors ? 'warning' : 'success');
      if (data.errors) console.warn('Import errors:', data.errors);
      setPreview(null);
      setCollapsed({});
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
        <div className="flex gap-2 flex-wrap items-center">
          <input
            className="input-sm" placeholder="Search by staff name"
            value={nameFilter} onChange={e => setNameFilter(e.target.value)}
          />
          <button onClick={collapseAll} className="btn-secondary text-xs">Collapse All</button>
          <button onClick={expandAll} className="btn-secondary text-xs">Expand All</button>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
          <button onClick={() => fileRef.current?.click()} className="btn-primary">Import from Spreadsheet</button>
          <button onClick={clearAppointments} className="btn-danger text-sm ml-2">Clear All Appointments</button>
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
        <div className="space-y-3">
          {filteredNames.length === 0 && (
            <div className="text-gray-400 text-sm py-4 text-center">No staff match "{nameFilter}"</div>
          )}
          {filteredNames.map(name => {
            const rows = grouped[name];
            const isCollapsed = !!collapsed[name];
            const dates = rows.map(r => r.period_start).filter(Boolean).sort();
            const endDates = rows.map(r => r.period_end).filter(Boolean).sort();
            const earliest = dates[0] || '';
            const latest = endDates[endDates.length - 1] || '';
            return (
              <div key={name} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection(name)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left transition-colors"
                >
                  <span className="text-gray-400 text-xs w-3">{isCollapsed ? '▶' : '▼'}</span>
                  <span className="font-semibold text-gray-900 flex-1">{name}</span>
                  <span className="text-xs text-gray-500">{rows.length} {rows.length === 1 ? 'period' : 'periods'}</span>
                  {earliest && (
                    <span className="text-xs text-gray-400 ml-2">{earliest} – {latest}</span>
                  )}
                </button>
                {!isCollapsed && (() => {
                  // Group rows by period
                  const periodMap = {};
                  for (const a of rows) {
                    const key = `${a.period_start}__${a.period_end}`;
                    if (!periodMap[key]) periodMap[key] = { start: a.period_start, end: a.period_end, rows: [] };
                    periodMap[key].rows.push(a);
                  }
                  const periods = Object.values(periodMap).sort((a, b) => (a.start || '').localeCompare(b.start || ''));
                  const periodBgs = ['bg-white', 'bg-blue-50', 'bg-green-50'];
                  const headerBgs = ['bg-gray-100', 'bg-blue-100', 'bg-green-100'];
                  return (
                    <div>
                      {periods.map((p, pi) => {
                        const totalPct = p.rows.reduce((s, r) => s + (r.allocation_pct || 0), 0);
                        return (
                          <div key={pi}>
                            <div className={`px-4 py-2 flex items-center gap-4 border-t border-gray-200 ${headerBgs[pi % 3]}`}>
                              <span className="text-xs font-semibold text-gray-700">
                                Period {pi + 1}: {fmtDateShort(p.start)} – {fmtDateShort(p.end)}
                              </span>
                              <span className="text-xs text-gray-500">{p.rows.length} fund{p.rows.length !== 1 ? 's' : ''}</span>
                              <span className={`text-xs font-medium ml-auto ${totalPct === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                                Total: {totalPct}%
                              </span>
                            </div>
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className={`text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100 ${periodBgs[pi % 3]}`}>
                                  <th className="px-4 py-1.5 pl-8">Account String</th>
                                  <th className="px-3 py-1.5 text-right">Alloc %</th>
                                  <th className="px-3 py-1.5 text-right">Salary Rate</th>
                                  <th className="px-3 py-1.5">Notes</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {p.rows.map(a => (
                                  <tr key={a.id} className={`hover:opacity-90 ${periodBgs[pi % 3]}`}>
                                    <td className="px-4 py-2 pl-8 font-mono text-xs text-gray-700">{a.full_account_string || a.fund_number}</td>
                                    <td className="px-3 py-2 text-right font-semibold text-gray-800">{a.allocation_pct}%</td>
                                    <td className="px-3 py-2 text-right text-gray-600">{a.salary_rate ? fmtDollar(a.salary_rate) : '—'}</td>
                                    <td className="px-3 py-2 text-xs text-gray-500">{a.notes || ''}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            );
          })}
          <p className="text-xs text-gray-400 mt-2">{appointments.length} total records across {staffNames.length} staff</p>
        </div>
      )}
    </div>
  );
}

// ─── Plan Builder Tab ────────────────────────────────────────────────────────

function PlanBuilderTab({ activeScenario, setActiveScenario, rows, setRows }) {
  const api = useApi();
  const { addToast } = useToast();
  const [scenarios, setScenarios] = useState([]);
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

  async function exportExcel() {
    if (!activeScenario || !rows.length) return;
    try {
      const wb = XLSX.utils.book_new();
      const COLS = ['Employee_Name', 'Employee_Type', 'Period_Start_Date', 'Period_End_Date',
        'Chart', 'Fund', 'Org', 'Program', 'Activity', 'Allocation_Percent',
        'Salary_Rate', 'Full_Account_String', 'Notes'];

      // Group by user, sorted by display name
      const byUser = {};
      for (const r of rows) {
        if (!byUser[r.user_id]) byUser[r.user_id] = [];
        byUser[r.user_id].push(r);
      }
      const sortedUsers = Object.keys(byUser).sort((a, b) => {
        const na = STAFF_NAME_MAP[a] || byUser[a][0]?.user_name || a;
        const nb = STAFF_NAME_MAP[b] || byUser[b][0]?.user_name || b;
        return na.localeCompare(nb);
      });

      const summaryRows = [];

      for (const userId of sortedUsers) {
        const userRows = byUser[userId].slice().sort((a, b) =>
          (a.period_start || '').localeCompare(b.period_start || ''));
        const displayName = STAFF_NAME_MAP[userId] || userRows[0]?.user_name || userId;
        const sheetRows = [COLS];

        for (const r of userRows) {
          const parts = (r.full_account_string || '').split('-');
          const chart = parts[0] || '';
          const fund = r.fund_number || parts[1] || '';
          const org = parts[2] || '';
          const program = parts[3] || '';
          const activity = parts[4] || '';
          sheetRows.push([
            displayName,
            r.employee_type || 'AP',
            fmtDateShort(r.period_start),
            fmtDateShort(r.period_end),
            chart,
            fund,
            org,
            program,
            activity,
            r.allocation_pct,
            r.salary_rate || '',
            r.full_account_string || '',
            r.notes || '',
          ]);
          summaryRows.push({
            Employee_Name: displayName,
            Fund: fund,
            Period_Start_Date: fmtDateShort(r.period_start),
            Period_End_Date: fmtDateShort(r.period_end),
            Allocation_Percent: r.allocation_pct,
            Est_Cost: r.estimated_cost || '',
          });
        }

        const ws = XLSX.utils.aoa_to_sheet(sheetRows);
        // Trim sheet name to 31 chars (Excel limit)
        const sheetName = displayName.slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }

      // Summary sheet
      const summaryHeaders = ['Employee_Name', 'Fund', 'Period_Start_Date', 'Period_End_Date', 'Allocation_Percent', 'Est_Cost'];
      const summaryData = [summaryHeaders, ...summaryRows.map(r => summaryHeaders.map(h => r[h]))];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      const today = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `StaffPlan_${today}.xlsx`);
    } catch (err) {
      addToast('Excel export failed: ' + err.message, 'error');
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

  async function toggleRowPin(rowId, isPinned) {
    if (!activeScenario) return;
    try {
      const data = await api.put(`/api/staff-plans/scenarios/${activeScenario.id}/rows/${rowId}`, { is_pinned: isPinned ? 1 : 0 });
      setRows(prev => prev.map(r => r.id === rowId ? data.row : r));
    } catch {
      addToast('Failed to update pin', 'error');
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

  // Group rows by account (grant view)
  const byAccount = {};
  for (const r of rows) {
    const key = r.full_account_string || r.fund_number;
    if (!byAccount[key]) byAccount[key] = [];
    byAccount[key].push(r);
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
            <button onClick={exportExcel} className="btn-secondary text-xs">Download Excel</button>
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
            <StaffView byUser={byUser} expandedUsers={expandedUsers} onToggle={toggleUser} onUpdateRow={updateRow} onTogglePin={toggleRowPin} />
          ) : (
            <GrantView byAccount={byAccount} />
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

const PERIOD_ROW_BG = ['bg-white', 'bg-blue-50', 'bg-green-50'];
const PERIOD_HDR_BG = ['bg-gray-100', 'bg-blue-100', 'bg-green-100'];

function StaffView({ byUser, expandedUsers, onToggle, onUpdateRow, onTogglePin }) {
  return (
    <div className="space-y-2">
      {Object.entries(byUser).map(([userId, { name, rows }]) => {
        const expanded = expandedUsers.has(userId);
        const totalCost = rows.reduce((s, r) => s + (r.estimated_cost || 0), 0);
        const hasFlags = rows.some(r => r.flag);

        // Group rows by period (period_start + period_end), sorted by period_start
        const periodMap = {};
        for (const r of rows) {
          const key = `${r.period_start}__${r.period_end}`;
          if (!periodMap[key]) periodMap[key] = { start: r.period_start, end: r.period_end, rows: [] };
          periodMap[key].rows.push(r);
        }
        const periods = Object.values(periodMap).sort((a, b) =>
          (a.start || '').localeCompare(b.start || ''));

        return (
          <div key={userId} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
              onClick={() => onToggle(userId)}
            >
              <div className="flex items-center gap-2">
                {hasFlags && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Has flags" />}
                <span className="font-medium text-gray-900">{name}</span>
                <span className="text-xs text-gray-500">{periods.length} {periods.length === 1 ? 'period' : 'periods'}, {rows.length} allocations</span>
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
                      <th className="px-4 py-2 text-left">Fund</th>
                      <th className="px-4 py-2 text-right">Alloc %</th>
                      <th className="px-4 py-2 text-right">Est. Cost</th>
                      <th className="px-4 py-2 text-left">Flag</th>
                      <th className="px-4 py-2 text-center">Pin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map((period, pi) => {
                      const rowBg = PERIOD_ROW_BG[pi % PERIOD_ROW_BG.length];
                      const hdrBg = PERIOD_HDR_BG[pi % PERIOD_HDR_BG.length];
                      return (
                        <>
                          <tr key={`hdr-${period.start}`} className={`${hdrBg} border-t border-gray-200`}>
                            <td colSpan={5} className="px-4 py-1.5 font-semibold text-xs text-gray-700">
                              Period: {fmtPeriodLabel(period.start, period.end)}
                              <span className="ml-2 font-normal text-gray-500">({period.rows.length} {period.rows.length === 1 ? 'fund' : 'funds'})</span>
                            </td>
                          </tr>
                          {period.rows.map(r => (
                            <EditableRow key={r.id} row={r} onSave={onUpdateRow} onTogglePin={onTogglePin} bgClass={rowBg} />
                          ))}
                        </>
                      );
                    })}
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

function EditableRow({ row, onSave, onTogglePin, bgClass = 'bg-white' }) {
  const [editing, setEditing] = useState(false);
  const [pct, setPct] = useState(row.allocation_pct);
  const [saving, setSaving] = useState(false);
  const [togglingPin, setTogglingPin] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(row.id, parseFloat(pct));
    setSaving(false);
    setEditing(false);
  }

  async function handleTogglePin() {
    if (!onTogglePin) return;
    setTogglingPin(true);
    await onTogglePin(row.id, !row.is_pinned);
    setTogglingPin(false);
  }

  const isPinned = !!row.is_pinned;
  const rowClass = isPinned ? 'bg-amber-50' : row.flag ? 'bg-red-50' : row.is_override ? 'bg-yellow-50' : bgClass;

  return (
    <tr className={`hover:opacity-90 ${rowClass} border-t border-gray-100`}>
      <td className="px-4 py-2 font-mono text-gray-700 text-xs">
        {row.full_account_string || row.fund_number}
        {isPinned && <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1 py-0.5 rounded font-medium">Pinned</span>}
      </td>
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
            {row.is_override && !isPinned ? <span className="ml-1 text-yellow-500 text-xs">✎</span> : null}
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
      <td className="px-4 py-2 text-center">
        <button
          onClick={handleTogglePin}
          disabled={togglingPin}
          title={isPinned ? 'Pinned — will not change on recalculate. Click to unpin.' : 'Click to pin this allocation'}
          className={`text-base transition-opacity ${togglingPin ? 'opacity-40' : 'hover:opacity-70'}`}
        >
          {isPinned ? '📌' : <span className="text-gray-300">📌</span>}
        </button>
      </td>
    </tr>
  );
}

function GrantView({ byAccount }) {
  return (
    <div className="space-y-4">
      {Object.entries(byAccount).map(([account, rows]) => {
        const totalCost = rows.reduce((s, r) => s + (r.estimated_cost || 0), 0);
        const fundNumber = rows[0]?.fund_number;
        return (
          <div key={account} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 flex justify-between items-center">
              <div>
                <span className="font-mono font-medium text-gray-900">{account}</span>
                {fundNumber && <span className="ml-2 text-xs text-gray-400">Fund {fundNumber}</span>}
              </div>
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
      await api.del(`/api/staff-plans/scenarios/${id}`);
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

// ─── Visualizations Tab ──────────────────────────────────────────────────────

const GRANT_COLORS = ["#2563eb","#16a34a","#dc2626","#9333ea","#ea580c","#0891b2","#65a30d","#c2410c","#7c3aed","#0f766e"];
const BURN_MULTIPLIER = 1.451 * 1.317;
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtM(n) {
  const abs = Math.abs(n || 0);
  if (abs >= 1_000_000) return `$${((n || 0) / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round((n || 0) / 1_000)}k`;
  return `$${Math.round(n || 0)}`;
}

function VisualizationsTab({ activeScenario, rows }) {
  const api = useApi();
  const { addToast } = useToast();
  const [balances, setBalances] = useState([]);
  const [loadingBalances, setLoadingBalances] = useState(false);

  useEffect(() => {
    if (!activeScenario) return;
    loadVizBalances();
  }, [activeScenario?.id]);

  async function loadVizBalances() {
    setLoadingBalances(true);
    try {
      const data = await api.get('/api/staff-plans/balances');
      setBalances(data.balances || []);
    } catch {
      addToast('Failed to load balances', 'error');
    } finally {
      setLoadingBalances(false);
    }
  }

  if (!activeScenario) {
    return (
      <div className="text-gray-400 text-sm py-12 text-center">
        Select or create a plan in the Plan Builder tab to view visualizations.
      </div>
    );
  }

  if (loadingBalances) {
    return <div className="text-gray-400 text-sm py-8 text-center">Loading visualizations…</div>;
  }

  const balanceMap = {};
  for (const b of balances) balanceMap[b.full_account_string] = b;

  const uniqueAccounts = [...new Set(rows.map(r => r.full_account_string).filter(Boolean))];
  const colorMap = {};
  uniqueAccounts.forEach((acc, i) => { colorMap[acc] = GRANT_COLORS[i % GRANT_COLORS.length]; });

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Runway Status</h2>
        <p className="text-xs text-gray-500 mb-4">Projected spend vs. remaining balance for each grant in this scenario.</p>
        <RunwayCards rows={rows} balanceMap={balanceMap} colorMap={colorMap} />
      </section>
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Grant Burn-Down</h2>
        <p className="text-xs text-gray-500 mb-4">Projected remaining balance over time based on scenario allocations.</p>
        <BurnDownChart rows={rows} balanceMap={balanceMap} colorMap={colorMap} />
      </section>
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Staff Allocation Timeline</h2>
        <p className="text-xs text-gray-500 mb-4">Appointment periods by staff member, colored by grant.</p>
        <AllocationTimeline rows={rows} balanceMap={balanceMap} colorMap={colorMap} />
      </section>
    </div>
  );
}

function RunwayCards({ rows, balanceMap, colorMap }) {
  const byAccount = {};
  for (const r of rows) {
    if (!r.full_account_string) continue;
    if (!byAccount[r.full_account_string]) byAccount[r.full_account_string] = [];
    byAccount[r.full_account_string].push(r);
  }

  const cards = Object.entries(byAccount).map(([account, accountRows]) => {
    const balance = balanceMap[account];
    const projectedSpend = accountRows.reduce((s, r) => s + (r.estimated_cost || 0), 0);
    const remaining = balance?.current_balance;
    const hasBalance = remaining != null && remaining > 0;

    let status;
    if (!hasBalance) status = 'Unknown';
    else if (projectedSpend > remaining) status = 'Over Budget';
    else if (projectedSpend > remaining * 0.9) status = 'At Risk';
    else status = 'On Track';

    return { account, balance, projectedSpend, remaining, hasBalance, status };
  });

  const ORDER = { 'Over Budget': 0, 'At Risk': 1, 'On Track': 2, 'Unknown': 3 };
  cards.sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map(card => <RunwayCard key={card.account} card={card} />)}
    </div>
  );
}

function RunwayCard({ card }) {
  const { account, balance, projectedSpend, remaining, hasBalance, status } = card;
  const pop = balance?.pop_end_date;

  const popClass = pop ? (() => {
    const days = (new Date(pop + 'T12:00:00') - new Date()) / (1000 * 60 * 60 * 24);
    return days < 90 ? 'text-red-600' : days < 180 ? 'text-amber-600' : 'text-gray-600';
  })() : 'text-gray-400';

  const pct = hasBalance ? Math.min((projectedSpend / remaining) * 100, 150) : 0;
  const barColor = pct > 100 ? 'bg-red-500' : pct >= 90 ? 'bg-amber-500' : 'bg-green-500';
  const borderColor = status === 'Over Budget' ? 'border-red-200' : status === 'At Risk' ? 'border-amber-200' : status === 'On Track' ? 'border-green-200' : 'border-gray-200';
  const badgeClass = status === 'Over Budget' ? 'bg-red-100 text-red-700' : status === 'At Risk' ? 'bg-amber-100 text-amber-700' : status === 'On Track' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500';

  return (
    <div className={`border ${borderColor} rounded-xl p-4 space-y-2`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-gray-900 text-sm truncate">{balance?.grant_name || account}</div>
          <div className="font-mono text-xs text-gray-400 truncate">{account}</div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${badgeClass}`}>{status}</span>
      </div>
      <div>
        <span className="text-2xl font-bold text-gray-900">{hasBalance ? fmtM(remaining) : '—'}</span>
        <span className="text-xs text-gray-400 ml-1">remaining</span>
      </div>
      {pop && <div className={`text-xs font-medium ${popClass}`}>POP ends {pop}</div>}
      <div className="text-xs text-gray-600">Projected spend: <span className="font-medium">{fmtM(projectedSpend)}</span></div>
      {hasBalance ? (
        <>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <div className="text-xs text-gray-400">{Math.round(pct)}% of balance consumed</div>
        </>
      ) : (
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Balance Unknown</span>
      )}
    </div>
  );
}

function BurnDownChart({ rows, balanceMap, colorMap }) {
  const grants = Object.keys(colorMap).filter(acc => {
    const b = balanceMap[acc];
    return b && b.current_balance > 0;
  });

  if (!grants.length) {
    return <div className="text-gray-400 text-sm py-8 text-center">No grants with known balances to chart.</div>;
  }

  const today = new Date();
  today.setDate(1);
  today.setHours(0, 0, 0, 0);

  let maxDate = addMonths(today, 24);
  for (const acc of grants) {
    const pop = balanceMap[acc]?.pop_end_date;
    if (pop) {
      const d = new Date(pop + 'T12:00:00');
      if (d > maxDate) maxDate = d;
    }
  }

  const months = [];
  let cur = new Date(today);
  while (cur <= maxDate) {
    months.push(new Date(cur));
    cur = addMonths(cur, 1);
  }

  // Pre-compute running balances for each grant
  const runningBalances = {};
  for (const acc of grants) {
    let balance = balanceMap[acc].current_balance;
    const accRows = rows.filter(r => r.full_account_string === acc);
    runningBalances[acc] = [balance];
    for (let i = 0; i < months.length - 1; i++) {
      const m = months[i];
      const mEnd = addMonths(m, 1);
      const spend = accRows.reduce((sum, r) => {
        if (!r.period_start || !r.period_end || !r.salary_rate) return sum;
        const rs = new Date(r.period_start + 'T12:00:00');
        const re = new Date(r.period_end + 'T12:00:00');
        if (m <= re && mEnd > rs) {
          return sum + ((r.salary_rate * (r.allocation_pct / 100) * BURN_MULTIPLIER) / 12);
        }
        return sum;
      }, 0);
      balance = Math.max(balance - spend, 0);
      runningBalances[acc].push(balance);
    }
  }

  const data = months.map((m, i) => {
    const point = { month: `${MONTH_LABELS[m.getMonth()]} ${m.getFullYear()}` };
    for (const acc of grants) point[acc] = Math.round(runningBalances[acc][i]);
    return point;
  });

  const popMonthLabels = [...new Set(
    grants.map(acc => balanceMap[acc]?.pop_end_date).filter(Boolean).map(pop => {
      const d = new Date(pop + 'T12:00:00');
      return `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
    })
  )];

  const chartWidth = Math.max(700, months.length * 55);

  return (
    <div className="overflow-x-auto">
      <LineChart width={chartWidth} height={350} data={data} margin={{ top: 10, right: 30, left: 70, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} interval={Math.max(0, Math.floor(months.length / 14) - 1)} />
        <YAxis tickFormatter={v => fmtM(v)} tick={{ fontSize: 11 }} width={65} />
        <RechartsTooltip
          formatter={(value, name) => [fmtM(value), balanceMap[name]?.grant_name || name]}
          labelStyle={{ fontSize: 12 }}
          contentStyle={{ fontSize: 11, maxWidth: 300 }}
        />
        <Legend formatter={name => balanceMap[name]?.grant_name || name} wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1.5} />
        {popMonthLabels.map(label => (
          <ReferenceLine key={label} x={label} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1} />
        ))}
        {grants.map(acc => (
          <Line key={acc} type="monotone" dataKey={acc} stroke={colorMap[acc]} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </div>
  );
}

function AllocationTimeline({ rows, balanceMap, colorMap }) {
  const [highlighted, setHighlighted] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = addMonths(today, 24);

  const MONTH_WIDTH = 60;
  const TOTAL_MONTHS = 24;
  const totalWidth = TOTAL_MONTHS * MONTH_WIDTH;
  const ROW_HEIGHT = 32;
  const LEFT_WIDTH = 150;

  const monthTicks = [];
  for (let i = 0; i < TOTAL_MONTHS; i++) monthTicks.push(addMonths(today, i));

  const byStaff = {};
  for (const r of rows) {
    const key = r.user_id;
    const name = STAFF_NAME_MAP[key] || r.user_name || key;
    if (!byStaff[key]) byStaff[key] = { name, rows: [] };
    byStaff[key].rows.push(r);
  }
  const staffList = Object.entries(byStaff).sort((a, b) => a[1].name.localeCompare(b[1].name));

  const totalDays = TOTAL_MONTHS * 30.44;
  function dateToX(d) {
    return ((d - today) / (1000 * 60 * 60 * 24)) / totalDays * totalWidth;
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <div style={{ minWidth: LEFT_WIDTH + totalWidth }}>
          {/* Header */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <div style={{ width: LEFT_WIDTH, minWidth: LEFT_WIDTH }} className="px-3 py-2 text-xs font-medium text-gray-500 border-r border-gray-200 shrink-0">
              Staff Member
            </div>
            <div className="relative" style={{ width: totalWidth, height: 36 }}>
              {monthTicks.map((d, i) => (
                <div
                  key={i}
                  className="absolute text-xs text-gray-400 top-0 h-full flex items-center"
                  style={{ left: i * MONTH_WIDTH, width: MONTH_WIDTH, borderLeft: '1px solid #e5e7eb', paddingLeft: 4 }}
                >
                  {MONTH_LABELS[d.getMonth()]}{d.getFullYear() !== today.getFullYear() ? ` '${String(d.getFullYear()).slice(2)}` : ''}
                </div>
              ))}
            </div>
          </div>

          {/* Staff rows */}
          {staffList.map(([userId, { name, rows: staffRows }]) => (
            <div key={userId} className="flex border-b border-gray-100 hover:bg-gray-50/50">
              <div
                style={{ width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: ROW_HEIGHT }}
                className="px-3 flex items-center shrink-0 border-r border-gray-200 text-xs text-gray-700 truncate"
              >
                {name}
              </div>
              <div className="relative" style={{ width: totalWidth, height: ROW_HEIGHT }}>
                {monthTicks.map((_, i) => (
                  <div key={i} className="absolute top-0 h-full" style={{ left: i * MONTH_WIDTH, width: 1, backgroundColor: '#f3f4f6' }} />
                ))}
                {staffRows.map(r => {
                  if (!r.period_start || !r.period_end) return null;
                  const rs = new Date(r.period_start + 'T12:00:00');
                  const re = new Date(r.period_end + 'T12:00:00');
                  if (re < today || rs > endDate) return null;

                  const x = Math.max(0, dateToX(rs));
                  const xEnd = Math.min(totalWidth, dateToX(re));
                  const w = xEnd - x;
                  if (w < 2) return null;

                  const color = colorMap[r.full_account_string] || '#94a3b8';
                  const isHighlighted = highlighted === r.full_account_string;
                  const dimmed = highlighted && !isHighlighted;

                  return (
                    <div
                      key={r.id}
                      className="absolute rounded cursor-pointer flex items-center justify-center transition-opacity"
                      style={{
                        left: x,
                        width: w,
                        top: 5,
                        height: ROW_HEIGHT - 10,
                        backgroundColor: color,
                        opacity: dimmed ? 0.2 : 0.85,
                        outline: isHighlighted ? '2px solid rgba(0,0,0,0.35)' : 'none',
                      }}
                      onMouseEnter={e => {
                        setHighlighted(r.full_account_string);
                        setTooltip({ x: e.clientX, y: e.clientY, r });
                      }}
                      onMouseLeave={() => { setHighlighted(null); setTooltip(null); }}
                      onClick={() => setHighlighted(prev => prev === r.full_account_string ? null : r.full_account_string)}
                    >
                      {w > 30 && (
                        <span className="text-white font-medium truncate px-1" style={{ fontSize: 10 }}>
                          {r.allocation_pct}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50">
        {Object.entries(colorMap).map(([acc, color]) => (
          <button
            key={acc}
            className="flex items-center gap-1.5 text-xs hover:opacity-70"
            onClick={() => setHighlighted(prev => prev === acc ? null : acc)}
          >
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
            <span className={highlighted === acc ? 'font-semibold text-gray-900' : 'text-gray-600'}>
              {balanceMap[acc]?.grant_name || acc}
            </span>
          </button>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-xl"
          style={{ left: tooltip.x + 14, top: tooltip.y - 14 }}
        >
          <div className="font-medium">{balanceMap[tooltip.r.full_account_string]?.grant_name || tooltip.r.full_account_string}</div>
          <div className="text-gray-300 mt-0.5">{tooltip.r.period_start} – {tooltip.r.period_end}</div>
          <div className="text-gray-300">{tooltip.r.allocation_pct}% allocation</div>
          {tooltip.r.estimated_cost > 0 && <div className="text-gray-300">Est. {fmtDollar(tooltip.r.estimated_cost)}</div>}
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

function fmtDateShort(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}/${y.slice(2)}`;
}

function fmtPeriodLabel(start, end) {
  if (!start) return '';
  const s = new Date(start + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const e = end
    ? new Date(end + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';
  return e ? `${s} – ${e}` : s;
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
