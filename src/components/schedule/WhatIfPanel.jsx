import { useState, useEffect } from 'react';
import { formatDisplayDate } from '../../utils/dateUtils';

const STATUS_BADGE = {
  draft:    'inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500',
  saved:    'inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700 font-medium',
  archived: 'inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-200 text-gray-400',
};

export default function WhatIfPanel({
  scenario,
  scenarios,
  onSave,
  onExit,
  onLoad,
  onDelete,
  onArchive,
  compareTarget,        // '' | 'base' | scenarioId string
  onChangeCompareTarget,
}) {
  const [name, setName] = useState(scenario?.name || '');
  const [notes, setNotes] = useState(scenario?.notes || '');
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Sync form when active scenario changes
  useEffect(() => {
    setName(scenario?.name || '');
    setNotes(scenario?.notes || '');
  }, [scenario?.id]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ name, notes });
    } finally {
      setSaving(false);
    }
  }

  const visibleScenarios = scenarios
    ? scenarios.filter(s => showArchived ? true : s.status !== 'archived')
    : [];

  const compareOptions = scenarios
    ? scenarios.filter(s => s.id !== scenario?.id && s.status !== 'archived')
    : [];

  return (
    <div className="border border-purple-300 rounded-lg overflow-hidden">
      {/* Banner */}
      <div className="flex items-center gap-3 px-4 py-2 bg-purple-600 text-white text-sm">
        <span className="font-semibold">What-if Mode</span>
        <span className="text-purple-200 text-xs">— changes here do not affect the real schedule</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="text-xs text-purple-100 hover:text-white underline"
            onClick={onExit}
          >
            Exit Without Saving
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-3 bg-purple-50 border-b border-purple-200">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-purple-700 whitespace-nowrap">Scenario Name</label>
              <input
                className="form-input py-1 px-2 text-sm w-52"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My what-if scenario…"
              />
            </div>
            <textarea
              className="form-input py-1 px-2 text-xs w-full resize-none"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What assumptions does this scenario make? (optional)"
            />
          </div>
          <div className="flex flex-col gap-2 pt-0.5">
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={handleSave}
              disabled={saving || !name.trim()}
            >
              {saving ? 'Saving…' : 'Save Scenario'}
            </button>
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-purple-700 whitespace-nowrap">Compare with:</label>
              <select
                className="form-select py-0.5 text-xs"
                value={compareTarget || ''}
                onChange={(e) => onChangeCompareTarget(e.target.value)}
              >
                <option value="">— Off —</option>
                <option value="base">Base Plan</option>
                {compareOptions.map(s => (
                  <option key={s.id} value={String(s.id)}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Saved scenarios list */}
      {scenarios && scenarios.length > 0 && (
        <div className="px-4 py-3 bg-white">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide flex-1">Saved Scenarios</p>
            {scenarios.some(s => s.status === 'archived') && (
              <button
                type="button"
                className="text-xs text-gray-400 hover:text-gray-600 underline"
                onClick={() => setShowArchived(v => !v)}
              >
                {showArchived ? 'Hide Archived' : 'Show Archived'}
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {visibleScenarios.map(s => (
              <div
                key={s.id}
                className={`flex items-start gap-2 text-sm ${s.status === 'archived' ? 'opacity-50' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`${scenario?.id === s.id ? 'font-semibold text-purple-700' : 'text-gray-700'} ${s.status === 'archived' ? 'line-through' : ''}`}>
                      {s.name}
                    </span>
                    {scenario?.id === s.id && <span className="text-xs text-purple-400">(active)</span>}
                    <span className={STATUS_BADGE[s.status] || STATUS_BADGE.draft}>
                      {s.status}
                    </span>
                  </div>
                  {s.notes && (
                    <p className="text-xs text-gray-400 italic mt-0.5 truncate">{s.notes}</p>
                  )}
                  {s.created_at && (
                    <span className="text-xs text-gray-400">{formatDisplayDate(s.created_at.slice(0, 10))}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {scenario?.id !== s.id && s.status !== 'archived' && (
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => onLoad(s)}
                    >
                      Load
                    </button>
                  )}
                  {scenario?.id !== s.id && s.status === 'archived' && (
                    <button
                      type="button"
                      className="btn-secondary btn-sm text-gray-400"
                      onClick={() => onLoad(s)}
                      title="Load (read-only reference)"
                    >
                      View
                    </button>
                  )}
                  {s.status === 'saved' && onArchive && (
                    <button
                      type="button"
                      className="btn-secondary btn-sm text-gray-500"
                      onClick={() => onArchive(s.id)}
                      title="Archive this scenario"
                    >
                      Archive
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-secondary btn-sm text-red-600"
                    onClick={() => onDelete(s.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
