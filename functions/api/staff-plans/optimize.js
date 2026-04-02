import { json, requireAdmin } from '../../_utils.js';

const FRINGE = 0.451;
const FA = 0.317;
const BURN_MULTIPLIER = (1 + FRINGE) * (1 + FA); // 1.451 * 1.317 ≈ 1.9110

// Parse YYYY-MM-DD to Date (UTC midnight)
function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// Format Date to YYYY-MM-DD
function formatDate(dt) {
  return dt.toISOString().slice(0, 10);
}

// Add one day to a date
function addDay(dt) {
  const d = new Date(dt);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/**
 * Priority-driven optimization function.
 *
 * Input:
 *   staff: [{ userId, salary, funds: [{ full_account_string, fund_number,
 *              remaining_balance, pop_end_date, priority_rank, is_pinned,
 *              balance_unknown, pinned_pct }] }]
 *   balances: [{ full_account_string, fund_number, remaining_balance,
 *                pop_end_date, priority_rank, is_pinned }]
 *   plan_start: 'YYYY-MM-DD'
 *   plan_end: 'YYYY-MM-DD'
 *   terminations: { userId: 'YYYY-MM-DD', ... }
 *
 * Returns: array of proposed rows (with is_pinned field)
 */
export function optimizeRows({ staff, balances, plan_start, plan_end, terminations = {} }) {
  // Build balance map keyed by full_account_string
  const balanceMap = {};
  for (const b of balances) {
    balanceMap[b.full_account_string] = b;
  }

  // Track cumulative spend per account across all staff
  const fundSpend = {};

  const allRows = [];

  for (const member of staff) {
    const { userId, salary, funds } = member;
    if (!funds || funds.length === 0) continue;
    const effectiveSalary = salary || 0;

    // Cap plan end at termination date if applicable
    const terminationDate = terminations[userId];
    const effectivePlanEnd = terminationDate && terminationDate < plan_end ? terminationDate : plan_end;
    if (effectivePlanEnd <= plan_start) continue;

    // Collect break points: plan_start, each fund pop_end_date+1 day, effectivePlanEnd
    const breakSet = new Set([plan_start, effectivePlanEnd]);
    for (const f of funds) {
      const b = balanceMap[f.full_account_string];
      const popEnd = b?.pop_end_date || f.pop_end_date;
      if (!popEnd) continue;
      if (popEnd < plan_start || popEnd >= effectivePlanEnd) continue;
      const popEndDt = parseDate(popEnd);
      const dayAfterStr = formatDate(addDay(popEndDt));
      if (dayAfterStr <= effectivePlanEnd) breakSet.add(dayAfterStr);
    }

    const breakPoints = Array.from(breakSet).sort();

    // Generate consecutive periods from break points
    const periods = [];
    for (let i = 0; i < breakPoints.length - 1; i++) {
      const periodStart = breakPoints[i];
      const nextBreak = parseDate(breakPoints[i + 1]);
      const periodEndDt = new Date(nextBreak);
      periodEndDt.setUTCDate(periodEndDt.getUTCDate() - 1);
      periods.push({ period_start: periodStart, period_end: formatDate(periodEndDt) });
    }

    for (const { period_start, period_end } of periods) {
      // Determine active funds for this period
      const activeFunds = funds.filter(f => {
        const b = balanceMap[f.full_account_string];
        if (!b) return (f.remaining_balance > 0) || f.balance_unknown;
        if (b.is_pinned) return true; // pinned funds always active
        if (f.balance_unknown || b.balance_unknown) return true;
        if (!b.pop_end_date) return b.remaining_balance > 0;
        return b.pop_end_date >= period_start && (b.remaining_balance > 0 || b.balance_unknown);
      });

      if (activeFunds.length === 0) continue;

      const periodMonths = Math.max(
        (parseDate(period_end) - parseDate(period_start)) / (1000 * 60 * 60 * 24 * 30.4375),
        0.5
      );

      // Separate pinned from free funds
      const pinnedFunds = activeFunds.filter(f => {
        const b = balanceMap[f.full_account_string];
        return b?.is_pinned === 1 || b?.is_pinned === true;
      });
      const freeFunds = activeFunds.filter(f => {
        const b = balanceMap[f.full_account_string];
        return !(b?.is_pinned === 1 || b?.is_pinned === true);
      });

      // Build pinned allocations using pinned_pct from fund record
      const pinnedAllocs = [];
      let pinnedTotal = 0;
      for (const f of pinnedFunds) {
        const origPct = f.pinned_pct ?? 10;
        pinnedAllocs.push({ fund: f, pct: origPct, isPinned: true });
        pinnedTotal += origPct;
      }

      // Warn if pinned already >= 100%
      if (pinnedTotal >= 100) {
        for (const alloc of pinnedAllocs) {
          const b = balanceMap[alloc.fund.full_account_string];
          const estimated_cost = (effectiveSalary / 12) * (alloc.pct / 100) * periodMonths * BURN_MULTIPLIER;
          if (!fundSpend[alloc.fund.full_account_string]) fundSpend[alloc.fund.full_account_string] = 0;
          fundSpend[alloc.fund.full_account_string] += estimated_cost;
          allRows.push({
            user_id: userId,
            fund_number: alloc.fund.fund_number,
            full_account_string: alloc.fund.full_account_string,
            period_start,
            period_end,
            allocation_pct: alloc.pct,
            salary_rate: effectiveSalary,
            estimated_cost: Math.round(estimated_cost * 100) / 100,
            flag: pinnedTotal > 100 ? 'over_budget' : null,
            is_pinned: 1,
          });
        }
        continue;
      }

      let available = 100 - pinnedTotal;

      // Sort free funds by priority_rank ASC (lower = higher priority), fallback 99
      const sortedFree = [...freeFunds].sort((a, b) => {
        const ba = balanceMap[a.full_account_string];
        const bb = balanceMap[b.full_account_string];
        const pa = ba?.priority_rank ?? 99;
        const pb = bb?.priority_rank ?? 99;
        return pa - pb;
      });

      // Priority-driven allocation
      const freeAllocs = [];
      let remainingPct = available;

      for (const f of sortedFree) {
        if (remainingPct <= 0) break;
        const b = balanceMap[f.full_account_string];

        if (!b || b.balance_unknown || f.balance_unknown) {
          freeAllocs.push({ fund: f, pct: 0, unknown: true });
          continue;
        }

        if (!b.remaining_balance || b.remaining_balance <= 0) continue;

        const popEnd = b.pop_end_date;
        if (!popEnd || popEnd < period_start) continue;

        const monthsLeft = Math.max(
          (parseDate(popEnd) - parseDate(period_start)) / (1000 * 60 * 60 * 24 * 30.4375),
          0.5
        );

        // pct needed to exhaust this grant by POP end
        const costAt1PctPerMonth = (effectiveSalary / 12) * 0.01 * BURN_MULTIPLIER;
        const pctNeeded = costAt1PctPerMonth > 0
          ? Math.ceil(b.remaining_balance / (costAt1PctPerMonth * monthsLeft))
          : remainingPct;

        // Cap: don't exceed available, don't put >70% on one grant, floor at 5%
        const maxPct = Math.min(remainingPct, 70);
        const assignedPct = Math.min(Math.max(pctNeeded, 5), maxPct);

        freeAllocs.push({ fund: f, pct: assignedPct });
        remainingPct -= assignedPct;
      }

      // Distribute leftover to unknown-balance grants equally
      const unknownAllocs = freeAllocs.filter(a => a.unknown);
      if (unknownAllocs.length > 0 && remainingPct > 0) {
        const share = Math.floor(remainingPct / unknownAllocs.length);
        for (const a of unknownAllocs) a.pct = share;
        remainingPct -= share * unknownAllocs.length;
      }

      // Add any remaining % to highest-priority non-unknown grant
      if (remainingPct > 0 && freeAllocs.length > 0) {
        const first = freeAllocs.find(a => !a.unknown);
        if (first) first.pct += remainingPct;
        else if (unknownAllocs.length > 0) unknownAllocs[0].pct += remainingPct;
      }

      // Combine pinned + free, remove zero-pct
      const allAllocs = [...pinnedAllocs, ...freeAllocs].filter(a => a.pct > 0);

      // Normalize to exactly 100% (rounding fix)
      const sumPct = allAllocs.reduce((s, a) => s + a.pct, 0);
      if (sumPct !== 100 && allAllocs.length > 0) {
        const diff = 100 - sumPct;
        // Add diff to highest-priority free alloc (not pinned)
        const adj = allAllocs.find(a => !a.isPinned) || allAllocs[0];
        adj.pct += diff;
      }

      for (const alloc of allAllocs) {
        const b = balanceMap[alloc.fund.full_account_string];
        const estimated_cost = (effectiveSalary / 12) * (alloc.pct / 100) * periodMonths * BURN_MULTIPLIER;

        const accountKey = alloc.fund.full_account_string;
        if (!fundSpend[accountKey]) fundSpend[accountKey] = 0;
        fundSpend[accountKey] += estimated_cost;

        let flag = null;
        if (alloc.unknown || b?.balance_unknown || alloc.fund?.balance_unknown) flag = 'balance_unknown';
        else if (alloc.pct < 5) flag = 'low_pct';
        else if (b?.remaining_balance > 0 && fundSpend[accountKey] > b.remaining_balance) flag = 'over_budget';

        allRows.push({
          user_id: userId,
          fund_number: alloc.fund.fund_number,
          full_account_string: alloc.fund.full_account_string ?? null,
          period_start,
          period_end,
          allocation_pct: alloc.pct,
          salary_rate: effectiveSalary,
          estimated_cost: Math.round(estimated_cost * 100) / 100,
          flag,
          is_pinned: alloc.isPinned ? 1 : 0,
        });
      }
    }
  }

  return allRows;
}

// HTTP handler for direct POST calls to /api/staff-plans/optimize
export async function onRequest(context) {
  const { data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const body = await request.json();
  const { staff, balances, plan_start, plan_end, terminations } = body;

  if (!staff || !balances || !plan_start || !plan_end) {
    return json({ error: 'staff, balances, plan_start, plan_end are required' }, 400);
  }

  const rows = optimizeRows({ staff, balances, plan_start, plan_end, terminations });
  return json({ rows });
}
