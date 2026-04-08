import { useRef, useState, useCallback, useEffect } from 'react';

// ── constants ────────────────────────────────────────────────────────────────
const LABEL_W = 190;
const ROW_H = 34;
const HEADER_H = 44;
const MILESTONE_H = 80;
const MIN_PX_PER_DAY = 1.5;
const TARGET_CHART_W = 900;
const PADDING_DAYS = 14;

const PHASE_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6',
];

const MS_PER_DAY = 86400000;

function parseDate(str) {
  if (!str) return null;
  return new Date(str + 'T00:00:00Z');
}

function toISODate(d) {
  return d.toISOString().slice(0, 10);
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

// ── date-to-pixel helpers (depend on scale/offset) ───────────────────────────
function makeScale(minDate, pxPerDay) {
  return {
    toX: (date) => LABEL_W + diffDays(minDate, date) * pxPerDay,
    toDate: (x) => addDays(minDate, (x - LABEL_W) / pxPerDay),
    pxPerDay,
  };
}

// ── month tick marks ─────────────────────────────────────────────────────────
function getMonthTicks(minDate, maxDate) {
  const ticks = [];
  const d = new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), 1));
  while (d <= maxDate) {
    ticks.push(new Date(d));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return ticks;
}

// ── diamond shape ────────────────────────────────────────────────────────────
function Diamond({ cx, cy, size, fill, stroke, strokeWidth = 1.5 }) {
  const pts = `${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`;
  return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
}

