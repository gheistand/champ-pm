import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// ── constants ─────────────────────────────────────────────────────────────────
const LABEL_W = 220;
const ROW_H = 32;
const GROUP_H = 28;
const STUDY_H = 30;
const HEADER_H = 40;
const PADDING_DAYS = 30;
const MS_PER_DAY = 86400000;

const TYPE_COLORS = {
  data_development: '#0e9e8e',
  mapping: '#d97706',
  custom: '#64748b',
};

const TYPE_LABELS = {
  data_development: 'Data Development',
  mapping: 'Mapping',
  custom: 'Custom',
};

// Cycle of colors for grant PoP lines
const POP_COLORS = ['#7c3aed', '#db2777', '#0284c7', '#16a34a', '#b45309'];

// ── date helpers ──────────────────────────────────────────────────────────────
function parseDate(str) {
  if (!str) return null;
  return new Date(str + 'T00:00:00Z');
}

function addDays(date, n) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function diffDays(a, b) {
  return Math.round((b - a) / MS_PER_DAY);
}

function monthLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function shortMonthLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
}

function formatDateShort(str) {
  if (!str) return '';
  const d = parseDate(str);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function getMonthTicks(minDate, maxDate, zoom) {
  const ticks = [];
  const step = zoom === 'year' ? 3 : zoom === 'quarter' ? 1 : 1;
  const d = new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), 1));
  while (d <= maxDate) {
    ticks.push(new Date(d));
    d.setUTCMonth(d.getUTCMonth() + step);
  }
  return ticks;
}

function makeScale(minDate, pxPerDay) {
  return {
    toX: (date) => LABEL_W + diffDays(minDate, date) * pxPerDay,
    pxPerDay,
  };
}

