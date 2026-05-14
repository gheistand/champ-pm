import { json, requireAdmin } from '../../_utils.js';
import Solver from 'javascript-lp-solver';

const FRINGE = 0.451;
const FA    = 0.317;
const BURN_MULTIPLIER = (1 + FRINGE) * (1 + FA); // ≈ 1.9110

// ── Date helpers ──────────────────────────────────────────────────────────────

function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function formatDate(dt) { return dt.toISOString().slice(0, 10); }
function addDay(dt) {
  const d = new Date(dt); d.setUTCDate(d.getUTCDate() + 1); return d;
}
function monthsBetween(a, b) {
  return Math.max((parseDate(b) - parseDate(a)) / (1000 * 60 * 60 * 24 * 30.4375), 0.5);
}

// ── LP optimizer ──────────────────────────────────────────────────────────────
//
// Decision variables for each eligible (person p, grant g, period t):
//   x[p,g,t]  = allocation percentage charged to grant g
//   slack[p,t] = allocation that falls back to overhead/GRF (always feasible)
//
// Constraints:
//   Σ_g x[p,g,t] + slack[p,t] = 100 - pinned_pct  (for each p, t)
//   Σ_(p,t) cost(x[p,g,t]) ≤ remaining_balance_g   (for each grant g)
//   x[p,g,t] ≤ 80                                   (max 80% one grant per person)
//   x[p,g,t] ≥ 0, slack[p,t] ≥ 0
//
// Objective: maximize Σ_(p,g,t) urgency_g × cost(x[p,g,t])
//            - small penalty on slack (minimize overhead)
//
// urgency_g = 1 / (months_to_pop_end + 0.5) — sooner expiry = more weight

