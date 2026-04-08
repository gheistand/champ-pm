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
  const step = zoom === 'year' ? 3 : 1;
  const d = new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), 1));
  while (d <= maxDate) {
    ticks.push(new Date(d));
    d.setUTCMonth(d.getUTCMonth() + step);
  }
  return ticks;
}

// Scale: toX returns pixels from the left edge of the chart area (no label offset)
function makeScale(minDate, pxPerDay) {
  return {
    toX: (date) => diffDays(minDate, date) * pxPerDay,
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
  const chartScrollRef = useRef(null); // right scroll area — observed for width
  const labelScrollRef = useRef(null); // label rows — scroll synced to chart
  const [containerW, setContainerW] = useState(900);
  const [zoom, setZoom] = useState('quarter'); // 'year' | 'quarter' | 'month'
  const [collapsed, setCollapsed] = useState(new Set());
  const [tip, setTip] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!chartScrollRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerW(entry.contentRect.width || 900);
    });
    ro.observe(chartScrollRef.current);
    return () => ro.disconnect();
  }, []);

  // Sync vertical scroll: chart drives label column
  const syncScroll = useCallback((e) => {
    if (labelScrollRef.current) {
      labelScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
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
  // containerW is now just the right chart area width (no label column)
  const timelineW = Math.max(containerW, 400);
  const autoScale = timelineW / totalDays;
  const pxPerDay = Math.max(PX_PER_DAY_BASE, autoScale);
  const svgTimelineW = totalDays * pxPerDay;
  // SVG width is timeline only — label column is HTML, not SVG
  const svgW = svgTimelineW;

  const scale = makeScale(minDate, pxPerDay);
  const todayX = scale.toX(today);
  const monthTicks = getMonthTicks(minDate, maxDate, zoom);

  // ── Build rows based on viewMode ──────────────────────────────────────────
  const rows = [];

  if (viewMode === 'study_area') {
    const studyAreaMap = new Map();
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
    const sorted = [...visibleProjects].sort((a, b) => (a.start_date || '') < (b.start_date || '') ? -1 : 1);
    for (const p of sorted) {
      rows.push({ type: 'project', project: p, key: `p-${p.id}`, grantPopColor: POP_COLORS[0] });
    }
  }

  // ── Row Y positions (SVG body — y=0 is top of body, no header offset) ─────
  const rowYs = [];
  let yAcc = 0;
  for (const row of rows) {
    rowYs.push(yAcc);
    if (row.type === 'study') yAcc += STUDY_H;
    else if (row.type === 'grant') yAcc += GROUP_H;
    else yAcc += ROW_H;
  }
  const svgBodyH = yAcc + 8; // bottom pad

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

      const isViolation = dep.upstream_milestone_id
        ? false
        : (upProj.end_date && downProj.start_date && upProj.end_date > downProj.start_date);

      const color = isViolation ? '#f97316' : '#94a3b8';
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
    <div className="flex flex-col h-full min-h-0 gap-2">

      {/* Main chart area — flex row: label column + scrollable chart */}
      <div className="flex flex-1 min-h-0 overflow-hidden border border-gray-200 rounded bg-white">

        {/* ── Left: sticky label column ─────────────────────────────────── */}
        <div
          className="flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden z-20"
          style={{ width: LABEL_W }}
        >
          {/* Header cell — zoom controls, matches timeline header height */}
          <div
            className="flex-shrink-0 bg-gray-100 border-b border-gray-200 flex items-center px-2 gap-1"
            style={{ height: HEADER_H }}
          >
            {(['year', 'quarter', 'month']).map(z => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={`px-2 py-0.5 text-xs rounded-full font-medium border transition-colors ${
                  zoom === z
                    ? 'bg-brand-700 text-white border-brand-700'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {z.charAt(0).toUpperCase() + z.slice(1)}
              </button>
            ))}
          </div>

          {/* Label rows — overflowY hidden, scrollTop synced to chart */}
          <div ref={labelScrollRef} style={{ overflowY: 'hidden', flex: 1 }}>
            {rows.map((row, i) => {
              if (row.type === 'study') {
                const isCollapsed = collapsed.has(row.key);
                return (
                  <div
                    key={row.key}
                    style={{ height: STUDY_H, flexShrink: 0 }}
                    className="flex items-center px-2 bg-slate-200 border-b border-slate-300 select-none"
                  >
                    <span className="flex-1 text-xs font-bold text-slate-800 truncate">
                      {row.sa.name}
                    </span>
                    <button
                      onClick={() => toggleCollapse(row.key)}
                      className="ml-1 text-slate-500 hover:text-slate-700 text-xs flex-shrink-0"
                      aria-label={isCollapsed ? 'Expand study area' : 'Collapse study area'}
                    >
                      {isCollapsed ? '▼' : '▲'}
                    </button>
                  </div>
                );
              }

              if (row.type === 'grant') {
                const isCollapsed = collapsed.has(row.key);
                return (
                  <div
                    key={row.key}
                    style={{ height: GROUP_H, flexShrink: 0 }}
                    className="flex items-center px-3 bg-slate-100 border-b border-slate-200 select-none"
                  >
                    <span className="flex-1 text-xs font-semibold text-gray-700 truncate">
                      {row.grant.name}
                    </span>
                    <button
                      onClick={() => toggleCollapse(row.key)}
                      className="ml-1 text-slate-500 hover:text-slate-700 text-xs flex-shrink-0"
                      aria-label={isCollapsed ? 'Expand grant' : 'Collapse grant'}
                    >
                      {isCollapsed ? '▼' : '▲'}
                    </button>
                  </div>
                );
              }

              // Project row
              const p = row.project;
              const rowBg = i % 2 === 0 ? '#f9fafb' : '#ffffff';
              return (
                <div
                  key={row.key}
                  style={{ height: ROW_H, flexShrink: 0, background: rowBg }}
                  className="flex items-center px-3 border-b border-gray-100 cursor-pointer hover:bg-blue-50 select-none"
                  onClick={() => navigate(`/admin/projects/${p.id}?tab=schedule`)}
                >
                  <span className="text-xs text-gray-700 truncate w-full text-right">
                    {p.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: scrollable chart area ──────────────────────────────── */}
        <div
          ref={chartScrollRef}
          className="flex-1 overflow-auto"
          onScroll={syncScroll}
        >
          {/* Sticky timeline header */}
          <div
            className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200"
            style={{ height: HEADER_H, minWidth: Math.max(svgW, containerW), position: 'relative' }}
          >
            {/* Month tick labels */}
            {monthTicks.map((tick, i) => {
              const x = scale.toX(tick);
              const isJan = tick.getUTCMonth() === 0;
              const label = (i === 0 || isJan) ? monthLabel(tick) : shortMonthLabel(tick);
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: x + 4,
                    bottom: 8,
                    fontSize: 10,
                    color: '#6b7280',
                    whiteSpace: 'nowrap',
                    fontFamily: 'sans-serif',
                    pointerEvents: 'none',
                  }}
                >
                  {label}
                </div>
              );
            })}

            {/* Today bubble in header */}
            {todayX >= 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: todayX - 16,
                  top: 2,
                  width: 32,
                  height: 16,
                  background: '#3b82f6',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  color: '#fff',
                  pointerEvents: 'none',
                  fontFamily: 'sans-serif',
                }}
              >
                Today
              </div>
            )}
          </div>

          {/* Chart SVG body — no header, no label column */}
          <svg
            width={Math.max(svgW, containerW)}
            height={svgBodyH}
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
              return (
                <line key={i} x1={x} y1={0} x2={x} y2={svgBodyH} stroke="#e5e7eb" strokeWidth={1} />
              );
            })}

            {/* Grant PoP vertical lines (behind rows) */}
            {grants.map((g, gi) => {
              const popColor = POP_COLORS[gi % POP_COLORS.length];
              const px = g.end_date ? scale.toX(parseDate(g.end_date)) : null;
              if (!px) return null;
              return (
                <g key={`pop-bg-${g.id}`}>
                  <line
                    x1={px} y1={0} x2={px} y2={svgBodyH}
                    stroke={popColor} strokeWidth={1} strokeDasharray="4,3" opacity={0.35}
                  />
                </g>
              );
            })}

            {/* Today line */}
            {todayX >= 0 && (
              <line
                x1={todayX} y1={0} x2={todayX} y2={svgBodyH}
                stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5,4"
              />
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
                  onMouseEnter={() => setTip({
                    x: (dep.upX + dep.downX) / 2,
                    y: (dep.upY + dep.downY) / 2,
                    lines: [dep.label, dep.isViolation ? '⚠ Sequencing conflict' : ''].filter(Boolean),
                  })}
                  style={{ cursor: 'default' }}
                />
                <polygon
                  points={`${dep.downX},${dep.downY} ${dep.downX - 6},${dep.downY - 3} ${dep.downX - 6},${dep.downY + 3}`}
                  fill={dep.color}
                  opacity={0.7}
                />
              </g>
            ))}

            {/* Rows — bars and milestones only (labels are in HTML column) */}
            {rows.map((row, i) => {
              const y = rowYs[i];

              if (row.type === 'study') {
                return (
                  <g key={row.key}>
                    <rect x={0} y={y} width={Math.max(svgW, containerW)} height={STUDY_H} fill="#e2e8f0" />
                    <line x1={0} y1={y} x2={Math.max(svgW, containerW)} y2={y} stroke="#cbd5e1" strokeWidth={1} />
                  </g>
                );
              }

              if (row.type === 'grant') {
                const g = row.grant;
                const popX = g.end_date ? scale.toX(parseDate(g.end_date)) : null;
                return (
                  <g key={row.key}>
                    <rect x={0} y={y} width={Math.max(svgW, containerW)} height={GROUP_H} fill="#f1f5f9" />
                    <line x1={0} y1={y} x2={Math.max(svgW, containerW)} y2={y} stroke="#e2e8f0" strokeWidth={1} />
                    {g.end_date && (
                      <text x={4} y={y + GROUP_H / 2 + 4} fontSize={9} fill={row.popColor} fontFamily="sans-serif">
                        PoP: {formatDateShort(g.end_date)}
                      </text>
                    )}
                    {popX != null && (
                      <g>
                        <line x1={popX} y1={y} x2={popX} y2={y + GROUP_H} stroke={row.popColor} strokeWidth={2} />
                        <rect x={popX - 18} y={y + 2} width={36} height={14} rx={2} fill={row.popColor} />
                        <text x={popX} y={y + 13} fontSize={8} fill="#fff" textAnchor="middle" fontFamily="sans-serif">
                          Grant PoP
                        </text>
                      </g>
                    )}
                  </g>
                );
              }

              // Project row
              const p = row.project;
              const range = getProjectBarRange(p);
              const barStart = range.start;
              const barEnd = range.end;
              const color = TYPE_COLORS[p.project_type] || TYPE_COLORS.custom;

              const barX1 = barStart ? scale.toX(parseDate(barStart)) : null;
              const barX2 = barEnd ? scale.toX(parseDate(barEnd)) : null;
              const barW = barX1 != null && barX2 != null ? Math.max(barX2 - barX1, 4) : 0;
              const barY = y + 6;
              const barH = ROW_H - 12;

              return (
                <g
                  key={row.key}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/admin/projects/${p.id}?tab=schedule`)}
                  onMouseEnter={() => {
                    setTip({
                      x: barX1 != null ? barX1 + barW / 2 : 20,
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
                  {/* Bar */}
                  {barX1 != null && barX2 != null && (
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
                  {!range.hasPhases && barX1 != null && barW > 30 && (
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
                      <g
                        key={ms.id}
                        onMouseEnter={() => setTip({
                          x: mx,
                          y,
                          lines: [ms.label, formatDateShort(ms.target_date), isPop ? 'PoP Anchor' : isKey ? 'Key Decision' : ''].filter(Boolean),
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

            {/* Tooltip (on top of everything) */}
            {tip && <Tooltip tip={tip} svgW={Math.max(svgW, containerW)} />}
          </svg>
        </div>
      </div>

      {/* Legend — below chart, always visible */}
      <div className="flex-shrink-0 flex items-center gap-3 text-xs text-gray-500 flex-wrap px-1">
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
  );
}
