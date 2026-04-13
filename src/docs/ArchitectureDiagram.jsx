import { useState, useCallback } from 'react';

const NODES = [
  // Pages (layer 1)
  { id: 'p-dashboard', type: 'page', label: 'Dashboard', route: '/admin/dashboard', desc: 'Program health overview — alerts, budget summary, grant status', x: 30, y: 30 },
  { id: 'p-staff', type: 'page', label: 'Staff', route: '/admin/staff', desc: 'Staff roster management — add/edit staff, view salary history', x: 140, y: 30 },
  { id: 'p-grants', type: 'page', label: 'Grants', route: '/admin/grants', desc: 'Grant portfolio — budget, PoP dates, F&A rates, status', x: 230, y: 30 },
  { id: 'p-projects', type: 'page', label: 'Projects', route: '/admin/projects', desc: 'Projects within grants — budget allocation, task breakdown', x: 320, y: 30 },
  { id: 'p-timesheets', type: 'page', label: 'Timesheets', route: '/admin/timesheets', desc: 'Staff time entry review — submit, approve, flag missing', x: 420, y: 30 },
  { id: 'p-budget', type: 'page', label: 'Budget', route: '/admin/budget', desc: 'Grant budget consumption — visual burndown, cost breakdown by staff', x: 510, y: 30 },
  { id: 'p-runway', type: 'page', label: 'Runway', route: '/admin/runway', desc: 'Program financial runway — how long funding lasts at current burn rate', x: 600, y: 30 },
  { id: 'p-reports', type: 'page', label: 'Reports', route: '/admin/reports', desc: 'Timesheet cost reports — loaded rate, F&A, total cost by grant/period', x: 690, y: 30 },
  { id: 'p-salary', type: 'page', label: 'Salary', route: '/admin/salary', desc: 'Salary record history — append-only changes, fringe rates', x: 30, y: 110 },
  { id: 'p-equity', type: 'page', label: 'Equity', route: '/admin/equity', desc: 'Pay equity analysis — compa-ratio, percentile, equity gap by staff', x: 130, y: 110 },
  { id: 'p-staffplans', type: 'page', label: 'Staff Plans', route: '/admin/staff-plans', desc: 'Budget scenario planning — project salary costs against grant balances', x: 230, y: 110 },
  { id: 'p-schedule', type: 'page', label: 'Schedule', route: '/admin/projects/:id', desc: 'Per-project Gantt chart — phases, milestones, what-if scenarios', x: 340, y: 110 },
  { id: 'p-program', type: 'page', label: 'Program Sched.', route: '/admin/program-schedule', desc: 'Cross-grant Gantt — all projects, study areas, dependency connectors', x: 450, y: 110 },
  { id: 'p-import', type: 'page', label: 'Import', route: '/admin/import', desc: 'CSV timesheet import — map project/staff names, bulk upload entries', x: 565, y: 110 },
  { id: 'p-crm', type: 'page', label: 'CRM', route: '/admin/crm', desc: 'Contact & organization management — grant stakeholders, interactions', x: 660, y: 110 },

  // APIs (layer 2)
  { id: 'a-users', type: 'api', label: '/api/staff', desc: 'Staff CRUD, salary records, fringe rates, assignments', x: 30, y: 220 },
  { id: 'a-grants', type: 'api', label: '/api/grants', desc: 'Grant CRUD, F&A rates, budget summary', x: 130, y: 220 },
  { id: 'a-projects', type: 'api', label: '/api/projects', desc: 'Project and task CRUD, budget lines', x: 230, y: 220 },
  { id: 'a-timesheets', type: 'api', label: '/api/timesheets', desc: 'Time entry CRUD, week submit/approve/reject', x: 330, y: 220 },
  { id: 'a-reports', type: 'api', label: '/api/reports', desc: 'Timesheet cost report — loaded rates, F&A, totals', x: 430, y: 220 },
  { id: 'a-budget', type: 'api', label: '/api/budget', desc: 'Budget burndown, grant balance summaries', x: 530, y: 220 },
  { id: 'a-runway', type: 'api', label: '/api/runway', desc: 'Runway and burn rate calculations', x: 630, y: 220 },
  { id: 'a-salary', type: 'api', label: '/api/salary', desc: 'Salary record history, current salary lookup', x: 30, y: 300 },
  { id: 'a-equity', type: 'api', label: '/api/equity', desc: 'Compa-ratio, percentile, equity gap calculations', x: 130, y: 300 },
  { id: 'a-staffplans', type: 'api', label: '/api/staff-plans', desc: 'Scenario management, row projections, grant balance sync', x: 230, y: 300 },
  { id: 'a-schedule', type: 'api', label: '/api/schedule', desc: 'Phases, milestones, scenarios, scenario overrides', x: 330, y: 300 },
  { id: 'a-program', type: 'api', label: '/api/program-sched.', desc: 'All grants/projects/phases in one denormalized response', x: 430, y: 300 },
  { id: 'a-import', type: 'api', label: '/api/import', desc: 'CSV parse, project/staff mapping, bulk timesheet insert', x: 530, y: 300 },
  { id: 'a-crm', type: 'api', label: '/api/crm', desc: 'Contacts, organizations, interactions, grant links', x: 630, y: 300 },
  { id: 'a-alerts', type: 'api', label: '/api/alerts', desc: 'Dashboard alert generation — expiring grants, missing timesheets', x: 730, y: 300 },

  // DB (layer 3)
  { id: 'd-users', type: 'db', label: 'users', desc: 'Staff roster — id, email, name, role, title, classification', x: 30, y: 420 },
  { id: 'd-grants', type: 'db', label: 'grants', desc: 'Grant records — name, grant_number, start/end dates, total_budget, status', x: 130, y: 420 },
  { id: 'd-projects', type: 'db', label: 'projects', desc: 'Projects linked to grants — budget, hours, project_type, study_area_id', x: 230, y: 420 },
  { id: 'd-tasks', type: 'db', label: 'tasks', desc: 'Tasks within projects — budget, hours, status', x: 330, y: 420 },
  { id: 'd-timesheet_entries', type: 'db', label: 'timesheet_entries', desc: 'Individual time log rows — user_id, task_id, date, hours', x: 430, y: 420 },
  { id: 'd-timesheet_weeks', type: 'db', label: 'timesheet_weeks', desc: 'Weekly timesheet state — user, week_start, status', x: 540, y: 420 },
  { id: 'd-salary_records', type: 'db', label: 'salary_records', desc: 'Append-only salary history — annual_salary, fringe_rate, effective_date', x: 650, y: 420 },
  { id: 'd-fringe_rates', type: 'db', label: 'fringe_rates', desc: 'Fringe rates by appointment_type and effective_date — immutable after creation', x: 760, y: 420 },
  { id: 'd-grant_fa_rates', type: 'db', label: 'grant_fa_rates', desc: 'F&A rate per grant — 0.317 for all FEMA/DHS grants at ISWS', x: 30, y: 510 },
  { id: 'd-assignments', type: 'db', label: 'assignments', desc: 'Staff-to-task allocation — hours, percentage, dates', x: 140, y: 510 },
  { id: 'd-equity', type: 'db', label: 'equity_snapshots', desc: 'Point-in-time equity analysis snapshots', x: 260, y: 510 },
  { id: 'd-classification_bands', type: 'db', label: 'classif. bands', desc: 'Salary band min/mid/max by classification and effective date', x: 380, y: 510 },
  { id: 'd-staffplans', type: 'db', label: 'staff_plan_scenarios', desc: 'Staff planning scenarios — name, status, date range', x: 500, y: 510 },
  { id: 'd-schedule', type: 'db', label: 'schedule_phases', desc: 'Project Gantt phases — label, start/end dates, display_order', x: 620, y: 510 },
  { id: 'd-milestones', type: 'db', label: 'schedule_milestones', desc: 'Project milestones — label, target_date, is_pop_anchor', x: 730, y: 510 },
  { id: 'd-study_areas', type: 'db', label: 'study_areas', desc: 'Geographic study areas spanning multiple grants', x: 30, y: 590 },
  { id: 'd-contacts', type: 'db', label: 'contacts', desc: 'CRM contacts — name, org, email, role', x: 140, y: 590 },

  // External
  { id: 'e-clerk', type: 'external', label: 'Clerk', desc: 'Authentication & authorization — JWT verification, user roles, account portal', x: 870, y: 80 },
  { id: 'e-cf', type: 'external', label: 'Cloudflare Pages', desc: 'Hosting + serverless functions — auto-deploys from GitHub main branch', x: 870, y: 180 },
  { id: 'e-d1', type: 'external', label: 'D1 (SQLite)', desc: 'Cloudflare edge database — SQLite, globally replicated, no connection pooling needed', x: 870, y: 280 },
];

