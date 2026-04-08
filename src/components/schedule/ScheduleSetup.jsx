import { useState } from 'react';
import { SCHEDULE_TEMPLATES, buildTemplateSchedule } from '../../utils/scheduleTemplates';
import { formatDisplayDate } from '../../utils/dateUtils';

const TYPE_LABELS = {
  data_development: 'FEMA Data Development',
  mapping: 'FEMA Mapping',
  custom: 'Custom',
};

export default function ScheduleSetup({ project, studyAreas, onSetup, onProjectTypeChange }) {
  const [projectType, setProjectType] = useState(project.project_type || 'custom');
  const [studyAreaId, setStudyAreaId] = useState(project.study_area_id || '');
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showNewAreaForm, setShowNewAreaForm] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [savingArea, setSavingArea] = useState(false);

  const popDate = project.grant_end_date;

  function handleTypeChange(type) {
    setProjectType(type);
    setPreview(null);
  }

  function handleLoadTemplate() {
    if (!popDate) return;
    const template = SCHEDULE_TEMPLATES[projectType];
    if (!template) return;
    const result = buildTemplateSchedule(template, popDate);
    setPreview(result);
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Update project type if changed
      if (projectType !== project.project_type || studyAreaId !== (project.study_area_id || '')) {
        await onProjectTypeChange({ project_type: projectType, study_area_id: studyAreaId || null });
      }
      // Save phases and milestones (either from template preview or blank)
      await onSetup(preview || { phases: [], milestones: [] });
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateArea(e) {
    e.preventDefault();
    if (!newAreaName.trim()) return;
    setSavingArea(true);
    try {
      await onProjectTypeChange({ _createArea: newAreaName.trim() });
      setShowNewAreaForm(false);
      setNewAreaName('');
    } finally {
      setSavingArea(false);
    }
  }

  return (
    <div className="card p-6 max-w-2xl mx-auto">
      <h2 className="text-base font-semibold text-gray-800 mb-1">Set Up Project Schedule</h2>
      <p className="text-sm text-gray-500 mb-5">
        This project has no schedule yet. Choose a project type to load a template or start blank.
      </p>

      {/* Grant PoP info */}
      {popDate && (
        <div className="flex items-center gap-2 mb-5 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <span className="font-medium">Grant PoP:</span>
          <span>{formatDisplayDate(popDate)}</span>
          <span className="text-red-400 text-xs ml-1">— all dates will be anchored to this</span>
        </div>
      )}

      {!popDate && (
        <div className="mb-5 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
          ⚠ The parent grant has no end date set. Templates cannot be loaded until a grant end date is configured.
        </div>
      )}

      {/* Project type */}
      <div className="mb-4">
        <label className="form-label">Project Type</label>
        <div className="flex gap-3 flex-wrap">
          {Object.entries(TYPE_LABELS).map(([val, label]) => (
            <label key={val} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="project_type"
                value={val}
                checked={projectType === val}
                onChange={() => handleTypeChange(val)}
                className="accent-brand-600"
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Study area (shown for data_development and mapping) */}
      {(projectType === 'data_development' || projectType === 'mapping') && (
        <div className="mb-4">
          <label className="form-label">Study Area <span className="text-gray-400 font-normal">(optional)</span></label>
          <div className="flex items-center gap-2">
            <select
              className="form-select"
              value={studyAreaId}
              onChange={(e) => setStudyAreaId(e.target.value)}
            >
              <option value="">— None —</option>
              {studyAreas.map(sa => (
                <option key={sa.id} value={sa.id}>{sa.name}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn-secondary btn-sm whitespace-nowrap"
              onClick={() => setShowNewAreaForm(v => !v)}
            >
              + New Area
            </button>
          </div>
          {showNewAreaForm && (
            <form onSubmit={handleCreateArea} className="flex items-center gap-2 mt-2">
              <input
                className="form-input"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                placeholder="Study area name…"
                required
              />
              <button type="submit" className="btn-primary btn-sm" disabled={savingArea}>
                {savingArea ? 'Creating…' : 'Create'}
              </button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setShowNewAreaForm(false)}>Cancel</button>
            </form>
          )}
        </div>
      )}

      {/* Template option */}
      {projectType !== 'custom' && popDate && (
        <div className="mb-4 p-4 bg-brand-50 border border-brand-200 rounded">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-brand-800">
                {TYPE_LABELS[projectType]} Template
              </p>
              <p className="text-xs text-brand-600 mt-0.5">
                {SCHEDULE_TEMPLATES[projectType]?.phases.length} phases · {SCHEDULE_TEMPLATES[projectType]?.milestones.length} milestones · dates worked backward from Grant PoP
              </p>
            </div>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={handleLoadTemplate}
            >
              Load Template
            </button>
          </div>
          {preview && (
            <div className="mt-3 text-xs text-brand-700 space-y-1">
              <p className="font-medium">Preview (first phase starts {formatDisplayDate(preview.phases[0]?.start_date)}):</p>
              {preview.phases.map((ph, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-4 text-right text-brand-400">{i + 1}.</span>
                  <span className="font-medium">{ph.label}</span>
                  <span className="text-brand-500">{formatDisplayDate(ph.start_date)} – {formatDisplayDate(ph.end_date)}</span>
                  <span className="text-brand-400">({ph.duration_days}d)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          className="btn-primary"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? 'Setting up…' : preview ? 'Set Up Schedule with Template' : 'Start with Blank Schedule'}
        </button>
      </div>
    </div>
  );
}
