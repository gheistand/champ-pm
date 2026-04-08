import { useState } from 'react';
import { formatDisplayDate } from '../../utils/dateUtils';

export default function WhatIfPanel({
  scenario,
  scenarios,
  onSave,
  onExit,
  onLoad,
  onDelete,
  compareEnabled,
  onToggleCompare,
}) {
  const [name, setName] = useState(scenario?.name || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ name });
    } finally {
      setSaving(false);
    }
  }

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
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-purple-700">Scenario Name</label>
            <input
              className="form-input py-1 px-2 text-sm w-52"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My what-if scenario…"
            />
          </div>
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? 'Saving…' : 'Save Scenario'}
          </button>
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-purple-700">
            <input
              type="checkbox"
              checked={compareEnabled}
              onChange={(e) => onToggleCompare(e.target.checked)}
              className="accent-purple-600"
            />
            Compare with Base
          </label>
        </div>
      </div>

      {/* Saved scenarios list */}
      {scenarios && scenarios.length > 0 && (
        <div className="px-4 py-3 bg-white">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Saved Scenarios</p>
          <div className="space-y-1">
            {scenarios.map(s => (
              <div key={s.id} className="flex items-center gap-2 text-sm">
                <span className={`flex-1 ${scenario?.id === s.id ? 'font-semibold text-purple-700' : 'text-gray-700'}`}>
                  {s.name}
                  {scenario?.id === s.id && <span className="ml-1 text-xs text-purple-400">(active)</span>}
                </span>
                {s.created_at && (
                  <span className="text-xs text-gray-400">{formatDisplayDate(s.created_at.slice(0, 10))}</span>
                )}
                {scenario?.id !== s.id && (
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => onLoad(s)}
                  >
                    Load
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