// ── main component ───────────────────────────────────────────────────────────
export default function GanttChart({
  phases = [],
  milestones = [],
  popDate,
  todayDate,
  readOnly = true,
  onPhaseChange,
  onMilestoneChange,
  // Compare overlay props
  basePhases = [],
  baseMilestones = [],
  compareMode = false,
  baseLabel = 'Base Plan',
}) {
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(TARGET_CHART_W);
  const dragging = useRef(null);
  const [dragPreview, setDragPreview] = useState(null); // { phaseId, start_date, end_date }

  // Observe container width for responsiveness
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerW(entry.contentRect.width || TARGET_CHART_W);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── date range ────────────────────────────────────────────────────────────
  const allDates = [
    ...phases.map(p => parseDate(p.start_date)),
    ...phases.map(p => parseDate(p.end_date)),
    ...milestones.map(m => parseDate(m.target_date)),
    ...(compareMode ? basePhases.map(p => parseDate(p.start_date)) : []),
    ...(compareMode ? basePhases.map(p => parseDate(p.end_date)) : []),
    ...(compareMode ? baseMilestones.map(m => parseDate(m.target_date)) : []),
    popDate ? parseDate(popDate) : null,
    todayDate ? parseDate(todayDate) : null,
  ].filter(Boolean);

  if (allDates.length === 0) {
    return (
      <div className="card p-8 text-center text-gray-400 text-sm">
        No schedule data to display.
      </div>
    );
  }

  const rawMin = new Date(Math.min(...allDates.map(d => d.getTime())));
  const rawMax = new Date(Math.max(...allDates.map(d => d.getTime())));
  const minDate = addDays(rawMin, -PADDING_DAYS);
  const maxDate = addDays(rawMax, PADDING_DAYS);
  const totalDays = diffDays(minDate, maxDate);

  const timelineW = Math.max(containerW - LABEL_W, 400);
  const pxPerDay = Math.max(MIN_PX_PER_DAY, timelineW / totalDays);
  const svgW = LABEL_W + totalDays * pxPerDay;
  const svgH = HEADER_H + phases.length * ROW_H + MILESTONE_H;

  const scale = makeScale(minDate, pxPerDay);

  // ── drag handlers ─────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e, phase, edge) => {
    if (readOnly) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = {
      phaseId: phase.id,
      edge,
      startClientX: e.clientX,
      origStart: phase.start_date,
      origEnd: phase.end_date,
    };
    setDragPreview({ phaseId: phase.id, start_date: phase.start_date, end_date: phase.end_date });
  }, [readOnly]);

  const handlePointerMove = useCallback((e) => {
    if (!dragging.current) return;
    const { phaseId, edge, startClientX, origStart, origEnd } = dragging.current;
    const dx = e.clientX - startClientX;
    const daysDelta = Math.round(dx / scale.pxPerDay);

    let newStart = origStart;
    let newEnd = origEnd;

    if (edge === 'start') {
      const d = addDays(parseDate(origStart), daysDelta);
      newStart = toISODate(d);
    } else if (edge === 'end') {
      const d = addDays(parseDate(origEnd), daysDelta);
      newEnd = toISODate(d);
    } else {
      // move whole bar
      const ds = addDays(parseDate(origStart), daysDelta);
      const de = addDays(parseDate(origEnd), daysDelta);
      newStart = toISODate(ds);
      newEnd = toISODate(de);
    }

    // Prevent going past popDate
    if (popDate && newEnd > popDate) newEnd = popDate;
    if (newStart > newEnd) newStart = newEnd;

    setDragPreview({ phaseId, start_date: newStart, end_date: newEnd });
  }, [scale.pxPerDay, popDate]);

  const handlePointerUp = useCallback(() => {
    if (!dragging.current || !dragPreview) { dragging.current = null; return; }
    const { phaseId } = dragging.current;
    const { start_date, end_date } = dragPreview;
    const durDays = diffDays(parseDate(start_date), parseDate(end_date));
    onPhaseChange && onPhaseChange(phaseId, { start_date, end_date, duration_days: durDays });
    dragging.current = null;
    setDragPreview(null);
  }, [dragPreview, onPhaseChange]);

  // ── month ticks ───────────────────────────────────────────────────────────
  const monthTicks = getMonthTicks(minDate, maxDate);
  const showYear = (tick, i) => i === 0 || tick.getUTCMonth() === 0;

  // ── pop and today lines ───────────────────────────────────────────────────
  const popX = popDate ? scale.toX(parseDate(popDate)) : null;
  const todayX = todayDate ? scale.toX(parseDate(todayDate)) : null;

  // ── build a lookup of base phases by id for compare overlay ──────────────
  const basePhaseMap = compareMode
    ? Object.fromEntries(basePhases.map(p => [p.id, p]))
    : {};
  const baseMilestoneMap = compareMode
    ? Object.fromEntries(baseMilestones.map(m => [m.id, m]))
    : {};

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="overflow-x-auto rounded border border-gray-200 bg-white select-none">
      <svg
        width={svgW}
        height={svgH}
        style={{ display: 'block', minWidth: svgW }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* ── background stripes ─────────────────────────────────────── */}
        {phases.map((_, i) => (
          <rect
            key={i}
            x={0}
            y={HEADER_H + i * ROW_H}
            width={svgW}
            height={ROW_H}
            fill={i % 2 === 0 ? '#f9fafb' : '#ffffff'}
          />
        ))}
        <rect x={0} y={HEADER_H + phases.length * ROW_H} width={svgW} height={MILESTONE_H} fill="#f0f9ff" />

        {/* ── PoP column highlight ───────────────────────────────────── */}
        {popX !== null && (
          <rect x={popX} y={0} width={Math.max(1, svgW - popX)} height={svgH} fill="rgba(239,68,68,0.04)" />
        )}

        {/* ── month grid lines ──────────────────────────────────────── */}
        {monthTicks.map((tick, i) => {
          const x = scale.toX(tick);
          if (x < LABEL_W) return null;
          return (
            <line key={i} x1={x} y1={HEADER_H} x2={x} y2={svgH} stroke="#e5e7eb" strokeWidth={1} />
          );
        })}

        {/* ── header: month labels ──────────────────────────────────── */}
        <rect x={0} y={0} width={svgW} height={HEADER_H} fill="#f8fafc" />
        <line x1={0} y1={HEADER_H} x2={svgW} y2={HEADER_H} stroke="#e5e7eb" strokeWidth={1} />

        {monthTicks.map((tick, i) => {
          const x = scale.toX(tick);
          if (x < LABEL_W - 4) return null;
          const label = showYear(tick, i) ? monthLabel(tick) : shortMonthLabel(tick);
          return (
            <text key={i} x={x + 4} y={HEADER_H - 6} fontSize={10} fill="#6b7280" fontFamily="sans-serif">
              {label}
            </text>
          );
        })}

        {/* ── label column background ───────────────────────────────── */}
        <rect x={0} y={0} width={LABEL_W} height={svgH} fill="#f8fafc" />
        <line x1={LABEL_W} y1={0} x2={LABEL_W} y2={svgH} stroke="#e5e7eb" strokeWidth={1} />
        <rect x={0} y={0} width={LABEL_W} height={HEADER_H} fill="#f1f5f9" />

        {/* ── compare overlay legend ────────────────────────────────── */}
        {compareMode && (
          <g>
            <rect x={svgW - 130} y={5} width={122} height={34} rx={3} fill="white" stroke="#e5e7eb" strokeWidth={1} opacity={0.95} />
            <rect x={svgW - 122} y={11} width={10} height={8} rx={1} fill="#6b7280" opacity={0.4} />
            <text x={svgW - 108} y={19} fontSize={9} fill="#6b7280" fontFamily="sans-serif">{baseLabel}</text>
            <rect x={svgW - 122} y={24} width={10} height={8} rx={1} fill="#3b82f6" opacity={0.85} />
            <text x={svgW - 108} y={32} fontSize={9} fill="#374151" fontFamily="sans-serif">Scenario</text>
          </g>
        )}

        {/* ── ghost base phase bars (compare mode only) ─────────────── */}
        {compareMode && phases.map((phase, i) => {
          const base = basePhaseMap[phase.id];
          if (!base) return null;
          const baseStart = base.start_date;
          const baseEnd = base.end_date;
          const preview = dragPreview && dragPreview.phaseId === phase.id ? dragPreview : null;
          const scenStart = preview ? preview.start_date : phase.start_date;
          const scenEnd = preview ? preview.end_date : phase.end_date;

          // Skip ghost if dates are identical
          if (baseStart === scenStart && baseEnd === scenEnd) return null;

          const bx1 = scale.toX(parseDate(baseStart));
          const bx2 = scale.toX(parseDate(baseEnd));
          const barW = Math.max(bx2 - bx1, 4);
          const y = HEADER_H + i * ROW_H;
          const barY = y + 9;
          const barH = ROW_H - 18;

          // Delta annotations
          const startDelta = diffDays(parseDate(baseStart), parseDate(scenStart));
          const endDelta = diffDays(parseDate(baseEnd), parseDate(scenEnd));
          const deltaLabel = endDelta !== 0
            ? (endDelta > 0 ? `+${endDelta}d` : `${endDelta}d`)
            : startDelta !== 0 ? (startDelta > 0 ? `+${startDelta}d start` : `${startDelta}d start`) : null;

          return (
            <g key={`ghost-${phase.id}`}>
              <rect
                x={bx1}
                y={barY}
                width={barW}
                height={barH}
                rx={2}
                fill="#9ca3af"
                stroke="#6b7280"
                strokeWidth={1}
                strokeDasharray="3,2"
                opacity={0.4}
              />
              {deltaLabel && (
                <text
                  x={(bx1 + bx2) / 2}
                  y={barY - 2}
                  fontSize={8}
                  fill={endDelta > 0 ? '#d97706' : '#059669'}
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  {deltaLabel}
                </text>
              )}
            </g>
          );
        })}

        {/* ── phase rows ────────────────────────────────────────────── */}
        {phases.map((phase, i) => {
          const preview = dragPreview && dragPreview.phaseId === phase.id ? dragPreview : null;
          const startDate = preview ? preview.start_date : phase.start_date;
          const endDate = preview ? preview.end_date : phase.end_date;

          const x1 = scale.toX(parseDate(startDate));
          const x2 = scale.toX(parseDate(endDate));
          const barW = Math.max(x2 - x1, 4);
          const y = HEADER_H + i * ROW_H;
          const barY = y + 7;
          const barH = ROW_H - 14;

          const color = PHASE_COLORS[i % PHASE_COLORS.length];
          const isPastPoP = popDate && endDate > popDate;
          const barFill = isPastPoP ? '#fb923c' : color + '33'; // orange or brand tint
          const barStroke = isPastPoP ? '#ea580c' : color;

          return (
            <g key={phase.id}>
              {/* Row label */}
              <text
                x={LABEL_W - 8}
                y={y + ROW_H / 2 + 4}
                fontSize={11}
                fill="#374151"
                textAnchor="end"
                fontFamily="sans-serif"
              >
                {phase.label.length > 22 ? phase.label.slice(0, 21) + '…' : phase.label}
              </text>

              {/* Phase bar */}
              <rect
                x={x1}
                y={barY}
                width={barW}
                height={barH}
                rx={3}
                fill={barFill}
                stroke={barStroke}
                strokeWidth={1.5}
                style={!readOnly ? { cursor: 'move' } : {}}
                onPointerDown={!readOnly ? (e) => handleDragStart(e, { ...phase, start_date: startDate, end_date: endDate }, 'move') : undefined}
              />

              {/* Label inside bar */}
              {barW > 30 && (
                <text
                  x={x1 + 4}
                  y={barY + barH / 2 + 4}
                  fontSize={10}
                  fill={isPastPoP ? '#7c2d12' : '#1e3a5f'}
                  fontFamily="sans-serif"
                  style={{ pointerEvents: 'none' }}
                >
                  {phase.label.length > Math.floor(barW / 6) ? phase.label.slice(0, Math.floor(barW / 6)) + '…' : phase.label}
                </text>
              )}

              {/* Warning icon if past PoP */}
              {isPastPoP && (
                <text x={x2 + 3} y={barY + barH / 2 + 4} fontSize={11} fill="#ea580c" fontFamily="sans-serif">⚠</text>
              )}

              {/* Drag handles (edit mode) */}
              {!readOnly && (
                <>
                  <rect
                    x={x1}
                    y={barY}
                    width={8}
                    height={barH}
                    rx={2}
                    fill={barStroke}
                    opacity={0.7}
                    style={{ cursor: 'ew-resize' }}
                    onPointerDown={(e) => handleDragStart(e, { ...phase, start_date: startDate, end_date: endDate }, 'start')}
                  />
                  <rect
                    x={x2 - 8}
                    y={barY}
                    width={8}
                    height={barH}
                    rx={2}
                    fill={barStroke}
                    opacity={0.7}
                    style={{ cursor: 'ew-resize' }}
                    onPointerDown={(e) => handleDragStart(e, { ...phase, start_date: startDate, end_date: endDate }, 'end')}
                  />
                </>
              )}
            </g>
          );
        })}

        {/* ── milestone row label ───────────────────────────────────── */}
        <text
          x={LABEL_W - 8}
          y={HEADER_H + phases.length * ROW_H + 14}
          fontSize={10}
          fill="#6b7280"
          textAnchor="end"
          fontFamily="sans-serif"
          fontStyle="italic"
        >
          Milestones
        </text>

        {/* ── ghost base milestones (compare mode only) ─────────────── */}
        {compareMode && milestones.map((ms) => {
          const base = baseMilestoneMap[ms.id];
          if (!base) return null;
          const baseDate = base.target_date;
          const scenDate = ms.target_date;
          if (baseDate === scenDate) return null;

          const bx = scale.toX(parseDate(baseDate));
          const bandY = HEADER_H + phases.length * ROW_H;
          const cy = bandY + MILESTONE_H / 2;

          return (
            <g key={`ghost-ms-${ms.id}`} opacity={0.4}>
              <Diamond cx={bx} cy={cy} size={5} fill="#9ca3af" stroke="#6b7280" strokeWidth={1} />
            </g>
          );
        })}

        {/* ── milestones ────────────────────────────────────────────── */}
        {milestones.map((ms, i) => {
          const x = scale.toX(parseDate(ms.target_date));
          const bandY = HEADER_H + phases.length * ROW_H;
          const cy = bandY + MILESTONE_H / 2;
          const isKey = Number(ms.is_key_decision) === 1;
          const isPop = Number(ms.is_pop_anchor) === 1;
          const size = isKey ? 9 : 7;
          const fill = isPop ? '#ef4444' : isKey ? '#f59e0b' : '#3b82f6';
          const labelAbove = i % 2 === 0;
          const labelY = labelAbove ? bandY + 10 : bandY + MILESTONE_H - 6;

          return (
            <g key={ms.id}>
              <Diamond cx={x} cy={cy} size={size} fill={fill} stroke={fill} />
              {/* PoP anchor: small circle below diamond */}
              {isPop && (
                <circle cx={x} cy={cy + size + 5} r={4} fill="none" stroke="#ef4444" strokeWidth={1.5} />
              )}
              <text
                x={x}
                y={labelY}
                fontSize={9}
                fill="#374151"
                textAnchor="middle"
                fontFamily="sans-serif"
                fontWeight={isKey ? '600' : '400'}
              >
                {ms.label.length > 18 ? ms.label.slice(0, 17) + '…' : ms.label}
              </text>
              {/* Vertical tick from axis to diamond */}
              <line
                x1={x}
                y1={bandY}
                x2={x}
                y2={cy - size}
                stroke={fill}
                strokeWidth={1}
                strokeDasharray="2,2"
                opacity={0.5}
              />
            </g>
          );
        })}

        {/* ── today line ────────────────────────────────────────────── */}
        {todayX !== null && todayX >= LABEL_W && (
          <g>
            <line x1={todayX} y1={HEADER_H} x2={todayX} y2={svgH} stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5,4" />
            <rect x={todayX - 16} y={2} width={32} height={16} rx={3} fill="#3b82f6" />
            <text x={todayX} y={14} fontSize={9} fill="#ffffff" textAnchor="middle" fontFamily="sans-serif">Today</text>
          </g>
        )}

        {/* ── PoP line ──────────────────────────────────────────────── */}
        {popX !== null && popX >= LABEL_W && (
          <g>
            <line x1={popX} y1={HEADER_H} x2={popX} y2={svgH} stroke="#ef4444" strokeWidth={2} />
            <rect x={popX - 22} y={2} width={44} height={16} rx={3} fill="#ef4444" />
            <text x={popX} y={14} fontSize={9} fill="#ffffff" textAnchor="middle" fontFamily="sans-serif">Grant PoP</text>
          </g>
        )}

        {/* ── border ────────────────────────────────────────────────── */}
        <rect x={0} y={0} width={svgW} height={svgH} fill="none" stroke="#e5e7eb" strokeWidth={1} />
      </svg>

      {/* Warning banner if any phase exceeds PoP */}
      {popDate && phases.some(p => (dragPreview && dragPreview.phaseId === p.id ? dragPreview.end_date : p.end_date) > popDate) && (
        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border-t border-orange-200 text-xs text-orange-700">
          <span>⚠</span>
          <span>One or more phases extend past the Grant Period of Performance ({popDate}). Please adjust the schedule.</span>
        </div>
      )}
    </div>
  );
}
