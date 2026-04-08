// ── helpers ──────────────────────────────────────────────────────────────────
function daysDiff(base, scenario) {
  if (!base || !scenario) return null;
  const a = new Date(base + 'T00:00:00Z');
  const b = new Date(scenario + 'T00:00:00Z');
  return Math.round((b - a) / 86400000);
}

function fmtDelta(days) {
  if (days === null || days === undefined || days === 0) return '—';
  return days > 0 ? `+${days}d` : `${days}d`;
}

function fmtDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[Number(m) - 1]} ${Number(d)}, ${y}`;
}

function phaseStatus(basePh, scenPh, popDate) {
  const baseEnd = basePh?.end_date;
  const scenEnd = scenPh?.end_date;
  const baseStart = basePh?.start_date;
  const scenStart = scenPh?.start_date;

  const startDelta = daysDiff(baseStart, scenStart);
  const endDelta = daysDiff(baseEnd, scenEnd);
  const changed = (startDelta !== 0) || (endDelta !== 0);

  if (popDate && scenEnd && scenEnd > popDate) {
    return { label: 'Past PoP ⚠', cls: 'text-red-700 font-semibold' };
  }
  if (!changed) return { label: 'Unchanged', cls: 'text-gray-400' };
  if ((endDelta ?? 0) < 0 || (startDelta ?? 0) < 0) {
    const isEarlier = (endDelta ?? 0) <= 0 && (startDelta ?? 0) <= 0;
    if (isEarlier) return { label: 'Earlier', cls: 'text-green-700 font-medium' };
  }
  return { label: 'Later', cls: 'text-orange-600 font-medium' };
}

function milestoneStatus(baseDate, scenDate, popDate) {
  const delta = daysDiff(baseDate, scenDate);
  if (popDate && scenDate && scenDate > popDate) {
    return { label: 'Past PoP ⚠', cls: 'text-red-700 font-semibold' };
  }
  if (!delta) return { label: 'Unchanged', cls: 'text-gray-400' };
  if (delta < 0) return { label: 'Earlier', cls: 'text-green-700 font-medium' };
  return { label: 'Later', cls: 'text-orange-600 font-medium' };
}

// ── component ─────────────────────────────────────────────────────────────────
export default function ScenarioCompareTable({
  phases = [],
  milestones = [],
  basePhases = [],
  baseMilestones = [],
  popDate,
  baseLabel = 'Base Plan',
  scenarioLabel = 'Scenario',
}) {
  const basePhaseMap = Object.fromEntries(basePhases.map(p => [p.id, p]));
  const baseMilestoneMap = Object.fromEntries(baseMilestones.map(m => [m.id, m]));

  // Summary counts
  let phasesChanged = 0;
  let phasesPastPoP = 0;
  let msChanged = 0;
  let msPastPoP = 0;

  for (const ph of phases) {
    const base = basePhaseMap[ph.id];
    if (!base) continue;
    const startDelta = daysDiff(base.start_date, ph.start_date);
    const endDelta = daysDiff(base.end_date, ph.end_date);
    if (startDelta !== 0 || endDelta !== 0) {
      phasesChanged++;
      if (popDate && ph.end_date > popDate) phasesPastPoP++;
    }
  }
  for (const ms of milestones) {
    const base = baseMilestoneMap[ms.id];
    if (!base) continue;
    const delta = daysDiff(base.target_date, ms.target_date);
    if (delta !== 0) {
      msChanged++;
      if (popDate && ms.target_date > popDate) msPastPoP++;
    }
  }

  const th = 'px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200';
  const td = 'px-3 py-2 text-sm text-gray-700 border-b border-gray-100';
  const tdDelta = (delta) => {
    if (!delta) return 'px-3 py-2 text-sm text-gray-400 border-b border-gray-100';
    return delta > 0
      ? 'px-3 py-2 text-sm font-medium text-orange-600 border-b border-gray-100'
      : 'px-3 py-2 text-sm font-medium text-green-700 border-b border-gray-100';
  };

  return (
    <div className="scenario-compare-table rounded border border-gray-200 bg-white overflow-x-auto">
      <table className="w-full text-sm" role="table">
        <thead>
          <tr>
            <th className={th} scope="col">Phase / Milestone</th>
            <th className={th} scope="col">{baseLabel} Start</th>
            <th className={th} scope="col">Scenario Start</th>
            <th className={th} scope="col">Δ Start</th>
            <th className={th} scope="col">{baseLabel} End</th>
            <th className={th} scope="col">Scenario End</th>
            <th className={th} scope="col">Δ End</th>
            <th className={th} scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {/* ── Phases section ── */}
          <tr>
            <td colSpan={8} className="px-3 py-1 text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-50 border-b border-gray-200">
              Phases
            </td>
          </tr>
          {phases.map(ph => {
            const base = basePhaseMap[ph.id];
            if (!base) return null;
            const startDelta = daysDiff(base.start_date, ph.start_date);
            const endDelta = daysDiff(base.end_date, ph.end_date);
            const { label: statusLabel, cls: statusCls } = phaseStatus(base, ph, popDate);
            return (
              <tr key={ph.id} className="hover:bg-gray-50">
                <td className={`${td} font-medium`}>{ph.label}</td>
                <td className={td}>{fmtDate(base.start_date)}</td>
                <td className={td}>{fmtDate(ph.start_date)}</td>
                <td className={tdDelta(startDelta)}>{fmtDelta(startDelta)}</td>
                <td className={td}>{fmtDate(base.end_date)}</td>
                <td className={td}>{fmtDate(ph.end_date)}</td>
                <td className={tdDelta(endDelta)}>{fmtDelta(endDelta)}</td>
                <td className={`px-3 py-2 text-sm border-b border-gray-100 ${statusCls}`}>{statusLabel}</td>
              </tr>
            );
          })}

          {/* ── Milestones section ── */}
          <tr>
            <td colSpan={8} className="px-3 py-1 text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-50 border-b border-gray-200">
              Milestones
            </td>
          </tr>
          {milestones.map(ms => {
            const base = baseMilestoneMap[ms.id];
            if (!base) return null;
            const delta = daysDiff(base.target_date, ms.target_date);
            const { label: statusLabel, cls: statusCls } = milestoneStatus(base.target_date, ms.target_date, popDate);
            return (
              <tr key={ms.id} className="hover:bg-gray-50">
                <td className={`${td} font-medium`}>{ms.label}</td>
                <td className={td}>{fmtDate(base.target_date)}</td>
                <td className={td}>{fmtDate(ms.target_date)}</td>
                <td className={tdDelta(delta)}>{fmtDelta(delta)}</td>
                <td className={`${td} text-gray-300`}>—</td>
                <td className={`${td} text-gray-300`}>—</td>
                <td className={tdDelta(delta)}>{fmtDelta(delta)}</td>
                <td className={`px-3 py-2 text-sm border-b border-gray-100 ${statusCls}`}>{statusLabel}</td>
              </tr>
            );
          })}

          {/* ── Summary row ── */}
          <tr className="bg-gray-50">
            <td colSpan={8} className="px-3 py-2 text-xs text-gray-500">
              <span className="font-medium">{phasesChanged} phase{phasesChanged !== 1 ? 's' : ''} changed</span>
              {phasesPastPoP > 0 && (
                <span className="ml-2 text-red-600 font-semibold">· {phasesPastPoP} shifted past PoP ⚠</span>
              )}
              {msChanged > 0 && (
                <span className="ml-2">· {msChanged} milestone{msChanged !== 1 ? 's' : ''} changed</span>
              )}
              {msPastPoP > 0 && (
                <span className="ml-2 text-red-600 font-semibold">· {msPastPoP} milestone{msPastPoP !== 1 ? 's' : ''} past PoP ⚠</span>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
