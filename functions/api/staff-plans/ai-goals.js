import { json, requireAdmin } from '../../_utils.js';
import { optimizeRows } from './optimize.js';

const CLAUDE_API = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You are an allocation constraint advisor for a FEMA grant portfolio management system.

You will be given:
1. A list of FEMA grants with balances, POP (period of performance) end dates, and priority rankings
2. A list of staff members with their salaries and eligible grants
3. The user's plain-English optimization goals

Your job is to output a JSON object with structured constraint overrides for a linear programming optimizer.
The LP already handles basic urgency (earlier POP end date = higher weight) and per-grant caps (60% max per person by default).
Your overrides supplement those defaults based on the user's specific goals.

Output ONLY a valid JSON object — no markdown fences, no prose outside the JSON. Use this schema:
{
  "grant_urgency_multipliers": {
    "<full_account_string>": <number, e.g. 2.0 = double urgency, 0.5 = halve it>
  },
  "per_person_grant_caps": {
    "<user_id>": { "<full_account_string>": <max percent 0-100> }
  },
  "per_person_grant_floors": {
    "<user_id>": { "<full_account_string>": <min percent 0-100> }
  },
  "exclusions": {
    "<user_id>": ["<full_account_string>", ...]
  },
  "explanation": "<1-3 sentences: plain English summary of what you adjusted and why, referencing specific grants/people>"
}

Rules:
- Only include keys that actually need overrides; omit unchanged values
- Urgency multipliers: 1.0 = unchanged, >1 = higher priority, <1 = lower priority
- Caps and floors must respect each other: floor <= cap
- Exclusions completely remove a person from that grant
- If goals reference a grant by fund number or partial name, match it to the full_account_string
- If goals are vague or unrelated to allocations, return empty override objects with a helpful explanation
- explanation must be user-facing and friendly`;

// Build compact grant summary for the prompt (avoid token bloat)
function summarizeBalances(balances) {
  return balances.map(b => ({
    account: b.full_account_string,
    fund: b.fund_number,
    name: b.grant_name,
    balance: b.remaining_balance,
    pop_end: b.pop_end_date,
    priority: b.priority_rank < 99 ? b.priority_rank : undefined,
    pinned: b.is_pinned ? true : undefined,
  })).filter(b => b.balance > 0 || b.pop_end);
}

function summarizeStaff(staff) {
  return staff.map(s => ({
    id: s.userId,
    name: s.name,
    salary: s.salary,
    grants: s.funds?.map(f => f.full_account_string),
  }));
}

// Shared staff+balance loader — mirrors recalculate.js exactly
async function loadStaffAndBalances(env) {
  const { results: staffRows } = await env.DB.prepare(`
    SELECT DISTINCT sa.user_id,
      COALESCE(
        (SELECT sr.annual_salary FROM salary_records sr WHERE sr.user_id = sa.user_id ORDER BY sr.effective_date DESC LIMIT 1),
        MAX(sa.salary_rate),
        0
      ) as salary
    FROM staff_appointments sa
    GROUP BY sa.user_id
  `).all();

  const staff = [];
  for (const s of staffRows) {
    const { results: funds } = await env.DB.prepare(`
      SELECT DISTINCT
        sa.full_account_string,
        sa.fund_number,
        MAX(sa.chart) as chart,
        MAX(sa.org) as org,
        MAX(sa.program) as program,
        MAX(sa.activity) as activity,
        COALESCE(b.remaining_balance, 0) as remaining_balance,
        b.pop_end_date,
        b.priority_rank,
        b.is_pinned,
        CASE WHEN b.full_account_string IS NULL THEN 1 ELSE 0 END as balance_unknown,
        MAX(sa.allocation_pct) as pinned_pct
      FROM staff_appointments sa
      LEFT JOIN staff_plan_grant_balances b ON b.full_account_string = sa.full_account_string
      WHERE sa.user_id = ?
      GROUP BY sa.full_account_string
    `).bind(s.user_id).all();

    // Load display name for AI context
    const user = await env.DB.prepare('SELECT name FROM users WHERE id=?').bind(s.user_id).first();
    if (funds.length > 0) {
      staff.push({ userId: s.user_id, name: user?.name || s.user_id, salary: s.salary, funds });
    }
  }

  const { results: balances } = await env.DB.prepare(
    'SELECT * FROM staff_plan_grant_balances'
  ).all();

  return { staff, balances };
}

export async function onRequest(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const body = await request.json().catch(() => ({}));
  const { scenario_id, goals_text } = body;

  if (!scenario_id || !goals_text?.trim()) {
    return json({ error: 'scenario_id and goals_text are required' }, 400);
  }

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({ error: 'ANTHROPIC_API_KEY is not configured — ask your administrator to add it as a Cloudflare Pages secret.' }, 503);
  }

  // Load scenario
  const scenario = await env.DB.prepare(
    'SELECT * FROM staff_plan_scenarios WHERE id=?'
  ).bind(scenario_id).first();
  if (!scenario) return json({ error: 'Scenario not found' }, 404);

  // Load staff and balances (same as recalculate)
  const { staff, balances } = await loadStaffAndBalances(env);

  // Fetch terminations server-side from users.end_date (never trust client-supplied PII)
  const { results: userEndDates } = await env.DB.prepare(
    'SELECT id, end_date FROM users WHERE end_date IS NOT NULL'
  ).all();
  const terminations = Object.fromEntries(userEndDates.map(u => [u.id, u.end_date]));

  // Build prompt context
  const today = new Date().toISOString().slice(0, 10);
  const userMessage = `PLAN PERIOD: ${scenario.plan_start_date} to ${scenario.plan_end_date}
