import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { HelpButton } from '../../components/HelpButton';
import { TOOL_HELP } from '../../help/toolHelp';

// Monday of the week containing a given date string
function weekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(monday.getUTCDate() + diff);
  return monday.toISOString().split('T')[0];
}

function parseDate(s) {
  if (!s) return null;
  const t = s.trim();
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const [, mo, da, yr] = m;
  const year = yr.length === 2 ? (parseInt(yr) > 50 ? '19' + yr : '20' + yr) : yr;
  return `${year}-${mo.padStart(2, '0')}-${da.padStart(2, '0')}`;
}

// "Last, First" → "First Last" for auto-matching
function csvNameToDisplay(csvName) {
  const comma = csvName.indexOf(',');
  if (comma === -1) return csvName.trim();
  const last = csvName.slice(0, comma).trim();
  const first = csvName.slice(comma + 1).trim();
  return `${first} ${last}`;
}

// Parse the rptDetailedActivity CSV format (cp1252, date sentinel rows)
function parseCsv(text) {
  const lines = text.split(/\r?\n/);
  const rows = [];
  let currentDate = null;

  // Skip header rows (first 3 lines)
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV split (handles quoted fields)
    const cols = [];
    let cur = '', inQuote = false;
    for (let ci = 0; ci < line.length; ci++) {
      const ch = line[ci];
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { cols.push(cur); cur = ''; continue; }
      cur += ch;
    }
    cols.push(cur);

    // Date sentinel row: col0 has date, col1 empty
    if (cols[0]?.trim() && !cols[1]?.trim()) {
      const d = parseDate(cols[0].trim());
      if (d) { currentDate = d; continue; }
    }

    // Data row
    if (!cols[1]?.trim() || !currentDate) continue;

    const employee = cols[1]?.trim();
    const projectName = cols[4]?.trim();
    const activity = cols[5]?.trim();
    const nonBillable = parseFloat(cols[6]) || 0;
    const billable = parseFloat(cols[7]) || 0;
    const hours = nonBillable + billable;

    if (!employee || !projectName || hours <= 0) continue;
    rows.push({ date: currentDate, employee, projectName, activity, hours });
  }
  return rows;
}

// Aggregate same (user, task, date) entries — UNIQUE constraint
function aggregate(rows, projMap, staffMap) {
  const agg = new Map();
  const weeks = new Set();
  const unmappedProjects = new Set();
  const unmappedStaff = new Set();

  for (const r of rows) {
    const taskId = projMap[r.projectName];
    if (taskId === undefined) { unmappedProjects.add(r.projectName); continue; }
    if (taskId === null) continue; // explicitly skipped

    const userId = staffMap[r.employee];
    if (!userId) { unmappedStaff.add(r.employee); continue; }

    const key = `${userId}|${taskId}|${r.date}`;
    if (!agg.has(key)) {
      agg.set(key, { user_id: userId, task_id: taskId, entry_date: r.date, hours: 0, notes: [] });
    }
    const e = agg.get(key);
    e.hours += r.hours;
    if (r.activity) e.notes.push(r.activity);
    weeks.add(`${userId}|${weekStart(r.date)}`);
  }

  const entries = Array.from(agg.values()).map(e => ({
    ...e,
    hours: Math.round(e.hours * 10000) / 10000,
    notes: e.notes.length ? [...new Set(e.notes)].join('; ') : null,
  }));

  const weekList = Array.from(weeks).map(w => {
    const [user_id, week_start] = w.split('|');
    return { user_id, week_start };
  });

  return { entries, weeks: weekList, unmappedProjects: [...unmappedProjects], unmappedStaff: [...unmappedStaff] };
}

const BATCH_SIZE = 400;