export function optimizeRows({ staff, balances, plan_start, plan_end, terminations = {}, ai_overrides = {} }) {

  // ── 1. Balance map ─────────────────────────────────────────────────────────
  const balanceMap = {};
  for (const b of balances) balanceMap[b.full_account_string] = b;

  // ── 2. Global time periods (all PoP break points) ─────────────────────────
  const breakSet = new Set([plan_start, plan_end]);
  for (const b of balances) {
    if (!b.pop_end_date || b.pop_end_date < plan_start || b.pop_end_date >= plan_end) continue;
    const d = formatDate(addDay(parseDate(b.pop_end_date)));
    if (d < plan_end) breakSet.add(d);
  }
  for (const td of Object.values(terminations)) {
    if (td > plan_start && td < plan_end) breakSet.add(td);
  }
  const breakPoints = Array.from(breakSet).sort();
  const periods = [];
  for (let i = 0; i < breakPoints.length - 1; i++) {
    const pEnd = new Date(parseDate(breakPoints[i + 1]));
    pEnd.setUTCDate(pEnd.getUTCDate() - 1);
    periods.push({ period_start: breakPoints[i], period_end: formatDate(pEnd) });
  }

  // ── 3. Build LP model ─────────────────────────────────────────────────────
  const model = { optimize: 'obj', opType: 'max', constraints: {}, variables: {} };
  const pinnedRows = [];
  const pinnedSpend = {};   // pre-committed grant spend from pinned rows
  const varMeta = {};       // metadata stripped before solve, restored after

  // ── 4. Populate variables + constraints ────────────────────────────────────
  for (const member of staff) {
    const { userId, salary, funds } = member;
    if (!salary || salary <= 0 || !funds?.length) continue;
    const termDate = terminations[userId];

    for (const period of periods) {
      const { period_start, period_end } = period;
      if (termDate && period_start >= termDate) continue;
      const effEnd = (termDate && termDate < period_end) ? termDate : period_end;

      const months      = monthsBetween(period_start, effEnd);
      const costPer1Pct = (salary / 12) * 0.01 * months * BURN_MULTIPLIER;
      const ppKey       = `pp_${userId}_${period_start}`;

      // Collect pinned funds first
      let pinnedTotal = 0;
      const freeFunds = [];

      for (const f of funds) {
        const b = balanceMap[f.full_account_string];
        if (b?.is_pinned === 1 || b?.is_pinned === true) {
          const pct  = f.pinned_pct ?? 10;
          const cost = costPer1Pct * pct;
          pinnedTotal += pct;
          pinnedRows.push({
            user_id: userId, fund_number: f.fund_number,
            full_account_string: f.full_account_string,
            period_start, period_end: effEnd,
            allocation_pct: pct, salary_rate: salary,
            estimated_cost: Math.round(cost * 100) / 100,
            flag: null, is_pinned: 1,
          });
          const gk = `g_${f.full_account_string}`;
          pinnedSpend[gk] = (pinnedSpend[gk] || 0) + cost;
        } else {
          freeFunds.push(f);
        }
      }

      const available = 100 - pinnedTotal;
      if (available <= 0 || freeFunds.length === 0) continue;

      // Person-period equality: free allocations + slack = available
      model.constraints[ppKey] = { equal: available };

      // Slack variable — absorbs any allocation that can't fit in grants.
      // Small negative objective weight ensures LP minimises overhead.
      const slackKey = `slack_${userId}_${period_start}`;
      model.variables[slackKey] = { [ppKey]: 1, obj: -0.001 };
      varMeta[slackKey] = { _type: 'slack', _userId: userId, _periodStart: period_start };

      // Count eligible free grants for this person+period (for cap calculation)
      const eligibleCount = freeFunds.filter(f => {
        const b = balanceMap[f.full_account_string];
        return !b?.balance_unknown && !f.balance_unknown
          && (b?.remaining_balance || 0) > 0
          && (!b?.pop_end_date || b.pop_end_date >= period_start);
      }).length;

      // Dynamic per-grant cap: 1.2× fair share, floored at 20%, hard ceiling 60%.
      // For 2 grants: 60%  |  3 grants: 40%  |  4 grants: 30%  |  5+: 24%
      // The 60% ceiling prevents near-80/20 collapse when someone has only 2 eligible grants.
      const fairShare = available / Math.max(eligibleCount, 1);
      const perGrantCap = Math.min(60, Math.max(20, Math.ceil(fairShare * 1.2)));

      // Grant variables
      for (const f of freeFunds) {
        const b = balanceMap[f.full_account_string];

        // Skip expired grants
        if (b?.pop_end_date && b.pop_end_date < period_start) continue;

        // Unknown-balance grants: skip from LP; handled in fallback pass
        if (b?.balance_unknown || f.balance_unknown) continue;

        // Skip exhausted grants
        if (b && (b.remaining_balance || 0) <= 0) continue;

        const gk = `g_${f.full_account_string}`;

        // Urgency weight: sqrt-dampened so concentration isn't too aggressive.
        // A grant expiring in 3 months vs 12 months gets 2× weight (not 4×).
        const popEnd = b?.pop_end_date || plan_end;
        const baseUrgency = 1 / Math.sqrt(monthsBetween(period_start, popEnd) + 1);
        const urgencyMult = ai_overrides.grant_urgency_multipliers?.[f.full_account_string] ?? 1;
        const urgency = baseUrgency * urgencyMult;

        const varKey = `x_${userId}_${f.full_account_string}_${period_start}`;
        const ubKey  = `ub_${varKey}`;

        model.variables[varKey] = {
          [ppKey]: 1,                        // person-period sum
          [gk]:    costPer1Pct,              // grant spend capacity
          [ubKey]: 1,                        // per-variable dynamic cap
          obj:     urgency * costPer1Pct,    // sqrt-dampened urgency objective
        };
        // AI cap override (per-person per-grant)
        const aiCap = ai_overrides.per_person_grant_caps?.[userId]?.[f.full_account_string];
        const aiFloor = ai_overrides.per_person_grant_floors?.[userId]?.[f.full_account_string];
        const effectiveCap = aiCap != null ? Math.min(available, aiCap) : Math.min(available, perGrantCap);
        model.constraints[ubKey] = { max: Math.max(effectiveCap, 0) };
        // AI floor: add a >= constraint so LP must allocate at least this much
        if (aiFloor != null && aiFloor > 0) {
          const lbKey = `lb_${varKey}`;
          model.variables[varKey][lbKey] = 1;
          model.constraints[lbKey] = { min: Math.min(aiFloor, effectiveCap) };
        }
        varMeta[varKey] = {
          _type: 'grant', _userId: userId,
          _account: f.full_account_string, _fundNumber: f.fund_number,
          _periodStart: period_start, _periodEnd: effEnd,
          _costPer1Pct: costPer1Pct, _salary: salary,
        };
      }
    }
  }

  // ── 5. Grant capacity constraints (net of pinned spend) ────────────────────
  const grantKeys = new Set(
    Object.values(varMeta)
      .filter(m => m._type === 'grant')
      .map(m => `g_${m._account}`)
  );
  for (const gk of grantKeys) {
    const account = gk.slice(2); // strip 'g_'
    const b = balanceMap[account];
    if (!b || b.balance_unknown) continue;
    const cap = Math.max(0, (b.remaining_balance || 0) - (pinnedSpend[gk] || 0));
    model.constraints[gk] = { max: cap };
  }

  // ── 6. Solve ───────────────────────────────────────────────────────────────
  let result = {};
  try { result = Solver.Solve(model); }
  catch (e) { console.error('LP error:', e.message); }

  // ── 7. Extract grant rows from LP result ───────────────────────────────────
  const lpRows = [];
  const grantSpend = { ...pinnedSpend };
  const allocatedByPP = {}; // track % used per person-period for fallback pass

  // Accumulate pinned
  for (const r of pinnedRows) {
    const ppKey = `${r.user_id}|${r.period_start}`;
    allocatedByPP[ppKey] = (allocatedByPP[ppKey] || 0) + r.allocation_pct;
  }

  if (result.feasible !== false || Object.keys(result).length > 1) {
    for (const [key, meta] of Object.entries(varMeta)) {
      if (meta._type !== 'grant') continue;
      const rawPct = result[key] || 0;
      if (rawPct < 0.5) continue;

      const pct  = Math.round(rawPct * 10) / 10;
      const cost = meta._costPer1Pct * rawPct;
      const gk   = `g_${meta._account}`;
      grantSpend[gk] = (grantSpend[gk] || 0) + cost;

      const b    = balanceMap[meta._account];
      const flag = (b?.remaining_balance > 0 && grantSpend[gk] > b.remaining_balance)
        ? 'over_budget' : null;

      lpRows.push({
        user_id: meta._userId, fund_number: meta._fundNumber,
        full_account_string: meta._account,
        period_start: meta._periodStart, period_end: meta._periodEnd,
        allocation_pct: pct, salary_rate: meta._salary,
        estimated_cost: Math.round(cost * 100) / 100,
        flag, is_pinned: 0,
      });

      const ppKey = `${meta._userId}|${meta._periodStart}`;
      allocatedByPP[ppKey] = (allocatedByPP[ppKey] || 0) + pct;
    }
  }

  // ── 8. Fallback: unknown-balance grants get leftover % ────────────────────
  const fallbackRows = [];
  for (const member of staff) {
    const { userId, salary, funds } = member;
    if (!salary || salary <= 0 || !funds?.length) continue;
    const termDate = terminations[userId];

    for (const period of periods) {
      const { period_start, period_end } = period;
      if (termDate && period_start >= termDate) continue;
      const effEnd = (termDate && termDate < period_end) ? termDate : period_end;
      const costPer1Pct = (salary / 12) * 0.01 * monthsBetween(period_start, effEnd) * BURN_MULTIPLIER;

      const ppKey  = `${userId}|${period_start}`;
      const used   = allocatedByPP[ppKey] || 0;
      const leftover = Math.round((100 - used) * 10) / 10;
      if (leftover < 1) continue;

      const unknownFunds = funds.filter(f => {
        const b = balanceMap[f.full_account_string];
        return (b?.balance_unknown || f.balance_unknown)
          && !(b?.is_pinned === 1 || b?.is_pinned === true)
          && (!b?.pop_end_date || b.pop_end_date >= period_start);
      });

      if (!unknownFunds.length) continue;
      const share = Math.round((leftover / unknownFunds.length) * 10) / 10;

      for (const f of unknownFunds) {
        fallbackRows.push({
          user_id: userId, fund_number: f.fund_number,
          full_account_string: f.full_account_string,
          period_start, period_end: effEnd,
          allocation_pct: share, salary_rate: salary,
          estimated_cost: Math.round(costPer1Pct * share * 100) / 100,
          flag: 'balance_unknown', is_pinned: 0,
        });
      }
    }
  }

  return [...pinnedRows, ...lpRows, ...fallbackRows];
}

// ── HTTP handler ──────────────────────────────────────────────────────────────

export async function onRequest(context) {
  const { data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const { staff, balances, plan_start, plan_end, terminations } = await request.json();
  if (!staff || !balances || !plan_start || !plan_end)
    return json({ error: 'staff, balances, plan_start, plan_end are required' }, 400);

  const rows = optimizeRows({ staff, balances, plan_start, plan_end, terminations });
  return json({ rows });
}
