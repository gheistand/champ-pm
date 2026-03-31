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
 *   staff: [{ userId, salary, funds: [{ fund_number, full_account_string, remaining_balance, pop_end_date, ... }] }]
 *   balances: [{ fund_number, remaining_balance, pop_end_date }]
 *   plan_start: 'YYYY-MM-DD'
 *   plan_end: 'YYYY-MM-DD'
 *   terminations: { userId: 'YYYY-MM-DD', ... }
 *
 * Returns: array of proposed rows
 */
export function optimizeRows({ staff, balances, plan_start, plan_end, terminations = {} }) {
  // Build balance lookup by fund_number
  const balanceMap = {};
  for (const b of balances) {
    balanceMap[b.fund_number] = {
      remaining_balance: b.remaining_balance,
      pop_end_date: b.pop_end_date,
    };
  }

  // Track cumulative spend per fund across all staff
  const fundSpend = {};

  const allRows = [];

  for (const member of staff) {
    const { userId, salary, funds } = member;
    if (!salary || !funds || funds.length === 0) continue;

    // Cap plan end at termination date if applicable
    const terminationDate = terminations[userId];
    const effectivePlanEnd = terminationDate && terminationDate < plan_end ? terminationDate : plan_end;

    if (effectivePlanEnd <= plan_start) continue; // Already terminated before plan starts

    // Collect all break points: plan_start, each fund pop_end_date+1day, effectivePlanEnd
    const breakSet = new Set([plan_start, effectivePlanEnd]);
    for (const f of funds) {
      const b = balanceMap[f.fund_number];
      if (!b) continue;
      if (b.pop_end_date < plan_start || b.pop_end_date > effectivePlanEnd) continue;
      // Break point is the day after pop_end (start of next period after this fund ends)
      const popEndDt = parseDate(b.pop_end_date);
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
      const activeFunds = funds.filter(f => {
        const b = balanceMap[f.fund_number];
        if (!b) return false;
        return b.pop_end_date >= period_start && b.remaining_balance > 0;
      });

      if (activeFunds.length === 0) continue;

      // Calculate weight per fund: remaining_balance / months_remaining_in_pop
      const periodStartDt = parseDate(period_start);
      const weights = activeFunds.map(f => {
        const b = balanceMap[f.fund_number];
        const popEndDt = parseDate(b.pop_end_date);
        const monthsRemaining = (popEndDt - periodStartDt) / (1000 * 60 * 60 * 24 * 30.4375);
        const safeMonths = Math.max(monthsRemaining, 0.5); // avoid division by zero
        return { fund: f, weight: b.remaining_balance / safeMonths };
      });

      const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
      if (totalWeight <= 0) continue;

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
        const b = balanceMap[alloc.fund.fund_number];
        const estimated_cost = (salary / 12) * (alloc.pct / 100) * periodMonths * BURN_MULTIPLIER;

        // Track cumulative spend
        if (!fundSpend[alloc.fund.fund_number]) fundSpend[alloc.fund.fund_number] = 0;
        fundSpend[alloc.fund.fund_number] += estimated_cost;

        let flag = null;
        if (alloc.pct < 5) flag = 'low_pct';
        else if (fundSpend[alloc.fund.fund_number] > b.remaining_balance) flag = 'over_budget';

        allRows.push({
          user_id: userId,
          fund_number: alloc.fund.fund_number,
          full_account_string: alloc.fund.full_account_string ?? null,
          period_start,
          period_end,
          allocation_pct: alloc.pct,
          salary_rate: salary,
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