export default function Import() {
  const api = useApi();
  const { getToken } = useAuth();
  const { addToast } = useToast();
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [preview, setPreview] = useState(null); // { entries, weeks, unmappedProjects, unmappedStaff, totalRows }
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total, inserted, skipped }

  const processFile = useCallback(async (file) => {
    if (!file) return;
    setFileName(file.name);
    setPreview(null);
    setProgress(null);
    setLoading(true);

    try {
      // Read file — try windows-1252 first (the export encoding)
      const buf = await file.arrayBuffer();
      let text;
      try { text = new TextDecoder('windows-1252').decode(buf); }
      catch { text = new TextDecoder('utf-8').decode(buf); }

      const rawRows = parseCsv(text);

      // Fetch mapping config
      const config = await api.get('/api/import/config');

      // Build project map: csv_name → task_id
      const projMap = {};
      for (const m of config.project_map) projMap[m.csv_name] = m.task_id;

      // Build staff map: csv_name → user_id
      // 1. Explicit overrides from DB
      const staffMap = {};
      for (const m of config.staff_overrides) staffMap[m.csv_name] = m.user_id;

      // 2. Auto-match remaining: "Last, First" → "First Last" search in users
      const usersByName = {};
      for (const u of config.users) usersByName[u.name.toLowerCase()] = u.id;

      for (const row of rawRows) {
        if (staffMap[row.employee]) continue;
        const display = csvNameToDisplay(row.employee).toLowerCase();
        if (usersByName[display]) staffMap[row.employee] = usersByName[display];
      }

      const { entries, weeks, unmappedProjects, unmappedStaff } = aggregate(rawRows, projMap, staffMap);

      setPreview({
        entries,
        weeks,
        unmappedProjects,
        unmappedStaff,
        totalRows: rawRows.length,
        totalHours: rawRows.reduce((s, r) => s + r.hours, 0),
      });
    } catch (err) {
      addToast(err.message || 'Failed to parse file', 'error');
    } finally {
      setLoading(false);
    }
  }, [api]);

  async function runImport() {
    if (!preview) return;
    setImporting(true);
    setProgress({ done: 0, total: preview.entries.length, inserted: 0, skipped: 0 });

    let totalInserted = 0, totalSkipped = 0;

    try {
      const token = await getToken();

      // Send weeks first in one call
      if (preview.weeks.length > 0) {
        await fetch('/api/import/batch', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries: [], weeks: preview.weeks }),
        });
      }

      // Send entries in batches
      for (let i = 0; i < preview.entries.length; i += BATCH_SIZE) {
        const chunk = preview.entries.slice(i, i + BATCH_SIZE);
        const res = await fetch('/api/import/batch', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries: chunk, weeks: [] }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Batch failed');
        totalInserted += data.inserted || 0;
        totalSkipped += data.skipped || 0;
        setProgress({ done: Math.min(i + BATCH_SIZE, preview.entries.length), total: preview.entries.length, inserted: totalInserted, skipped: totalSkipped });
      }

      addToast(`Import complete: ${totalInserted} new entries, ${totalSkipped} already existed`);
      setPreview(null);
      setFileName(null);
    } catch (err) {
      addToast(err.message || 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2">
          <h1 className="page-title">Import Timesheets</h1>
          <HelpButton {...TOOL_HELP.import} />
        </div>
      </div>

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        Export <strong>rptDetailedActivity</strong> from your timesheet app, then drop it here.
        Entries that already exist are skipped automatically — safe to re-import overlapping periods.
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors mb-6
          ${dragging ? 'border-brand-400 bg-brand-50' : 'border-gray-300 hover:border-brand-300 hover:bg-gray-50'}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept=".csv" className="hidden"
          onChange={e => e.target.files[0] && processFile(e.target.files[0])} />
        <div className="text-4xl mb-3">📂</div>
        {fileName
          ? <p className="text-sm font-medium text-gray-700">{fileName}</p>
          : <p className="text-sm text-gray-500">Drop <strong>rptDetailedActivity.csv</strong> here, or click to browse</p>
        }
      </div>

      {/* Loading */}
      {loading && (
        <div className="card text-center py-8 text-gray-500 text-sm">
          Parsing file and loading mapping config…
        </div>
      )}

      {/* Preview */}
      {preview && !importing && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card">
              <div className="text-xs text-gray-500 mb-1">CSV Rows</div>
              <div className="text-2xl font-bold">{preview.totalRows.toLocaleString()}</div>
            </div>
            <div className="card">
              <div className="text-xs text-gray-500 mb-1">Total Hours</div>
              <div className="text-2xl font-bold">{preview.totalHours.toLocaleString('en-US', { maximumFractionDigits: 1 })}h</div>
            </div>
            <div className="card">
              <div className="text-xs text-gray-500 mb-1">Entries to Import</div>
              <div className="text-2xl font-bold text-green-600">{preview.entries.length.toLocaleString()}</div>
              <div className="text-xs text-gray-400">(aggregated by day)</div>
            </div>
            <div className="card">
              <div className="text-xs text-gray-500 mb-1">Unmapped</div>
              <div className={`text-2xl font-bold ${preview.unmappedProjects.length + preview.unmappedStaff.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                {preview.unmappedProjects.length + preview.unmappedStaff.length}
              </div>
            </div>
          </div>

          {/* Unmapped warnings */}
          {preview.unmappedProjects.length > 0 && (
            <div className="card border-amber-200 bg-amber-50">
              <h3 className="text-sm font-semibold text-amber-800 mb-2">
                {preview.unmappedProjects.length} unmapped project{preview.unmappedProjects.length !== 1 ? 's' : ''} — hours skipped
              </h3>
              <p className="text-xs text-amber-700 mb-2">
                These CSV project names have no mapping in the database. Add them via the mapping table to include them in future imports.
              </p>
              <div className="flex flex-wrap gap-1">
                {preview.unmappedProjects.map(p => (
                  <span key={p} className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-mono">{p}</span>
                ))}
              </div>
            </div>
          )}

          {preview.unmappedStaff.length > 0 && (
            <div className="card border-amber-200 bg-amber-50">
              <h3 className="text-sm font-semibold text-amber-800 mb-2">
                {preview.unmappedStaff.length} unmapped staff member{preview.unmappedStaff.length !== 1 ? 's' : ''} — hours skipped
              </h3>
              <div className="flex flex-wrap gap-1">
                {preview.unmappedStaff.map(s => (
                  <span key={s} className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-mono">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Import button */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {preview.entries.length.toLocaleString()} entries will be inserted (duplicates automatically skipped).
            </p>
            <button className="btn-primary" onClick={runImport} disabled={preview.entries.length === 0}>
              Import {preview.entries.length.toLocaleString()} Entries
            </button>
          </div>
        </div>
      )}

      {/* Progress */}
      {importing && progress && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Importing…</h3>
          <div className="h-3 bg-gray-200 rounded-full mb-3">
            <div
              className="h-3 bg-brand-500 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{progress.done.toLocaleString()} / {progress.total.toLocaleString()} entries</span>
            <span>{pct}%</span>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            {progress.inserted.toLocaleString()} new · {progress.skipped.toLocaleString()} already existed
          </div>
        </div>
      )}
    </div>
  );
}