const EDGES = [
  { from: 'p-dashboard', to: 'a-alerts' }, { from: 'p-dashboard', to: 'a-grants' },
  { from: 'p-staff', to: 'a-users' }, { from: 'p-grants', to: 'a-grants' },
  { from: 'p-projects', to: 'a-projects' }, { from: 'p-timesheets', to: 'a-timesheets' },
  { from: 'p-budget', to: 'a-budget' }, { from: 'p-budget', to: 'a-reports' },
  { from: 'p-runway', to: 'a-runway' }, { from: 'p-reports', to: 'a-reports' },
  { from: 'p-salary', to: 'a-salary' }, { from: 'p-equity', to: 'a-equity' },
  { from: 'p-staffplans', to: 'a-staffplans' }, { from: 'p-schedule', to: 'a-schedule' },
  { from: 'p-program', to: 'a-program' }, { from: 'p-import', to: 'a-import' },
  { from: 'p-crm', to: 'a-crm' },
  { from: 'a-users', to: 'd-users' }, { from: 'a-users', to: 'd-salary_records' },
  { from: 'a-users', to: 'd-assignments' }, { from: 'a-users', to: 'd-fringe_rates' },
  { from: 'a-grants', to: 'd-grants' }, { from: 'a-grants', to: 'd-grant_fa_rates' },
  { from: 'a-projects', to: 'd-projects' }, { from: 'a-projects', to: 'd-tasks' },
  { from: 'a-timesheets', to: 'd-timesheet_entries' }, { from: 'a-timesheets', to: 'd-timesheet_weeks' },
  { from: 'a-timesheets', to: 'd-tasks' },
  { from: 'a-reports', to: 'd-timesheet_entries' }, { from: 'a-reports', to: 'd-salary_records' },
  { from: 'a-reports', to: 'd-fringe_rates' }, { from: 'a-reports', to: 'd-grant_fa_rates' },
  { from: 'a-budget', to: 'd-timesheet_entries' }, { from: 'a-budget', to: 'd-grants' },
  { from: 'a-budget', to: 'd-grant_fa_rates' },
  { from: 'a-runway', to: 'd-salary_records' }, { from: 'a-runway', to: 'd-grants' },
  { from: 'a-runway', to: 'd-assignments' },
  { from: 'a-salary', to: 'd-salary_records' }, { from: 'a-salary', to: 'd-fringe_rates' },
  { from: 'a-equity', to: 'd-salary_records' }, { from: 'a-equity', to: 'd-classification_bands' },
  { from: 'a-equity', to: 'd-equity' }, { from: 'a-equity', to: 'd-users' },
  { from: 'a-staffplans', to: 'd-staffplans' }, { from: 'a-staffplans', to: 'd-salary_records' },
  { from: 'a-staffplans', to: 'd-grants' }, { from: 'a-staffplans', to: 'd-assignments' },
  { from: 'a-schedule', to: 'd-schedule' }, { from: 'a-schedule', to: 'd-milestones' },
  { from: 'a-schedule', to: 'd-projects' },
  { from: 'a-program', to: 'd-grants' }, { from: 'a-program', to: 'd-projects' },
  { from: 'a-program', to: 'd-schedule' }, { from: 'a-program', to: 'd-milestones' },
  { from: 'a-program', to: 'd-study_areas' },
  { from: 'a-import', to: 'd-timesheet_entries' }, { from: 'a-import', to: 'd-tasks' },
  { from: 'a-import', to: 'd-users' },
  { from: 'a-crm', to: 'd-contacts' },
  { from: 'a-alerts', to: 'd-grants' }, { from: 'a-alerts', to: 'd-timesheet_weeks' },
  { from: 'a-users', to: 'e-clerk' },
  { from: 'e-cf', to: 'e-d1' },
];