// ── Diamond marker ────────────────────────────────────────────────────────────
function Diamond({ cx, cy, size, fill, stroke }) {
  const pts = `${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`;
  return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={1.5} />;
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function Tooltip({ tip, svgW }) {
  if (!tip) return null;
  const PAD = 8;
  const W = 220;
  const H = tip.lines.length * 14 + PAD * 2;
  let tx = tip.x + 12;
  let ty = tip.y - H / 2;
  if (tx + W > svgW - 4) tx = tip.x - W - 12;
  if (ty < 4) ty = 4;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={tx} y={ty} width={W} height={H} rx={4} fill="#1f2937" opacity={0.92} />
      {tip.lines.map((line, i) => (
        <text key={i} x={tx + PAD} y={ty + PAD + 11 + i * 14} fontSize={10} fill="#f9fafb" fontFamily="sans-serif">
          {line}
        </text>
      ))}
    </g>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProgramGantt({
  grants = [],
  studyAreas = [],
  dependencies = [],
  viewMode = 'study_area',
  filterType = '',
  filterStatus = 'active',
  filterStudyArea = '',
}) {
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(900);
  const [zoom, setZoom] = useState('quarter'); // 'year' | 'quarter' | 'month'
  const [collapsed, setCollapsed] = useState(new Set());
  const [tip, setTip] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerW(entry.contentRect.width || 900);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Build flat project list from grants ───────────────────────────────────
  const allProjects = [];
  for (const g of grants) {
    for (const p of (g.projects || [])) {
      allProjects.push({ ...p, grantName: g.name, grantEndDate: g.end_date });
    }
  }

  // Filter
  const visibleProjects = allProjects.filter(p => {
    if (filterType && p.project_type !== filterType) return false;
    if (filterStudyArea && String(p.study_area_id) !== String(filterStudyArea)) return false;
    return true;
  });

  const visibleProjectIds = new Set(visibleProjects.map(p => p.id));

  // ── Date range ────────────────────────────────────────────────────────────
  const allDates = [];
  for (const p of visibleProjects) {
    if (p.start_date) allDates.push(parseDate(p.start_date));
    if (p.end_date) allDates.push(parseDate(p.end_date));
    for (const ph of (p.phases || [])) {
      if (ph.start_date) allDates.push(parseDate(ph.start_date));
      if (ph.end_date) allDates.push(parseDate(ph.end_date));
    }
  }
  for (const g of grants) {
    if (g.end_date) allDates.push(parseDate(g.end_date));
  }
  const today = new Date();
  allDates.push(today);

  if (allDates.length === 0) {
    return (
      <div className="rounded border border-gray-200 bg-white p-8 text-center text-gray-400 text-sm">
        No project schedules found. Open a project and set up its schedule to see it here.
      </div>
    );
  }

  const rawMin = new Date(Math.min(...allDates.map(d => d.getTime())));
  const rawMax = new Date(Math.max(...allDates.map(d => d.getTime())));
  const minDate = addDays(rawMin, -PADDING_DAYS);
  const maxDate = addDays(rawMax, PADDING_DAYS);
  const totalDays = diffDays(minDate, maxDate);

  const PX_PER_DAY_BASE = zoom === 'year' ? 1.2 : zoom === 'quarter' ? 2.5 : 5;
  const timelineW = Math.max(containerW - LABEL_W, 400);
  const autoScale = timelineW / totalDays;
  const pxPerDay = Math.max(PX_PER_DAY_BASE, autoScale);
  const svgTimelineW = totalDays * pxPerDay;
  const svgW = LABEL_W + svgTimelineW;

  const scale = makeScale(minDate, pxPerDay);
  const todayX = scale.toX(today);
  const monthTicks = getMonthTicks(minDate, maxDate, zoom);

  // ── Build rows based on viewMode ──────────────────────────────────────────
  // Each row: { type: 'study'|'grant'|'project', ... }
  const rows = [];

  if (viewMode === 'study_area') {
    // Group by study area
    const projectById = Object.fromEntries(visibleProjects.map(p => [p.id, p]));
    const studyAreaMap = new Map();

    // Assign projects to their study area
    for (const p of visibleProjects) {
      const saId = p.study_area_id || '__none__';
      if (!studyAreaMap.has(saId)) {
        const sa = studyAreas.find(s => s.id === saId) || { id: '__none__', name: '(No Study Area)', status: '' };
        studyAreaMap.set(saId, { sa, grantGroups: new Map() });
      }
      const entry = studyAreaMap.get(saId);
      const grantId = p.grant_id;
      if (!entry.grantGroups.has(grantId)) {
        const g = grants.find(g => g.id === grantId);
        entry.grantGroups.set(grantId, { grant: g, projects: [] });
      }
      entry.grantGroups.get(grantId).projects.push(p);
    }

    let grantColorIdx = 0;
    for (const [saId, { sa, grantGroups }] of studyAreaMap) {
      const saKey = `sa-${saId}`;
      rows.push({ type: 'study', sa, key: saKey });
      if (!collapsed.has(saKey)) {
        for (const [grantId, { grant, projects }] of grantGroups) {
          const gKey = `g-${saId}-${grantId}`;
          const popColor = POP_COLORS[grantColorIdx % POP_COLORS.length];
          grantColorIdx++;
          rows.push({ type: 'grant', grant, key: gKey, popColor });
          if (!collapsed.has(gKey)) {
            for (const p of projects) {
              rows.push({ type: 'project', project: p, key: `p-${p.id}`, grantPopColor: popColor });
            }
          }
        }
      }
    }
  } else if (viewMode === 'grant') {
    let grantColorIdx = 0;
    for (const g of grants) {
      const grantProjects = visibleProjects.filter(p => p.grant_id === g.id);
      if (grantProjects.length === 0 && visibleProjects.length > 0) continue;
      const gKey = `g-${g.id}`;
      const popColor = POP_COLORS[grantColorIdx % POP_COLORS.length];
      grantColorIdx++;
      rows.push({ type: 'grant', grant: g, key: gKey, popColor });
      if (!collapsed.has(gKey)) {
        for (const p of grantProjects) {
          rows.push({ type: 'project', project: p, key: `p-${p.id}`, grantPopColor: popColor });
        }
      }
    }
  } else {
    // All projects flat, sorted by start_date
    const sorted = [...visibleProjects].sort((a, b) => (a.start_date || '') < (b.start_date || '') ? -1 : 1);
    for (const p of sorted) {
      rows.push({ type: 'project', project: p, key: `p-${p.id}`, grantPopColor: POP_COLORS[0] });
    }
  }

  // ── Compute SVG height ────────────────────────────────────────────────────
  let svgH = HEADER_H;
  for (const row of rows) {
    if (row.type === 'study') svgH += STUDY_H;
    else if (row.type === 'grant') svgH += GROUP_H;
    else svgH += ROW_H;
  }
  svgH += 8; // bottom pad

  // ── Build row Y positions ─────────────────────────────────────────────────
  const rowYs = [];
  let y = HEADER_H;
  for (const row of rows) {
    rowYs.push(y);
    if (row.type === 'study') y += STUDY_H;
    else if (row.type === 'grant') y += GROUP_H;
    else y += ROW_H;
  }

  // ── Project bar helpers ───────────────────────────────────────────────────
  function getProjectBarRange(p) {
    const phases = p.phases || [];
    if (phases.length > 0) {
      const starts = phases.map(ph => ph.start_date).filter(Boolean);
      const ends = phases.map(ph => ph.end_date).filter(Boolean);
      if (starts.length && ends.length) {
        return { start: starts.sort()[0], end: ends.sort().reverse()[0], hasPhases: true };
      }
    }
    return { start: p.start_date, end: p.end_date, hasPhases: false };
  }

  // ── Dependency connectors ─────────────────────────────────────────────────
  function buildDependencyPaths() {
    if (viewMode !== 'study_area') return [];
    const paths = [];
    const projectRowMap = {};
    rows.forEach((row, i) => {
      if (row.type === 'project') projectRowMap[row.project.id] = i;
    });

    for (const dep of dependencies) {
      if (!visibleProjectIds.has(dep.upstream_project_id)) continue;
      if (!visibleProjectIds.has(dep.downstream_project_id)) continue;
      const upIdx = projectRowMap[dep.upstream_project_id];
      const downIdx = projectRowMap[dep.downstream_project_id];
      if (upIdx === undefined || downIdx === undefined) continue;

      const upProj = visibleProjects.find(p => p.id === dep.upstream_project_id);
      const downProj = visibleProjects.find(p => p.id === dep.downstream_project_id);
      if (!upProj || !downProj) continue;

      // Upstream: use milestone date if specified, else project end
      let upX;
      if (dep.upstream_milestone_id) {
        const ms = (upProj.milestones || []).find(m => m.id === dep.upstream_milestone_id);
        upX = ms ? scale.toX(parseDate(ms.target_date)) : null;
      }
      if (!upX) {
        const range = getProjectBarRange(upProj);
        upX = range.end ? scale.toX(parseDate(range.end)) : null;
      }
      if (!upX) continue;

      const downRange = getProjectBarRange(downProj);
      const downX = downRange.start ? scale.toX(parseDate(downRange.start)) : null;
      if (!downX) continue;

      const upY = rowYs[upIdx] + ROW_H / 2;
      const downY = rowYs[downIdx] + ROW_H / 2;

      // Warning: upstream end is after downstream start
      const isViolation = dep.upstream_milestone_id
        ? false
        : (upProj.end_date && downProj.start_date && upProj.end_date > downProj.start_date);

      const color = isViolation ? '#f97316' : '#94a3b8';

      // Curved path: right from upX, arc down, left to downX
      const midX = (upX + downX) / 2;
      const path = `M ${upX} ${upY} C ${upX + 20} ${upY}, ${midX} ${(upY + downY) / 2}, ${downX} ${downY}`;

      paths.push({
        path, color,
        label: dep.dependency_label || `Project ${dep.upstream_project_id} → ${dep.downstream_project_id}`,
        upX, upY, downX, downY, isViolation,
      });
    }
    return paths;
  }

  const depPaths = buildDependencyPaths();

  // ── Toggle collapse ───────────────────────────────────────────────────────
  const toggleCollapse = useCallback((key) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2">
      {/* Zoom controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex gap-1">
          {(['year', 'quarter', 'month']).map(z => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`px-2.5 py-1 text-xs rounded-full font-medium border transition-colors ${
                zoom === z
                  ? 'bg-brand-700 text-white border-brand-700'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {z.charAt(0).toUpperCase() + z.slice(1)}
            </button>
          ))}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
          {Object.entries(TYPE_COLORS).map(([k, c]) => (
            <span key={k} className="flex items-center gap-1">
              <span className="inline-block w-3 h-2 rounded-sm" style={{ background: c }} />
              {TYPE_LABELS[k]}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="inline-block w-0.5 h-3 bg-blue-500" style={{ borderLeft: '2px dashed #3b82f6' }} />
            Today
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-orange-400" />
            Dep. warning
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-slate-300" />
            Dep. ok
          </span>
        </div>
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        className="overflow-x-auto rounded border border-gray-200 bg-white select-none"
        aria-label="Program Gantt chart"
      >
        <svg
          width={Math.max(svgW, containerW)}
          height={svgH}
          style={{ display: 'block', minWidth: svgW }}
          onMouseLeave={() => setTip(null)}
        >
          {/* Background stripes for project rows */}
          {rows.map((row, i) => {
            if (row.type !== 'project') return null;
            return (
              <rect
                key={row.key + '-bg'}
                x={0}
                y={rowYs[i]}
                width={Math.max(svgW, containerW)}
                height={ROW_H}
                fill={i % 2 === 0 ? '#f9fafb' : '#ffffff'}
              />
            );
          })}

          {/* Month grid lines */}
          {monthTicks.map((tick, i) => {
            const x = scale.toX(tick);
            if (x < LABEL_W) return null;
            return (
              <line key={i} x1={x} y1={HEADER_H} x2={x} y2={svgH} stroke="#e5e7eb" strokeWidth={1} />
            );
          })}

          {/* Header */}
          <rect x={0} y={0} width={Math.max(svgW, containerW)} height={HEADER_H} fill="#f8fafc" />
          <line x1={0} y1={HEADER_H} x2={Math.max(svgW, containerW)} y2={HEADER_H} stroke="#e5e7eb" strokeWidth={1} />

          {monthTicks.map((tick, i) => {
            const x = scale.toX(tick);
            if (x < LABEL_W - 4) return null;
            const isJan = tick.getUTCMonth() === 0;
            const label = (i === 0 || isJan) ? monthLabel(tick) : shortMonthLabel(tick);
            return (
              <text key={i} x={x + 4} y={HEADER_H - 8} fontSize={10} fill="#6b7280" fontFamily="sans-serif">
                {label}
              </text>
            );
          })}

          {/* Grant PoP vertical lines (behind rows) */}
          {grants.map((g, gi) => {
            const popColor = POP_COLORS[gi % POP_COLORS.length];
            const px = g.end_date ? scale.toX(parseDate(g.end_date)) : null;
            if (!px || px < LABEL_W) return null;
            return (
              <g key={`pop-bg-${g.id}`}>
                <line
                  x1={px} y1={HEADER_H} x2={px} y2={svgH}
                  stroke={popColor} strokeWidth={1} strokeDasharray="4,3" opacity={0.35}
                />
              </g>
            );
          })}

          {/* Today line */}
          {todayX >= LABEL_W && (
            <g>
              <line x1={todayX} y1={HEADER_H} x2={todayX} y2={svgH} stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5,4" />
              <rect x={todayX - 16} y={2} width={32} height={16} rx={3} fill="#3b82f6" />
              <text x={todayX} y={14} fontSize={9} fill="#ffffff" textAnchor="middle" fontFamily="sans-serif">Today</text>
            </g>
          )}

          {/* Dependency connectors */}
          {depPaths.map((dep, i) => (
            <g key={`dep-${i}`}>
              <path
                d={dep.path}
                fill="none"
                stroke={dep.color}
                strokeWidth={1.5}
                strokeDasharray={dep.isViolation ? '4,2' : 'none'}
                opacity={0.7}
                onMouseEnter={(e) => setTip({ x: (dep.upX + dep.downX) / 2, y: (dep.upY + dep.downY) / 2, lines: [dep.label, dep.isViolation ? '⚠ Sequencing conflict' : ''] })}
                style={{ cursor: 'default' }}
              />
              {/* Arrow head at downX */}
              <polygon
                points={`${dep.downX},${dep.downY} ${dep.downX - 6},${dep.downY - 3} ${dep.downX - 6},${dep.downY + 3}`}
                fill={dep.color}
                opacity={0.7}
              />
            </g>
          ))}

          {/* Rows */}
          {rows.map((row, i) => {
            const y = rowYs[i];

            if (row.type === 'study') {
              const isCollapsed = collapsed.has(row.key);
              return (
                <g key={row.key} role="row" aria-label={`Study area: ${row.sa.name}`}>
                  <rect x={0} y={y} width={Math.max(svgW, containerW)} height={STUDY_H} fill="#e2e8f0" />
                  <line x1={0} y1={y} x2={Math.max(svgW, containerW)} y2={y} stroke="#cbd5e1" strokeWidth={1} />
                  <text
                    x={8} y={y + STUDY_H / 2 + 5}
                    fontSize={12} fontWeight="700" fill="#1e293b" fontFamily="sans-serif"
                  >
                    {row.sa.name}
                  </text>
                  {/* Collapse toggle */}
                  <g
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleCollapse(row.key)}
                    role="button"
                    aria-label={isCollapsed ? 'Expand study area' : 'Collapse study area'}
                  >
                    <text x={LABEL_W - 16} y={y + STUDY_H / 2 + 5} fontSize={11} fill="#64748b" fontFamily="sans-serif">
                      {isCollapsed ? '▼' : '▲'}
                    </text>
                  </g>
                </g>
              );
            }

            if (row.type === 'grant') {
              const g = row.grant;
              const isCollapsed = collapsed.has(row.key);
              const popX = g.end_date ? scale.toX(parseDate(g.end_date)) : null;
              const grantLabel = g.name.length > 28 ? g.name.slice(0, 27) + '…' : g.name;

              return (
                <g key={row.key} role="row" aria-label={`Grant: ${g.name}`}>
                  <rect x={0} y={y} width={Math.max(svgW, containerW)} height={GROUP_H} fill="#f1f5f9" />
                  <line x1={0} y1={y} x2={Math.max(svgW, containerW)} y2={y} stroke="#e2e8f0" strokeWidth={1} />
                  <text
                    x={12} y={y + GROUP_H / 2 + 4}
                    fontSize={11} fontWeight="600" fill="#374151" fontFamily="sans-serif"
                  >
                    {grantLabel}
                  </text>
                  {g.end_date && (
                    <text x={LABEL_W + 4} y={y + GROUP_H / 2 + 4} fontSize={9} fill={row.popColor} fontFamily="sans-serif">
                      PoP: {formatDateShort(g.end_date)}
                    </text>
                  )}
                  {/* PoP tick mark in grant header */}
                  {popX && popX >= LABEL_W && (
                    <g>
                      <line x1={popX} y1={y} x2={popX} y2={y + GROUP_H} stroke={row.popColor} strokeWidth={2} />
                      <rect x={popX - 18} y={y + 2} width={36} height={14} rx={2} fill={row.popColor} />
                      <text x={popX} y={y + 13} fontSize={8} fill="#fff" textAnchor="middle" fontFamily="sans-serif">
                        Grant PoP
                      </text>
                    </g>
                  )}
                  {/* Collapse toggle */}
                  <g
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleCollapse(row.key)}
                    role="button"
                    aria-label={isCollapsed ? 'Expand grant' : 'Collapse grant'}
                  >
                    <text x={LABEL_W - 16} y={y + GROUP_H / 2 + 4} fontSize={10} fill="#64748b" fontFamily="sans-serif">
                      {isCollapsed ? '▼' : '▲'}
                    </text>
                  </g>
                </g>
              );
            }

            // Project row
            const p = row.project;
            const range = getProjectBarRange(p);
            const barStart = range.start;
            const barEnd = range.end;
            const color = TYPE_COLORS[p.project_type] || TYPE_COLORS.custom;
            const nameLabel = p.name.length > 28 ? p.name.slice(0, 27) + '…' : p.name;

            let barX1 = barStart ? scale.toX(parseDate(barStart)) : null;
            let barX2 = barEnd ? scale.toX(parseDate(barEnd)) : null;
            const barW = barX1 && barX2 ? Math.max(barX2 - barX1, 4) : 0;
            const barY = y + 6;
            const barH = ROW_H - 12;

            return (
              <g
                key={row.key}
                role="row"
                aria-label={`Project: ${p.name}`}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/admin/projects/${p.id}?tab=schedule`)}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.closest('svg').getBoundingClientRect();
                  setTip({
                    x: barX1 ? barX1 + barW / 2 : LABEL_W + 20,
                    y: y + ROW_H / 2,
                    lines: [
                      p.name,
                      `Grant: ${p.grantName || ''}`,
                      `Type: ${TYPE_LABELS[p.project_type] || p.project_type}`,
                      barStart && barEnd ? `${formatDateShort(barStart)} – ${formatDateShort(barEnd)}` : 'No dates',
                    ].filter(Boolean),
                  });
                }}
                onMouseLeave={() => setTip(null)}
              >
                {/* Label */}
                <text
                  x={LABEL_W - 6}
                  y={y + ROW_H / 2 + 4}
                  fontSize={11}
                  fill="#374151"
                  textAnchor="end"
                  fontFamily="sans-serif"
                >
                  {nameLabel}
                </text>

                {/* Bar */}
                {barX1 && barX2 && (
                  range.hasPhases ? (
                    <rect
                      x={barX1}
                      y={barY}
                      width={barW}
                      height={barH}
                      rx={3}
                      fill={color + '33'}
                      stroke={color}
                      strokeWidth={1.5}
                      aria-label={`${p.name} bar`}
                    />
                  ) : (
                    <rect
                      x={barX1}
                      y={barY}
                      width={barW}
                      height={barH}
                      rx={3}
                      fill="none"
                      stroke="#9ca3af"
                      strokeWidth={1.5}
                      strokeDasharray="5,3"
                      aria-label={`${p.name} bar (no schedule)`}
                    />
                  )
                )}

                {/* "no schedule" label */}
                {!range.hasPhases && barX1 && barW > 30 && (
                  <text
                    x={barX1 + 4}
                    y={barY + barH / 2 + 4}
                    fontSize={9}
                    fill="#9ca3af"
                    fontFamily="sans-serif"
                    fontStyle="italic"
                    style={{ pointerEvents: 'none' }}
                  >
                    no schedule
                  </text>
                )}

                {/* Milestone diamonds */}
                {(p.milestones || []).map((ms) => {
                  const mx = scale.toX(parseDate(ms.target_date));
                  const isKey = Number(ms.is_key_decision) === 1;
                  const isPop = Number(ms.is_pop_anchor) === 1;
                  const fill = isPop ? '#0e9e8e' : isKey ? '#f59e0b' : '#3b82f6';
                  return (
                    <g key={ms.id}
                      onMouseEnter={() => setTip({
                        x: mx,
                        y: y,
                        lines: [ms.label, formatDateShort(ms.target_date), isPop ? 'PoP Anchor' : isKey ? 'Key Decision' : ''],
                      })}
                      onMouseLeave={() => setTip(null)}
                    >
                      <Diamond cx={mx} cy={y + ROW_H / 2} size={5} fill={fill} stroke={fill} />
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Label column overlay */}
          <rect x={0} y={0} width={LABEL_W} height={svgH} fill="rgba(248,250,252,0.92)" />
          <line x1={LABEL_W} y1={0} x2={LABEL_W} y2={svgH} stroke="#e5e7eb" strokeWidth={1} />
          <rect x={0} y={0} width={LABEL_W} height={HEADER_H} fill="#f1f5f9" />

          {/* Re-render labels on top of overlay */}
          {rows.map((row, i) => {
            const y = rowYs[i];
            if (row.type === 'study') {
              const isCollapsed = collapsed.has(row.key);
              return (
                <g key={row.key + '-label'}>
                  <rect x={0} y={y} width={LABEL_W} height={STUDY_H} fill="#e2e8f0" />
                  <text x={8} y={y + STUDY_H / 2 + 5} fontSize={12} fontWeight="700" fill="#1e293b" fontFamily="sans-serif">
                    {row.sa.name.length > 24 ? row.sa.name.slice(0, 23) + '…' : row.sa.name}
                  </text>
                  <g style={{ cursor: 'pointer' }} onClick={() => toggleCollapse(row.key)}>
                    <text x={LABEL_W - 16} y={y + STUDY_H / 2 + 5} fontSize={11} fill="#64748b" fontFamily="sans-serif">
                      {isCollapsed ? '▼' : '▲'}
                    </text>
                  </g>
                </g>
              );
            }
            if (row.type === 'grant') {
              const g = row.grant;
              const isCollapsed = collapsed.has(row.key);
              const grantLabel = g.name.length > 26 ? g.name.slice(0, 25) + '…' : g.name;
              return (
                <g key={row.key + '-label'}>
                  <rect x={0} y={y} width={LABEL_W} height={GROUP_H} fill="#f1f5f9" />
                  <text x={12} y={y + GROUP_H / 2 + 4} fontSize={11} fontWeight="600" fill="#374151" fontFamily="sans-serif">
                    {grantLabel}
                  </text>
                  <g style={{ cursor: 'pointer' }} onClick={() => toggleCollapse(row.key)}>
                    <text x={LABEL_W - 16} y={y + GROUP_H / 2 + 4} fontSize={10} fill="#64748b" fontFamily="sans-serif">
                      {isCollapsed ? '▼' : '▲'}
                    </text>
                  </g>
                </g>
              );
            }
            // Project label
            const p = row.project;
            const nameLabel = p.name.length > 28 ? p.name.slice(0, 27) + '…' : p.name;
            return (
              <g key={row.key + '-label'} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/projects/${p.id}?tab=schedule`)}>
                <rect x={0} y={y} width={LABEL_W} height={ROW_H} fill="transparent" />
                <text x={LABEL_W - 6} y={y + ROW_H / 2 + 4} fontSize={11} fill="#374151" textAnchor="end" fontFamily="sans-serif">
                  {nameLabel}
                </text>
              </g>
            );
          })}

          {/* Tooltip (on top of everything) */}
          {tip && <Tooltip tip={tip} svgW={Math.max(svgW, containerW)} />}

          {/* Border */}
          <rect x={0} y={0} width={Math.max(svgW, containerW)} height={svgH} fill="none" stroke="#e5e7eb" strokeWidth={1} />
        </svg>
      </div>
    </div>
  );
}
