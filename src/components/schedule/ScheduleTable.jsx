import { useState } from 'react';
import { formatDisplayDate } from '../../utils/dateUtils';

function diffDays(start, end) {
  const a = new Date(start + 'T00:00:00Z');
  const b = new Date(end + 'T00:00:00Z');
  return Math.round((b - a) / 86400000);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function InlineDate({ value, onChange, min, max, readOnly }) {
  if (readOnly) return <span>{value ? formatDisplayDate(value) : '—'}</span>;
  return (
    <input
      type="date"
      value={value || ''}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value)}
      className="form-input py-0.5 px-1 text-xs w-32"
    />
  );
}

function InlineNumber({ value, onChange, readOnly }) {
  if (readOnly) return <span>{value ?? '—'}</span>;
  return (
    <input
      type="number"
      value={value ?? ''}
      min={0}
      onChange={(e) => onChange(Number(e.target.value))}
      className="form-input py-0.5 px-1 text-xs w-20"
    />
  );
}

function PhaseRow({ phase, popDate, readOnly, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    start_date: phase.start_date,
    end_date: phase.end_date,
    duration_days: phase.duration_days ?? diffDays(phase.start_date, phase.end_date),
    notes: phase.notes || '',
  });
  const [error, setError] = useState('');

  function handleStartChange(val) {
    const dur = form.duration_days || 0;
    setForm(f => ({
      ...f,
      start_date: val,
      end_date: addDays(val, dur),
    }));
    setError('');
  }

  function handleEndChange(val) {
    if (popDate && val > popDate) {
      setError(`End date exceeds Grant PoP (${formatDisplayDate(popDate)})`);
      return;
    }
    setError('');
    const dur = diffDays(form.start_date, val);
    setForm(f => ({ ...f, end_date: val, duration_days: Math.max(0, dur) }));
  }

  function handleDurationChange(val) {
    const newEnd = addDays(form.start_date, val);
    if (popDate && newEnd > popDate) {
      setError(`Calculated end date exceeds Grant PoP (${formatDisplayDate(popDate)})`);
      return;
    }
    setError('');
    setForm(f => ({ ...f, duration_days: val, end_date: newEnd }));
  }

  function handleSave() {
    if (error) return;
    onSave(phase.id, form);
    setEditing(false);
  }

  const effectiveStart = phase.override?.start_date ?? phase.start_date;
  const effectiveEnd = phase.override?.end_date ?? phase.end_date;
  const effectiveDur = phase.override?.duration_days ?? (phase.duration_days ?? diffDays(phase.start_date, phase.end_date));
  const isPastPoP = popDate && effectiveEnd > popDate;

  if (editing) {
    return (
      <tr className="bg-brand-50">
        <td className="font-medium">{phase.label}</td>
        <td><InlineDate value={form.start_date} onChange={handleStartChange} max={form.end_date} /></td>
        <td><InlineNumber value={form.duration_days} onChange={handleDurationChange} /></td>
        <td><InlineDate value={form.end_date} onChange={handleEndChange} min={form.start_date} max={popDate} /></td>
        <td>
          {error
            ? <span className="text-red-600 text-xs">{error}</span>
            : isPastPoP ? <span className="text-orange-600 text-xs font-medium">Past PoP ⚠</span>
            : <span className="text-green-600 text-xs">OK</span>}
        </td>
        <td><input className="form-input py-0.5 px-1 text-xs w-40" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></td>
        <td>
          <div className="flex gap-1">
            <button className="btn-primary btn-sm" onClick={handleSave} disabled={!!error}>Save</button>
            <button className="btn-secondary btn-sm" onClick={() => { setEditing(false); setError(''); }}>Cancel</button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={isPastPoP ? 'bg-orange-50' : ''}>
      <td className="font-medium">
        {phase.label}
        {phase.override && <span className="ml-1 text-xs text-purple-600 italic">(what-if)</span>}
      </td>
      <td>{formatDisplayDate(effectiveStart)}</td>
      <td>{effectiveDur}</td>
      <td className={isPastPoP ? 'text-orange-700 font-medium' : ''}>{formatDisplayDate(effectiveEnd)}</td>
      <td>{isPastPoP ? <span className="text-orange-600 text-xs font-medium">Past PoP ⚠</span> : <span className="text-green-600 text-xs">OK</span>}</td>
      <td className="text-gray-500 text-xs">{phase.notes || '—'}</td>
      <td>
        {!readOnly && (
          <div className="flex gap-1">
            <button className="btn-secondary btn-sm" onClick={() => { setForm({ start_date: effectiveStart, end_date: effectiveEnd, duration_days: effectiveDur, notes: phase.notes || '' }); setEditing(true); }}>Edit</button>
            <button className="btn-secondary btn-sm text-red-600" onClick={() => onDelete(phase.id)}>Delete</button>
          </div>
        )}
      </td>
    </tr>
  );
}