TODAY: ${today}

GRANTS:
${JSON.stringify(summarizeBalances(balances), null, 2)}

STAFF:
${JSON.stringify(summarizeStaff(staff), null, 2)}

USER GOALS:
${goals_text.trim()}`;

  // Call Claude
  let aiOverrides = {};
  let explanation = '';

  try {
    const claudeRes = await fetch(CLAUDE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error('Claude API error:', claudeRes.status, errText);
      return json({ error: `AI service returned ${claudeRes.status}` }, 502);
    }

    const claudeData = await claudeRes.json();
    const rawText = claudeData.content?.[0]?.text?.trim() || '{}';

    try {
      const parsed = JSON.parse(rawText);
      explanation = parsed.explanation || '';
      delete parsed.explanation;
      aiOverrides = parsed;
    } catch {
      console.error('Claude response parse failed:', rawText.slice(0, 300));
      explanation = 'AI response could not be parsed — running standard optimization.';
    }
  } catch (fetchErr) {
    console.error('Claude fetch error:', fetchErr.message);
    return json({ error: 'Could not reach AI service' }, 502);
  }

  // Apply exclusions: filter out excluded grants from each staff member's fund list
  const exclusions = aiOverrides.exclusions || {};
  const modifiedStaff = staff.map(s => {
    const excluded = new Set(exclusions[s.userId] || []);
    if (!excluded.size) return s;
    return { ...s, funds: s.funds.filter(f => !excluded.has(f.full_account_string)) };
  });

  // Run LP optimizer with AI overrides
  const newRows = optimizeRows({
    staff: modifiedStaff,
    balances,
    plan_start: scenario.plan_start_date,
    plan_end: scenario.plan_end_date,
    terminations,
    ai_overrides: aiOverrides,
  });

  // Preserve manually overridden + pinned rows (same pattern as recalculate.js)
  const { results: existingOverrides } = await env.DB.prepare(`
    SELECT * FROM staff_plan_scenario_rows WHERE scenario_id=? AND (is_override=1 OR is_pinned=1)
  `).bind(scenario_id).all();
  const overrideMap = new Map(
    existingOverrides.map(r => [`${r.user_id}|${r.full_account_string || r.fund_number}|${r.period_start}`, r])
  );

  for (const r of newRows) {
    const key = `${r.user_id}|${r.full_account_string || r.fund_number}|${r.period_start}`;
    if (overrideMap.has(key)) {
      const ov = overrideMap.get(key);
      r.allocation_pct = ov.allocation_pct;
      r.estimated_cost = ov.estimated_cost;
      r.is_override = ov.is_override;
      r.is_pinned = ov.is_pinned;
      r.flag = ov.flag;
      r.notes = ov.notes;
    }
  }

  // Replace non-override / non-pinned rows
  await env.DB.prepare(
    `DELETE FROM staff_plan_scenario_rows WHERE scenario_id=? AND is_override=0 AND (is_pinned IS NULL OR is_pinned=0)`
  ).bind(scenario_id).run();

  const stmt = env.DB.prepare(`
    INSERT INTO staff_plan_scenario_rows
      (scenario_id, user_id, fund_number, full_account_string,
       period_start, period_end, allocation_pct, salary_rate, estimated_cost,
       is_override, flag, notes, is_pinned)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const r of newRows) {
    const key = `${r.user_id}|${r.full_account_string || r.fund_number}|${r.period_start}`;
    if (!overrideMap.has(key)) {
      await stmt.bind(
        scenario_id, r.user_id, r.fund_number, r.full_account_string ?? null,
        r.period_start, r.period_end, r.allocation_pct, r.salary_rate ?? null,
        r.estimated_cost ?? null, r.is_override ?? 0, r.flag ?? null, r.notes ?? null,
        r.is_pinned ?? 0
      ).run();
    }
  }

  await env.DB.prepare(
    `UPDATE staff_plan_scenarios SET updated_at=datetime('now') WHERE id=?`
  ).bind(scenario_id).run();

  // Return saved rows with user names
  const { results: savedRows } = await env.DB.prepare(`
    SELECT r.*, u.name as user_name
    FROM staff_plan_scenario_rows r
    LEFT JOIN users u ON u.id = r.user_id
    WHERE r.scenario_id=?
    ORDER BY r.user_id, r.period_start, r.fund_number
  `).bind(scenario_id).all();

  return json({
    ok: true,
    row_count: savedRows.length,
    rows: savedRows,
    explanation,
    overrides_applied: aiOverrides,
  });
}
