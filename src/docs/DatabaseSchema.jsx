import { useState } from 'react';

function ColTable({ cols }) {
  return (
    <table className="w-full text-xs border-t border-gray-100 mt-2">
      <thead>
        <tr className="bg-gray-50">
          <th className="px-3 py-1.5 text-left font-medium text-gray-500">Column</th>
          <th className="px-3 py-1.5 text-left font-medium text-gray-500">Type</th>
          <th className="px-3 py-1.5 text-left font-medium text-gray-500">Required</th>
          <th className="px-3 py-1.5 text-left font-medium text-gray-500">Default</th>
          <th className="px-3 py-1.5 text-left font-medium text-gray-500">Description</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {cols.map((c, i) => (
          <tr key={i} className="hover:bg-gray-50">
            <td className="px-3 py-1.5 font-mono text-blue-700">{c.name}</td>
            <td className="px-3 py-1.5 text-gray-500 font-mono">{c.type}</td>
            <td className="px-3 py-1.5">{c.required ? '✓' : ''}</td>
            <td className="px-3 py-1.5 text-gray-500 font-mono text-xs">{c.default || '—'}</td>
            <td className="px-3 py-1.5 text-gray-600">{c.desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TableAccordion({ name, purpose, fks, rules, cols, group }) {
  const [open, setOpen] = useState(false);
  const groupColors = {
    core: 'bg-blue-100 text-blue-700',
    financial: 'bg-green-100 text-green-700',
    equity: 'bg-purple-100 text-purple-700',
    plans: 'bg-amber-100 text-amber-700',
    schedule: 'bg-teal-100 text-teal-700',
    crm: 'bg-pink-100 text-pink-700',
    import: 'bg-gray-100 text-gray-600',
  };
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-2">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${groupColors[group] || groupColors.core}`}>
          {group}
        </span>
        <span className="font-mono text-sm font-semibold text-gray-800">{name}</span>
        <span className="text-gray-400 text-xs ml-1">— {purpose}</span>
        <span className="ml-auto text-gray-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 bg-white border-t border-gray-100">
          {fks && fks.length > 0 && (
            <div className="mt-3 mb-2 text-xs text-gray-500">
              <strong>Relationships:</strong> {fks.join(' · ')}
            </div>
          )}
          {rules && rules.length > 0 && (
            <div className="mb-2">
              {rules.map((r, i) => (
                <div key={i} className="text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-1 text-amber-800">
                  ⚠ {r}
                </div>
              ))}
            </div>
          )}
          <ColTable cols={cols} />
        </div>
      )}
    </div>
  );
}

const TABLES = [
  {
    group: 'core',
    name: 'users',
    purpose: 'Staff roster — Clerk-linked user accounts with CHAMP metadata',
    fks: ['salary_records → users.id', 'assignments → users.id', 'timesheet_entries → users.id'],
    rules: ['id is Clerk user ID (TEXT, not integer)', 'role must be admin | staff | hourly'],
    cols: [
      { name: 'id', type: 'TEXT PK', required: true, default: null, desc: 'Clerk user ID' },
      { name: 'email', type: 'TEXT', required: true, default: null, desc: 'Email address (unique)' },
      { name: 'name', type: 'TEXT', required: true, default: null, desc: 'Display name' },
      { name: 'role', type: 'TEXT', required: true, default: 'staff', desc: 'admin | staff | hourly' },
      { name: 'title', type: 'TEXT', required: false, default: null, desc: 'Job title' },
      { name: 'classification', type: 'TEXT', required: false, default: null, desc: 'HR classification code' },
      { name: 'band_classification', type: 'TEXT', required: false, default: null, desc: 'Salary band classification for equity analysis' },
      { name: 'department', type: 'TEXT', required: false, default: 'CHAMP', desc: 'Department name' },
      { name: 'start_date', type: 'TEXT', required: false, default: null, desc: 'Employment start date (ISO 8601)' },
      { name: 'role_start_date', type: 'TEXT', required: false, default: null, desc: 'Date entered current role — used for equity tenure calc' },
      { name: 'is_active', type: 'INTEGER', required: true, default: '1', desc: '1 = active, 0 = former staff' },
      { name: 'onboarded_at', type: 'TEXT', required: false, default: null, desc: 'Timestamp of first login onboarding completion' },
      { name: 'created_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
      { name: 'updated_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
    ],
  },
  {
    group: 'core',
    name: 'grants',
    purpose: 'Grant portfolio — FEMA and other funding awards',
    fks: ['projects → grants.id', 'grant_fa_rates → grants.id', 'grant_balances → grants.id'],
    rules: ['grant_number = full CFOP account string, not just fund number', 'total_budget includes both direct costs and F&A'],
    cols: [
      { name: 'id', type: 'INTEGER PK', required: true, default: 'autoincrement', desc: '' },
      { name: 'name', type: 'TEXT', required: true, default: null, desc: 'Grant display name' },
      { name: 'funder', type: 'TEXT', required: true, default: null, desc: 'Funding agency (FEMA, DHS, GRF, etc.)' },
      { name: 'grant_number', type: 'TEXT', required: false, default: null, desc: 'Full CFOP account string (e.g., 1-470736-740000-191200-A00)' },
      { name: 'fund_number', type: 'TEXT', required: false, default: null, desc: 'University fund number — NOT unique alone' },
      { name: 'start_date', type: 'TEXT', required: true, default: null, desc: 'Period of performance start' },
      { name: 'end_date', type: 'TEXT', required: true, default: null, desc: 'Period of performance end' },
      { name: 'total_budget', type: 'REAL', required: true, default: '0', desc: 'Total award amount (includes F&A)' },
      { name: 'status', type: 'TEXT', required: true, default: 'active', desc: 'active | inactive | completed' },
      { name: 'notes', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'created_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
      { name: 'updated_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
    ],
  },
  {
    group: 'core',
    name: 'projects',
    purpose: 'Projects within grants — budget allocation and task grouping',
    fks: ['tasks → projects.id', 'projects → grants.id', 'schedule_phases → projects.id'],
    rules: [],
    cols: [
      { name: 'id', type: 'INTEGER PK', required: true, default: 'autoincrement', desc: '' },
      { name: 'grant_id', type: 'INTEGER FK', required: true, default: null, desc: 'References grants.id' },
      { name: 'name', type: 'TEXT', required: true, default: null, desc: '' },
      { name: 'description', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'start_date', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'end_date', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'budget', type: 'REAL', required: true, default: '0', desc: 'Allocated budget for this project' },
      { name: 'estimated_hours', type: 'REAL', required: true, default: '0', desc: '' },
      { name: 'project_type', type: 'TEXT', required: false, default: null, desc: 'Classification of project work type' },
      { name: 'study_area_id', type: 'INTEGER FK', required: false, default: null, desc: 'References study_areas.id for Gantt swim lanes' },
      { name: 'status', type: 'TEXT', required: true, default: 'active', desc: 'active | inactive | completed' },
      { name: 'created_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
      { name: 'updated_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
    ],
  },
  {
    group: 'core',
    name: 'tasks',
    purpose: 'Tasks within projects — the unit of time entry',
    fks: ['timesheet_entries → tasks.id', 'assignments → tasks.id', 'tasks → projects.id'],
    rules: ['Grant ID 19 tasks are always visible to all staff regardless of assignments'],
    cols: [
      { name: 'id', type: 'INTEGER PK', required: true, default: 'autoincrement', desc: '' },
      { name: 'project_id', type: 'INTEGER FK', required: true, default: null, desc: 'References projects.id' },
      { name: 'name', type: 'TEXT', required: true, default: null, desc: '' },
      { name: 'description', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'start_date', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'end_date', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'budget', type: 'REAL', required: true, default: '0', desc: '' },
      { name: 'estimated_hours', type: 'REAL', required: true, default: '0', desc: '' },
      { name: 'status', type: 'TEXT', required: true, default: 'active', desc: 'active | inactive | completed' },
      { name: 'created_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
      { name: 'updated_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
    ],
  },
  {
    group: 'core',
    name: 'assignments',
    purpose: 'Staff-to-task allocation records',
    fks: ['assignments → users.id', 'assignments → tasks.id'],
    rules: ['UNIQUE(user_id, task_id) — one assignment per staff per task'],
    cols: [
      { name: 'id', type: 'INTEGER PK', required: true, default: 'autoincrement', desc: '' },
      { name: 'user_id', type: 'TEXT FK', required: true, default: null, desc: 'References users.id' },
      { name: 'task_id', type: 'INTEGER FK', required: true, default: null, desc: 'References tasks.id' },
      { name: 'allocated_hours', type: 'REAL', required: true, default: '0', desc: '' },
      { name: 'allocated_pct', type: 'REAL', required: false, default: null, desc: 'Percentage of time (0–1)' },
      { name: 'start_date', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'end_date', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'notes', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'created_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
      { name: 'updated_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
    ],
  },
  {
    group: 'core',
    name: 'timesheet_entries',
    purpose: 'Individual time log rows — one row per staff per task per date',
    fks: ['timesheet_entries → users.id', 'timesheet_entries → tasks.id'],
    rules: ['UNIQUE(user_id, task_id, entry_date)', 'Only approved entries included in cost calculations'],
    cols: [
      { name: 'id', type: 'INTEGER PK', required: true, default: 'autoincrement', desc: '' },
      { name: 'user_id', type: 'TEXT FK', required: true, default: null, desc: 'References users.id' },
      { name: 'task_id', type: 'INTEGER FK', required: true, default: null, desc: 'References tasks.id' },
      { name: 'entry_date', type: 'TEXT', required: true, default: null, desc: 'ISO 8601 date' },
      { name: 'hours', type: 'REAL', required: true, default: null, desc: '' },
      { name: 'notes', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'created_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
      { name: 'updated_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
    ],
  },
  {
    group: 'core',
    name: 'timesheet_weeks',
    purpose: 'Weekly timesheet lifecycle state — draft → submitted → approved/rejected',
    fks: ['timesheet_weeks → users.id'],
    rules: ['UNIQUE(user_id, week_start)', 'week_start is always a Monday'],
    cols: [
      { name: 'id', type: 'INTEGER PK', required: true, default: 'autoincrement', desc: '' },
      { name: 'user_id', type: 'TEXT FK', required: true, default: null, desc: 'References users.id' },
      { name: 'week_start', type: 'TEXT', required: true, default: null, desc: 'Monday of the week (ISO 8601)' },
      { name: 'status', type: 'TEXT', required: true, default: 'draft', desc: 'draft | submitted | approved | rejected' },
      { name: 'submitted_at', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'reviewed_by', type: 'TEXT FK', required: false, default: null, desc: 'Admin user ID who reviewed' },
      { name: 'reviewed_at', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'review_notes', type: 'TEXT', required: false, default: null, desc: 'Rejection reason' },
      { name: 'created_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
    ],
  },
  {
    group: 'financial',
    name: 'salary_records',
    purpose: 'Append-only salary history — all changes tracked with effective dates',
    fks: ['salary_records → users.id'],
    rules: ['Append-only — no edits or deletes', 'Most recent effective_date ≤ query date is used for calculations'],
    cols: [
      { name: 'id', type: 'INTEGER PK', required: true, default: 'autoincrement', desc: '' },
      { name: 'user_id', type: 'TEXT FK', required: true, default: null, desc: 'References users.id' },
      { name: 'annual_salary', type: 'REAL', required: true, default: null, desc: '' },
      { name: 'fringe_rate', type: 'REAL', required: true, default: null, desc: 'Benefits rate as decimal (e.g., 0.328)' },
      { name: 'appointment_type', type: 'TEXT', required: false, default: null, desc: 'AP, CS, etc.' },
      { name: 'effective_date', type: 'TEXT', required: true, default: null, desc: 'ISO 8601 date the salary took effect' },
      { name: 'notes', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'created_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
    ],
  },
  {
    group: 'financial',
    name: 'fringe_rates',
    purpose: 'Fringe benefit rates by appointment type and effective date. Lookup-only table — no foreign key relationships.',
    fks: [],
    rules: [
      'Immutable after creation — only notes can be updated',
      'Lookup table: when a new salary record is created, the API queries fringe_rates to find the current rate for the appointment type, then copies that rate into salary_records.fringe_rate. All subsequent cost calculations read from salary_records, not fringe_rates directly.',
      'This design means historical cost calculations remain stable even if fringe rates change later. The rate at time of entry is preserved in salary_records.',
      'No foreign key arrow in the ERD because fringe_rates is not joined in cost calculations — salary_records.fringe_rate already holds the captured value.',
    ],
    cols: [
      { name: 'id', type: 'INTEGER PK', required: true, default: 'autoincrement', desc: '' },
      { name: 'appointment_type', type: 'TEXT', required: true, default: null, desc: 'AP, CS, GA, etc.' },
      { name: 'rate', type: 'REAL', required: true, default: null, desc: 'Rate as decimal (e.g., 0.451)' },
      { name: 'effective_date', type: 'TEXT', required: true, default: null, desc: 'Date this rate became effective' },
      { name: 'notes', type: 'TEXT', required: false, default: null, desc: 'Only editable field' },
      { name: 'created_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
    ],
  },
  {
    group: 'financial',
    name: 'grant_fa_rates',
    purpose: 'F&A rate history per grant — typically 0.317 for FEMA/DHS grants',
    fks: ['grant_fa_rates → grants.id'],
    rules: ['Most recent effective_date ≤ query date is used', 'FEMA/DHS default: 0.317 (31.7% MTDC)'],
    cols: [
      { name: 'id', type: 'INTEGER PK', required: true, default: 'autoincrement', desc: '' },
      { name: 'grant_id', type: 'INTEGER FK', required: true, default: null, desc: 'References grants.id' },
      { name: 'fa_rate', type: 'REAL', required: true, default: null, desc: 'Rate as decimal (e.g., 0.317)' },
      { name: 'effective_date', type: 'TEXT', required: true, default: null, desc: '' },
      { name: 'notes', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'created_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
    ],
  },
  {
    group: 'financial',
    name: 'grant_balances',
    purpose: 'Manually-entered grant balances from PRIDE — used for runway calculations',
    fks: ['grant_balances → grants.id'],
    rules: ['Updated manually by admin from PRIDE; not a live feed'],
    cols: [
      { name: 'id', type: 'INTEGER PK', required: true, default: 'autoincrement', desc: '' },
      { name: 'grant_id', type: 'INTEGER FK', required: true, default: null, desc: 'References grants.id' },
      { name: 'balance', type: 'REAL', required: true, default: null, desc: 'Remaining balance from PRIDE' },
      { name: 'as_of_date', type: 'TEXT', required: true, default: null, desc: 'Date balance was pulled from PRIDE' },
      { name: 'notes', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'created_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
    ],
  },
  {
    group: 'equity',
    name: 'classification_bands',
    purpose: 'Salary band min/mid/max by classification and effective date',
    fks: [],
    rules: ['Most recent effective_date per classification is used for equity calculations'],
    cols: [
      { name: 'id', type: 'INTEGER PK', required: true, default: 'autoincrement', desc: '' },
      { name: 'classification', type: 'TEXT', required: true, default: null, desc: 'Classification code matching users.band_classification' },
      { name: 'band_min', type: 'REAL', required: true, default: null, desc: 'Minimum salary for this band' },
      { name: 'band_mid', type: 'REAL', required: true, default: null, desc: 'Midpoint (market rate reference)' },
      { name: 'band_max', type: 'REAL', required: true, default: null, desc: 'Maximum salary for this band' },
      { name: 'typical_years_max', type: 'INTEGER', required: false, default: '10', desc: 'Expected years to reach top of band (for tenure curve)' },
      { name: 'effective_date', type: 'TEXT', required: true, default: null, desc: '' },
      { name: 'notes', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'created_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
    ],
  },
  {
    group: 'equity',
    name: 'equity_snapshots',
    purpose: 'Point-in-time equity analysis results — saved for trend tracking',
    fks: ['equity_snapshot_items → equity_snapshots.id'],
    rules: [],
    cols: [
      { name: 'id', type: 'INTEGER PK', required: true, default: 'autoincrement', desc: '' },
      { name: 'snapshot_date', type: 'TEXT', required: true, default: null, desc: 'Date of the analysis' },
      { name: 'notes', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'created_by', type: 'TEXT FK', required: false, default: null, desc: 'Admin user who ran the snapshot' },
      { name: 'created_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
    ],
  },
  {
    group: 'plans',
    name: 'staff_plan_scenarios',
    purpose: 'Staff planning scenarios — named projections with date ranges and status',
    fks: ['staff_plan_scenario_rows → staff_plan_scenarios.id'],
    rules: ['Sandboxed — changes do not affect salary_records or assignments'],
    cols: [
      { name: 'id', type: 'INTEGER PK', required: true, default: 'autoincrement', desc: '' },
      { name: 'name', type: 'TEXT', required: true, default: null, desc: '' },
      { name: 'status', type: 'TEXT', required: true, default: 'draft', desc: 'draft | active | archived' },
      { name: 'start_date', type: 'TEXT', required: true, default: null, desc: 'Planning period start' },
      { name: 'end_date', type: 'TEXT', required: true, default: null, desc: 'Planning period end' },
      { name: 'notes', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'created_by', type: 'TEXT FK', required: false, default: null, desc: '' },
      { name: 'created_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
      { name: 'updated_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
    ],
  },
  {
    group: 'plans',
    name: 'staff_plan_scenario_rows',
    purpose: 'Per-staff, per-grant appointment rows within a scenario',
    fks: ['staff_plan_scenario_rows → staff_plan_scenarios.id', 'staff_plan_scenario_rows → users.id', 'staff_plan_scenario_rows → grants.id'],
    rules: [],
    cols: [
      { name: 'id', type: 'INTEGER PK', required: true, default: 'autoincrement', desc: '' },
      { name: 'scenario_id', type: 'INTEGER FK', required: true, default: null, desc: 'References staff_plan_scenarios.id' },
      { name: 'user_id', type: 'TEXT FK', required: true, default: null, desc: 'References users.id' },
      { name: 'grant_id', type: 'INTEGER FK', required: true, default: null, desc: 'References grants.id' },
      { name: 'allocation_pct', type: 'REAL', required: true, default: null, desc: 'Appointment percentage (0.05–1.0)' },
      { name: 'start_date', type: 'TEXT', required: true, default: null, desc: '' },
      { name: 'end_date', type: 'TEXT', required: true, default: null, desc: '' },
      { name: 'account_key', type: 'TEXT', required: false, default: null, desc: 'CFOP account string for PRIDE export' },
      { name: 'priority', type: 'INTEGER', required: false, default: null, desc: 'Sort order within scenario' },
      { name: 'notes', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'created_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
    ],
  },
  {
    group: 'schedule',
    name: 'study_areas',
    purpose: 'Geographic study areas spanning multiple grants — Gantt swim lane groupings',
    fks: ['projects → study_areas.id'],
    rules: [],
    cols: [
      { name: 'id', type: 'INTEGER PK', required: true, default: 'autoincrement', desc: '' },
      { name: 'name', type: 'TEXT', required: true, default: null, desc: 'Study area display name' },
      { name: 'description', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'display_order', type: 'INTEGER', required: false, default: '0', desc: '' },
      { name: 'created_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
    ],
  },
  {
    group: 'schedule',
    name: 'schedule_phases',
    purpose: 'Project Gantt phases — labeled date ranges within a project',
    fks: ['schedule_phases → projects.id'],
    rules: [],
    cols: [
      { name: 'id', type: 'INTEGER PK', required: true, default: 'autoincrement', desc: '' },
      { name: 'project_id', type: 'INTEGER FK', required: true, default: null, desc: 'References projects.id' },
      { name: 'label', type: 'TEXT', required: true, default: null, desc: 'Phase display label' },
      { name: 'start_date', type: 'TEXT', required: true, default: null, desc: '' },
      { name: 'end_date', type: 'TEXT', required: true, default: null, desc: '' },
      { name: 'color', type: 'TEXT', required: false, default: null, desc: 'CSS color or Tailwind class' },
      { name: 'display_order', type: 'INTEGER', required: false, default: '0', desc: '' },
      { name: 'created_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
      { name: 'updated_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
    ],
  },
  {
    group: 'schedule',
    name: 'schedule_milestones',
    purpose: 'Project milestones — key decision points and deliverable dates',
    fks: ['schedule_milestones → projects.id'],
    rules: [],
    cols: [
      { name: 'id', type: 'INTEGER PK', required: true, default: 'autoincrement', desc: '' },
      { name: 'project_id', type: 'INTEGER FK', required: true, default: null, desc: 'References projects.id' },
      { name: 'label', type: 'TEXT', required: true, default: null, desc: '' },
      { name: 'target_date', type: 'TEXT', required: true, default: null, desc: '' },
      { name: 'is_pop_anchor', type: 'INTEGER', required: false, default: '0', desc: '1 = period of performance boundary marker' },
      { name: 'is_key_decision', type: 'INTEGER', required: false, default: '0', desc: '1 = key decision point' },
      { name: 'display_order', type: 'INTEGER', required: false, default: '0', desc: '' },
      { name: 'created_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
    ],
  },
  {
    group: 'schedule',
    name: 'schedule_scenarios',
    purpose: 'What-if schedule scenarios — alternate phase/milestone overrides per project',
    fks: ['schedule_scenarios → projects.id'],
    rules: ['Overrides are stored separately in scenario_phase_overrides and scenario_milestone_overrides'],
    cols: [
      { name: 'id', type: 'INTEGER PK', required: true, default: 'autoincrement', desc: '' },
      { name: 'project_id', type: 'INTEGER FK', required: true, default: null, desc: 'References projects.id' },
      { name: 'name', type: 'TEXT', required: true, default: null, desc: '' },
      { name: 'description', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'is_active', type: 'INTEGER', required: false, default: '0', desc: '' },
      { name: 'created_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
    ],
  },
  {
    group: 'crm',
    name: 'contacts',
    purpose: 'CRM contact records — grant stakeholders, program officers, partners',
    fks: ['contact_grant_links → contacts.id', 'interactions → contacts.id'],
    rules: [],
    cols: [
      { name: 'id', type: 'INTEGER PK', required: true, default: 'autoincrement', desc: '' },
      { name: 'name', type: 'TEXT', required: true, default: null, desc: '' },
      { name: 'organization_id', type: 'INTEGER FK', required: false, default: null, desc: 'References organizations.id' },
      { name: 'email', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'phone', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'role', type: 'TEXT', required: false, default: null, desc: 'Program officer, partner, etc.' },
      { name: 'notes', type: 'TEXT', required: false, default: null, desc: '' },
      { name: 'created_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
      { name: 'updated_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
    ],
  },
  {
    group: 'import',
    name: 'timesheet_project_map',
    purpose: 'Maps external project/task names from CSV imports to CHAMP task IDs',
    fks: ['timesheet_project_map → tasks.id'],
    rules: [],
    cols: [
      { name: 'id', type: 'INTEGER PK', required: true, default: 'autoincrement', desc: '' },
      { name: 'external_name', type: 'TEXT', required: true, default: null, desc: 'Project/task name as it appears in the import CSV' },
      { name: 'task_id', type: 'INTEGER FK', required: true, default: null, desc: 'References tasks.id' },
      { name: 'created_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
    ],
  },
  {
    group: 'import',
    name: 'timesheet_staff_map',
    purpose: 'Maps external staff names from CSV imports to CHAMP user IDs',
    fks: ['timesheet_staff_map → users.id'],
    rules: [],
    cols: [
      { name: 'id', type: 'INTEGER PK', required: true, default: 'autoincrement', desc: '' },
      { name: 'external_name', type: 'TEXT', required: true, default: null, desc: 'Staff name as it appears in the import CSV' },
      { name: 'user_id', type: 'TEXT FK', required: true, default: null, desc: 'References users.id' },
      { name: 'created_at', type: 'TEXT', required: true, default: 'datetime(now)', desc: '' },
    ],
  },
];

function ERDiagram() {
  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 820 460" className="w-full max-w-3xl text-xs font-mono" style={{ minWidth: 600 }}>
        {/* Arrow marker */}
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
          </marker>
        </defs>

        {/* ─── Nodes ─── */}
        {/* grants */}
        <rect x="20" y="30" width="110" height="50" rx="6" fill="#1e40af" />
        <text x="75" y="50" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">grants</text>
        <text x="75" y="66" textAnchor="middle" fill="#bfdbfe" fontSize="9">id, name, total_budget</text>

        {/* projects */}
        <rect x="180" y="30" width="110" height="50" rx="6" fill="#1e40af" />
        <text x="235" y="50" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">projects</text>
        <text x="235" y="66" textAnchor="middle" fill="#bfdbfe" fontSize="9">grant_id, study_area_id</text>

        {/* tasks */}
        <rect x="340" y="30" width="110" height="50" rx="6" fill="#1e40af" />
        <text x="395" y="50" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">tasks</text>
        <text x="395" y="66" textAnchor="middle" fill="#bfdbfe" fontSize="9">project_id, budget</text>

        {/* timesheet_entries */}
        <rect x="500" y="30" width="130" height="50" rx="6" fill="#1e40af" />
        <text x="565" y="50" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">timesheet_entries</text>
        <text x="565" y="66" textAnchor="middle" fill="#bfdbfe" fontSize="9">user_id, task_id, hours</text>

        {/* users */}
        <rect x="660" y="30" width="110" height="50" rx="6" fill="#0f766e" />
        <text x="715" y="50" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">users</text>
        <text x="715" y="66" textAnchor="middle" fill="#99f6e4" fontSize="9">id, role, classification</text>

        {/* salary_records */}
        <rect x="660" y="140" width="130" height="50" rx="6" fill="#475569" />
        <text x="725" y="160" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">salary_records</text>
        <text x="725" y="176" textAnchor="middle" fill="#cbd5e1" fontSize="9">user_id, annual_salary</text>

        {/* assignments */}
        <rect x="500" y="140" width="110" height="50" rx="6" fill="#475569" />
        <text x="555" y="160" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">assignments</text>
        <text x="555" y="176" textAnchor="middle" fill="#cbd5e1" fontSize="9">user_id, task_id, pct</text>

        {/* grant_fa_rates */}
        <rect x="20" y="140" width="130" height="50" rx="6" fill="#475569" />
        <text x="85" y="160" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">grant_fa_rates</text>
        <text x="85" y="176" textAnchor="middle" fill="#cbd5e1" fontSize="9">grant_id, fa_rate</text>

        {/* fringe_rates */}
        <rect x="180" y="140" width="110" height="50" rx="6" fill="#475569" strokeDasharray="4 2" stroke="#94a3b8" strokeWidth="1.5" />
        <text x="235" y="158" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">fringe_rates</text>
        <text x="235" y="172" textAnchor="middle" fill="#cbd5e1" fontSize="9">appt_type, rate</text>
        <text x="235" y="183" textAnchor="middle" fill="#94a3b8" fontSize="8" fontStyle="italic">(lookup only)</text>

        {/* schedule_phases */}
        <rect x="180" y="260" width="120" height="50" rx="6" fill="#0e7490" />
        <text x="240" y="280" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">schedule_phases</text>
        <text x="240" y="296" textAnchor="middle" fill="#a5f3fc" fontSize="9">project_id, dates</text>

        {/* schedule_milestones */}
        <rect x="340" y="260" width="130" height="50" rx="6" fill="#0e7490" />
        <text x="405" y="280" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">schedule_milestones</text>
        <text x="405" y="296" textAnchor="middle" fill="#a5f3fc" fontSize="9">project_id, target_date</text>

        {/* study_areas */}
        <rect x="20" y="260" width="120" height="50" rx="6" fill="#0e7490" />
        <text x="80" y="280" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">study_areas</text>
        <text x="80" y="296" textAnchor="middle" fill="#a5f3fc" fontSize="9">name, display_order</text>

        {/* classification_bands */}
        <rect x="500" y="260" width="140" height="50" rx="6" fill="#7e22ce" />
        <text x="570" y="280" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">classification_bands</text>
        <text x="570" y="296" textAnchor="middle" fill="#e9d5ff" fontSize="9">band_min/mid/max</text>

        {/* equity_snapshots */}
        <rect x="660" y="260" width="130" height="50" rx="6" fill="#7e22ce" />
        <text x="725" y="280" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">equity_snapshots</text>
        <text x="725" y="296" textAnchor="middle" fill="#e9d5ff" fontSize="9">snapshot_date</text>

        {/* staff_plan_scenarios */}
        <rect x="20" y="380" width="140" height="50" rx="6" fill="#92400e" />
        <text x="90" y="400" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">staff_plan_scenarios</text>
        <text x="90" y="416" textAnchor="middle" fill="#fde68a" fontSize="9">name, status, dates</text>

        {/* contacts */}
        <rect x="500" y="380" width="100" height="50" rx="6" fill="#9d174d" />
        <text x="550" y="400" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">contacts</text>
        <text x="550" y="416" textAnchor="middle" fill="#fbcfe8" fontSize="9">name, email, org</text>

        {/* ─── Edges ─── */}
        {/* grants → projects */}
        <line x1="130" y1="55" x2="180" y2="55" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow)" />
        {/* projects → tasks */}
        <line x1="290" y1="55" x2="340" y2="55" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow)" />
        {/* tasks → timesheet_entries */}
        <line x1="450" y1="55" x2="500" y2="55" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow)" />
        {/* users → timesheet_entries */}
        <line x1="660" y1="55" x2="630" y2="55" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow)" />
        {/* users → salary_records */}
        <line x1="715" y1="80" x2="725" y2="140" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow)" />
        {/* users → assignments */}
        <line x1="660" y1="65" x2="610" y2="140" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow)" />
        {/* tasks → assignments */}
        <line x1="395" y1="80" x2="555" y2="140" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow)" />
        {/* grants → grant_fa_rates */}
        <line x1="75" y1="80" x2="85" y2="140" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow)" />
        {/* projects → schedule_phases */}
        <line x1="235" y1="80" x2="240" y2="260" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow)" />
        {/* projects → schedule_milestones */}
        <line x1="250" y1="80" x2="380" y2="260" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow)" />
        {/* study_areas → projects */}
        <line x1="140" y1="260" x2="220" y2="80" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow)" />
        {/* users → classification_bands (conceptual) */}
        <line x1="715" y1="80" x2="600" y2="260" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4" markerEnd="url(#arrow)" />
        {/* users → equity_snapshots */}
        <line x1="725" y1="80" x2="725" y2="260" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4" markerEnd="url(#arrow)" />

        {/* Legend */}
        <rect x="20" y="430" width="12" height="12" rx="2" fill="#1e40af" />
        <text x="36" y="441" fill="#475569" fontSize="9">Core tables</text>
        <rect x="110" y="430" width="12" height="12" rx="2" fill="#0f766e" />
        <text x="126" y="441" fill="#475569" fontSize="9">Users</text>
        <rect x="170" y="430" width="12" height="12" rx="2" fill="#475569" />
        <text x="186" y="441" fill="#475569" fontSize="9">Financial</text>
        <rect x="250" y="430" width="12" height="12" rx="2" fill="#0e7490" />
        <text x="266" y="441" fill="#475569" fontSize="9">Schedule</text>
        <rect x="330" y="430" width="12" height="12" rx="2" fill="#7e22ce" />
        <text x="346" y="441" fill="#475569" fontSize="9">Equity</text>
        <rect x="390" y="430" width="12" height="12" rx="2" fill="#92400e" />
        <text x="406" y="441" fill="#475569" fontSize="9">Staff Plans</text>
        <rect x="475" y="430" width="12" height="12" rx="2" fill="#9d174d" />
        <text x="491" y="441" fill="#475569" fontSize="9">CRM</text>
        <line x1="530" y1="436" x2="545" y2="436" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow)" />
        <text x="550" y="441" fill="#475569" fontSize="9">FK relationship</text>
        <line x1="640" y1="436" x2="655" y2="436" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4" markerEnd="url(#arrow)" />
        <text x="660" y="441" fill="#475569" fontSize="9">Conceptual link</text>
      </svg>
    </div>
  );
}

export default function DatabaseSchema() {
  const [activeTab, setActiveTab] = useState('diagram');
  const [search, setSearch] = useState('');

  const filtered = TABLES.filter(t =>
    !search || t.name.includes(search.toLowerCase()) || t.purpose.toLowerCase().includes(search.toLowerCase())
  );

  const groups = [...new Set(TABLES.map(t => t.group))];

  return (
    <div className="docs-content max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Database Schema</h2>
        <p className="text-gray-500 text-sm mt-1">
          Table structure, relationships, and business rules for the D1 SQLite database.
          <span className="ml-3 text-gray-400">Last reviewed: April 2026</span>
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        {['diagram', 'tables'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab === 'diagram' ? 'ERD Diagram' : 'Table Reference'}
          </button>
        ))}
      </div>

      {activeTab === 'diagram' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500 mb-4">
            Core relationships between major tables. Click "Table Reference" for full column details.
            Dashed lines indicate conceptual relationships used in reports.
          </p>
          <ERDiagram />
        </div>
      )}

      {activeTab === 'tables' && (
        <div>
          <div className="mb-4 flex gap-3 items-center">
            <input
              type="text"
              placeholder="Filter tables..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-input max-w-xs"
            />
            <span className="text-sm text-gray-500">{filtered.length} of {TABLES.length} tables</span>
          </div>

          {groups.map(group => {
            const groupTables = filtered.filter(t => t.group === group);
            if (!groupTables.length) return null;
            return (
              <div key={group} className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 capitalize">
                  {group === 'plans' ? 'Staff Plans' : group === 'crm' ? 'CRM' : group}
                </h3>
                {groupTables.map(t => (
                  <TableAccordion key={t.name} {...t} />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