function MilestoneRow({ milestone, popDate, readOnly, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    target_date: milestone.target_date,
    notes: milestone.notes || '',
  });
  const [error, setError] = useState('');

  function handleDateChange(val) {
    if (popDate && val > popDate) {
      setError(`Date exceeds Grant PoP (${formatDisplayDate(popDate)})`);
    } else {
      setError('');
    }
    setForm(f => ({ ...f, target_date: val }));
  }

  function handleSave() {
    if (error) return;
    onSave(milestone.id, form);
    setEditing(false);
  }

  const effectiveDate = milestone.override?.target_date ?? milestone.target_date;
  const isPastPoP = popDate && effectiveDate > popDate;
  const typeLabel = Number(milestone.is_pop_anchor) ? 'PoP Anchor' : Number(milestone.is_key_decision) ? 'Key Decision' : 'Milestone';
  const typeColor = Number(milestone.is_pop_anchor) ? 'text-red-600' : Number(milestone.is_key_decision) ? 'text-amber-600' : 'text-brand-600';

  if (editing) {
    return (
      <tr className="bg-brand-50">
        <td className="font-medium">{milestone.label}</td>
        <td><InlineDate value={form.target_date} onChange={handleDateChange} max={popDate} /></td>
        <td><span className={`text-xs font-medium ${typeColor}`}>{typeLabel}</span></td>
        <td colSpan={2}>
          {error && <span className="text-red-600 text-xs">{error}</span>}
          <input className="form-input py-0.5 px-1 text-xs w-40 mt-1" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes…" />
        </td>
        <td>
          <div className="flex gap-1">
            <button className="btn-primary btn-sm" onClick={handleSave} disabled={!!error}>Save</button>
            <button className="btn-secondary btn-sm" onClick={() => { setEditing(false); setError(''); }}>Cancel</button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={isPastPoP ? 'bg-orange-50' : ''}>
      <td className="font-medium">
        {milestone.label}
        {milestone.override && <span className="ml-1 text-xs text-purple-600 italic">(what-if)</span>}
      </td>
      <td className={isPastPoP ? 'text-orange-700 font-medium' : ''}>{formatDisplayDate(effectiveDate)}</td>
      <td><span className={`text-xs font-medium ${typeColor}`}>{typeLabel}</span></td>
      <td className="text-gray-500 text-xs">{milestone.notes || '—'}</td>
      <td></td>
      <td>
        {!readOnly && (
          <div className="flex gap-1">
            <button className="btn-secondary btn-sm" onClick={() => { setForm({ target_date: effectiveDate, notes: milestone.notes || '' }); setEditing(true); }}>Edit</button>
            <button className="btn-secondary btn-sm text-red-600" onClick={() => onDelete(milestone.id)}>Delete</button>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function ScheduleTable({ phases, milestones, popDate, readOnly, onPhaseChange, onPhaseDelete, onMilestoneChange, onMilestoneDelete }) {
  return (
    <div className="space-y-4 mt-4">
      {/* Phases table */}
      <div className="table-container">
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Schedule Phases</h3>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Phase</th>
              <th>Start Date</th>
              <th>Duration (days)</th>
              <th>End Date</th>
              <th>vs. PoP</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {phases.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-6 text-gray-400">No phases defined.</td></tr>
            ) : phases.map(p => (
              <PhaseRow
                key={p.id}
                phase={p}
                popDate={popDate}
                readOnly={readOnly}
                onSave={onPhaseChange}
                onDelete={onPhaseDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Milestones table */}
      <div className="table-container">
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Milestones</h3>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Milestone</th>
              <th>Target Date</th>
              <th>Type</th>
              <th>Notes</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {milestones.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-6 text-gray-400">No milestones defined.</td></tr>
            ) : milestones.map(m => (
              <MilestoneRow
                key={m.id}
                milestone={m}
                popDate={popDate}
                readOnly={readOnly}
                onSave={onMilestoneChange}
                onDelete={onMilestoneDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