const nodeMap = Object.fromEntries(NODES.map(n => [n.id, n]));

const NODE_W = 90;
const NODE_H = 30;

function nodeCenter(n) {
  return { x: n.x + NODE_W / 2, y: n.y + NODE_H / 2 };
}

function getConnected(nodeId) {
  const connected = new Set();
  for (const e of EDGES) {
    if (e.from === nodeId) connected.add(e.to);
    if (e.to === nodeId) connected.add(e.from);
  }
  return connected;
}

const TYPE_COLORS = {
  page: { fill: '#1e40af', text: '#fff', stroke: '#1e3a8a' },
  api: { fill: '#0e7490', text: '#fff', stroke: '#155e75' },
  db: { fill: '#475569', text: '#fff', stroke: '#334155' },
  external: { fill: '#6b7280', text: '#fff', stroke: '#4b5563' },
};

export default function ArchitectureDiagram() {
  const [selected, setSelected] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [zoom, setZoom] = useState(1);

  const connected = selected ? getConnected(selected) : null;

  const isHighlighted = (id) => !selected || id === selected || connected?.has(id);

  const isEdgeHighlighted = (e) =>
    !selected || e.from === selected || e.to === selected;

  const handleNodeClick = useCallback((id, e) => {
    e.stopPropagation();
    setSelected(s => s === id ? null : id);
    setTooltip(null);
  }, []);

  const handleNodeHover = useCallback((node, e) => {
    if (selected) return;
    const svgRect = e.currentTarget.closest('svg').getBoundingClientRect();
    const cx = node.x * zoom + NODE_W * zoom / 2;
    const cy = node.y * zoom + NODE_H * zoom + 4;
    setTooltip({ text: `${node.label}: ${node.desc}`, x: cx, y: cy });
  }, [selected, zoom]);

  const handleNodeLeave = useCallback(() => {
    if (!selected) setTooltip(null);
  }, [selected]);

  return (
    <div className="docs-content">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">System Architecture</h2>
        <p className="text-gray-500 text-sm mt-1">
          Interactive diagram of pages, API endpoints, and database tables.
          Click any node to highlight its connections.
          <span className="ml-3 text-gray-400">Last reviewed: April 2026</span>
        </p>
      </div>

      <div className="flex items-center gap-2 mb-3 no-print">
        <span className="text-sm text-gray-500">Zoom:</span>
        <button onClick={() => setZoom(z => Math.min(z + 0.15, 2))} className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm">+</button>
        <button onClick={() => setZoom(z => Math.max(z - 0.15, 0.4))} className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm">−</button>
        <button onClick={() => setZoom(1)} className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm">Reset</button>
        {selected && (
          <button onClick={() => setSelected(null)} className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm ml-2">
            Clear selection
          </button>
        )}
        <div className="flex items-center gap-3 ml-4">
          {['page', 'api', 'db', 'external'].map(t => (
            <div key={t} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ background: TYPE_COLORS[t].fill }} />
              <span className="text-xs text-gray-500 capitalize">{t === 'db' ? 'Database' : t === 'api' ? 'API' : t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Print fallback — shown only in print, hidden on screen */}
      <div className="architecture-print-show hidden p-4 border border-gray-200 rounded bg-gray-50 text-sm text-gray-600 italic">
        Interactive architecture diagram available at champ-pm.app/admin/docs/architecture/overview
      </div>

      <div className="border border-gray-200 rounded-xl bg-white overflow-auto relative architecture-print-hide">
        <svg
          width={Math.round(980 * zoom)}
          height={Math.round(660 * zoom)}
          onClick={() => { setSelected(null); setTooltip(null); }}
          style={{ display: 'block', cursor: 'default' }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#94a3b8" />
            </marker>
            <marker id="arrowhead-hl" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#0d9488" />
            </marker>
          </defs>

          <g transform={`scale(${zoom})`}>
            {/* Layer labels */}
            <text x="10" y="22" fontSize="9" fill="#9ca3af" fontWeight="600" textTransform="uppercase">PAGES</text>
            <text x="10" y="212" fontSize="9" fill="#9ca3af" fontWeight="600">API ENDPOINTS</text>
            <text x="10" y="412" fontSize="9" fill="#9ca3af" fontWeight="600">DATABASE (D1)</text>
            <text x="865" y="60" fontSize="9" fill="#9ca3af" fontWeight="600">EXTERNAL</text>

            {/* Edges */}
            {EDGES.map((e, i) => {
              const from = nodeMap[e.from];
              const to = nodeMap[e.to];
              if (!from || !to) return null;
              const fc = nodeCenter(from);
              const tc = nodeCenter(to);
              const hl = isEdgeHighlighted(e);
              return (
                <line
                  key={i}
                  x1={fc.x} y1={fc.y}
                  x2={tc.x} y2={tc.y}
                  stroke={hl ? '#0d9488' : '#e2e8f0'}
                  strokeWidth={hl ? 1.5 : 0.8}
                  opacity={selected && !hl ? 0.1 : 1}
                  markerEnd={hl ? 'url(#arrowhead-hl)' : 'url(#arrowhead)'}
                />
              );
            })}

            {/* Nodes */}
            {NODES.map(node => {
              const colors = TYPE_COLORS[node.type];
              const hl = isHighlighted(node.id);
              const isSel = selected === node.id;
              const isDb = node.type === 'db';
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  onClick={(e) => handleNodeClick(node.id, e)}
                  onMouseEnter={(e) => handleNodeHover(node, e)}
                  onMouseLeave={handleNodeLeave}
                  style={{ cursor: 'pointer', opacity: hl ? 1 : 0.25 }}
                >
                  {isDb ? (
                    <>
                      <rect x={0} y={5} width={NODE_W} height={NODE_H - 5} rx={4} fill={colors.fill} />
                      <ellipse cx={NODE_W / 2} cy={5} rx={NODE_W / 2} ry={6} fill={colors.stroke} />
                      <ellipse cx={NODE_W / 2} cy={5} rx={NODE_W / 2} ry={4} fill={colors.fill} />
                    </>
                  ) : (
                    <rect
                      x={0} y={0}
                      width={NODE_W} height={NODE_H}
                      rx={5}
                      fill={colors.fill}
                      stroke={isSel ? '#fff' : colors.stroke}
                      strokeWidth={isSel ? 2 : 1}
                      strokeDasharray={node.type === 'external' ? '4' : undefined}
                    />
                  )}
                  <text
                    x={NODE_W / 2}
                    y={isDb ? NODE_H / 2 + 8 : NODE_H / 2 + 4}
                    textAnchor="middle"
                    fill={colors.text}
                    fontSize="8.5"
                    fontWeight={isSel ? 'bold' : 'normal'}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Tooltip */}
          {tooltip && (
            <foreignObject x={Math.max(4, tooltip.x - 120)} y={tooltip.y} width="240" height="80">
              <div
                xmlns="http://www.w3.org/1999/xhtml"
                style={{
                  background: 'rgba(17,24,39,0.95)',
                  color: '#fff',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  lineHeight: '1.4',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  pointerEvents: 'none',
                }}
              >
                {tooltip.text}
              </div>
            </foreignObject>
          )}
        </svg>

        {/* Selected node info panel */}
        {selected && nodeMap[selected] && (
          <div className="absolute bottom-4 left-4 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 max-w-xs">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{nodeMap[selected].type}</p>
            <p className="text-sm font-bold text-gray-900">{nodeMap[selected].label}</p>
            {nodeMap[selected].route && (
              <p className="text-xs font-mono text-blue-600 mt-0.5">{nodeMap[selected].route}</p>
            )}
            <p className="text-xs text-gray-600 mt-1">{nodeMap[selected].desc}</p>
            <p className="text-xs text-gray-400 mt-1">{connected?.size || 0} connected nodes</p>
          </div>
        )}
      </div>
    </div>
  );
}
