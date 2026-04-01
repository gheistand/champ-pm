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

// Fractional months between two dates
function monthsBetween(startStr, endStr) {
  const s = parseDate(startStr);
  const e = parseDate(endStr);
  const ms = e - s;
  return ms / (1000 * 60 * 60 * 24 * 30.4375);
}

/**
 * Core optimization function.
 *
 * Input:
 *   staff: [{ userId, salary, funds: [{ full_account_string, fund_number, remaining_balance, pop_end_date, ... }] }]
 *   balances: [{ full_account_string, fund_number, remaining_balance, pop_end_date }]
 *   plan_start: 'YYYY-MM-DD'
 *   plan_end: 'YYYY-MM-DD'
 *   terminations: { userId: 'YYYY-MM-DD', ... }
 *
 * Returns: array of proposed rows
 * Note: full_account_string is the canonical unique identifier for all joins.
 *       fund_number is for display only.
 */
export function optimizeRows({ staff, balances, plan_start, plan_end, terminations = {} }) {
  // Build balance lookup by full_account_string (canonical key)
  const balanceMap = {};
  for (const b of balances) {
    balanceMap[b.full_account_string] = {
      remaining_balance: b.remaining_balance,
      pop_end_date: b.pop_end_date,
    };
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

    if (effectivePlanEnd <= plan_start) continue; // Already terminated before plan starts

    // Collect all break points: plan_start, each fund pop_end_date+1day, effectivePlanEnd
    const breakSet = new Set([plan_start, effectivePlanEnd]);
    for (const f of funds) {
      // Use pop_end_date from balanceMap if available, otherwise from fund itself
      const b = balanceMap[f.full_account_string];
      const popEnd = b?.pop_end_date || f.pop_end_date;
      if (!popEnd) continue;
      if (popEnd < plan_start || popEnd > effectivePlanEnd) continue;
      // Break point is the day after pop_end (start of next period after this fund ends)
      const popEndDt = parseDate(popEnd);
      const dayAfterPop = addDay(popEndDt);
      const dayAfterStr = formatDate(dayAfterPop);
      if (dayAfterStr <= effectivePlanEnd) breakSet.add(dayAfterStr);
    }

    const breakPoints = Array.from(breakSet).sort();

    // Generate consecutive periods from break points
    const periods = [];
    for (let i = 0; i < breakPoints.length - 1; i++) {
      const periodStart = breakPoints[i];
      // Period end = day before next break point
      const nextBreak = parseDate(breakPoints[i + 1]);
      const periodEndDt = new Date(nextBreak);
      periodEndDt.setUTCDate(periodEndDt.getUTCDate() - 1);
      const periodEnd = formatDate(periodEndDt);
      periods.push({ period_start: periodStart, period_end: periodEnd });
    }

    // For each period, determine active funds and calculate allocations
    for (const { period_start, period_end } of periods) {
      // Active funds: pop_end_date >= period_start AND remaining_balance > 0
      // Also include funds with unknown balance (balance_unknown=1) — lock at current pct
      const activeFunds = funds.filter(f => {
        if (f.balance_unknown) return true; // unknown balance — include, will be flagged
        const b = balanceMap[f.full_account_string];
        if (!b) {
          // Not in balanceMap but may have data from LEFT JOIN
          return (f.remaining_balance > 0) || f.balance_unknown;
        }
        if (!b.pop_end_date) return b.remaining_balance > 0; // no end date — include if balance
        return b.pop_end_date >= period_start && b.remaining_balance > 0;
      });

      if (activeFunds.length === 0) continue;

      // Calculate weight per fund: remaining_balance / months_remaining_in_pop
      const periodStartDt = parseDate(period_start);
      const weights = activeFunds.map(f => {
        const b = balanceMap[f.full_account_string];
        // Handle unknown balance or missing balance entry
        if (!b || f.balance_unknown || !b.pop_end_date) {
          return { fund: f, weight: 1, unknown: true }; // equal weight, flagged
        }
        const popEndDt = parseDate(b.pop_end_date);
        if (isNaN(popEndDt)) return { fund: f, weight: 1, unknown: true };
        const monthsRemaining = (popEndDt - periodStartDt) / (1000 * 60 * 60 * 24 * 30.4375);
        const safeMonths = Math.max(monthsRemaining, 0.5);
        const balance = b.remaining_balance ?? f.remaining_balance ?? 0;
        return { fund: f, weight: Math.max(balance, 0) / safeMonths };
      });

      let totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
      // If all weights are zero (all balances unknown), use equal weights
      if (totalWeight <= 0) {
        weights.forEach(w => { w.weight = 1; w.unknown = true; });
        totalWeight = weights.length;
      }

      // Normalize to 100% (whole numbers)
      let allocations = weights.map(w => ({
        fund: w.fund,
        pct: Math.round((w.weight / totalWeight) * 100),
      }));

      // Adjust largest to ensure sum = 100
      const sumPct = allocations.reduce((s, a) => s + a.pct, 0);
      const diff = 100 - sumPct;
      if (diff !== 0) {
        const largest = allocations.reduce((max, a) => a.pct > max.pct ? a : max, allocations[0]);
        largest.pct += diff;
      }

      // Calculate estimated costs and flags
      const periodMonths = monthsBetween(period_start, period_end);

      for (const alloc of allocations) {
        const b = balanceMap[alloc.fund.full_account_string];
        const estimated_cost = (effectiveSalary / 12) * (alloc.pct / 100) * periodMonths * BURN_MULTIPLIER;

        // Track cumulative spend
        const accountKey = alloc.fund.full_account_string;
        if (!fundSpend[accountKey]) fundSpend[accountKey] = 0;
        fundSpend[accountKey] += estimated_cost;

        let flag = null;
        const remainingBal = b?.remaining_balance ?? alloc.fund.remaining_balance ?? 0;
        if (!b || alloc.fund.balance_unknown) flag = 'balance_unknown';
        else if (alloc.pct < 5) flag = 'low_pct';
        else if (remainingBal > 0 && fundSpend[accountKey] > remainingBal) flag = 'over_budget';

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
