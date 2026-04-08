import { json, requireAdmin } from '../../_utils.js';

async function getGrantEndDateForScenario(env, scenario_id) {
  const row = await env.DB.prepare(`
    SELECT g.end_date
    FROM schedule_scenarios ss
    JOIN projects p ON p.id = ss.project_id
    JOIN grants g ON g.id = p.grant_id
    WHERE ss.id = ?
  `).bind(scenario_id).first();
  return row ? row.end_date : null;
}

// GET ?scenario_id=N — merged schedule: base + overrides applied
async function handleGet(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const url = new URL(request.url);
  const scenario_id = url.searchParams.get('scenario_id');
  if (!scenario_id) return json({ error: 'scenario_id is required' }, 400);

  const scenario = await env.DB.prepare('SELECT * FROM schedule_scenarios WHERE id = ?')
    .bind(scenario_id).first();
  if (!scenario) return json({ error: 'Scenario not found' }, 404);

  const [
    { results: basePhases },
    { results: baseMilestones },
    { results: phaseOverrides },
    { results: milestoneOverrides },
  ] = await Promise.all([
    env.DB.prepare('SELECT * FROM schedule_phases WHERE project_id = ? ORDER BY display_order, id')
      .bind(scenario.project_id).all(),
    env.DB.prepare('SELECT * FROM schedule_milestones WHERE project_id = ? ORDER BY display_order, target_date')
      .bind(scenario.project_id).all(),
    env.DB.prepare('SELECT * FROM scenario_phase_overrides WHERE scenario_id = ?')
      .bind(scenario_id).all(),
    env.DB.prepare('SELECT * FROM scenario_milestone_overrides WHERE scenario_id = ?')
      .bind(scenario_id).all(),
  ]);

  const phaseOverrideMap = Object.fromEntries(phaseOverrides.map(o => [o.phase_id, o]));
  const milestoneOverrideMap = Object.fromEntries(milestoneOverrides.map(o => [o.milestone_id, o]));

  const phases = basePhases.map(p => ({
    ...p,
    override: phaseOverrideMap[p.id]
      ? { start_date: phaseOverrideMap[p.id].start_date, end_date: phaseOverrideMap[p.id].end_date, duration_days: phaseOverrideMap[p.id].duration_days }
      : null,
  }));

  const milestones = baseMilestones.map(m => ({
    ...m,
    override: milestoneOverrideMap[m.id]
      ? { target_date: milestoneOverrideMap[m.id].target_date }
      : null,
  }));

  return json({ phases, milestones });
}

// POST — upsert phase or milestone override
// Body: { type: 'phase', scenario_id, phase_id, start_date, end_date, duration_days }
// Body: { type: 'milestone', scenario_id, milestone_id, target_date }
async function handlePost(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const body = await request.json();
  const { type, scenario_id } = body;

  if (!scenario_id) return json({ error: 'scenario_id is required' }, 400);

  const grantEnd = await getGrantEndDateForScenario(env, scenario_id);

  if (type === 'phase') {
    const { phase_id, start_date, end_date, duration_days } = body;
    if (!phase_id) return json({ error: 'phase_id is required' }, 400);

    if (grantEnd && end_date && end_date > grantEnd) {
      return json({ error: `Phase end date (${end_date}) exceeds the Grant Period of Performance (${grantEnd}).` }, 400);
    }

    await env.DB.prepare(`
      INSERT INTO scenario_phase_overrides (scenario_id, phase_id, start_date, end_date, duration_days)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(scenario_id, phase_id) DO UPDATE SET
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        duration_days = excluded.duration_days
    `).bind(scenario_id, phase_id, start_date || null, end_date || null, duration_days || null).run();

    const override = await env.DB.prepare(
      'SELECT * FROM scenario_phase_overrides WHERE scenario_id = ? AND phase_id = ?'
    ).bind(scenario_id, phase_id).first();

    return json({ override });
  }

  if (type === 'milestone') {
    const { milestone_id, target_date } = body;
    if (!milestone_id) return json({ error: 'milestone_id is required' }, 400);

    if (grantEnd && target_date && target_date > grantEnd) {
      return json({ error: `Milestone target date (${target_date}) exceeds the Grant Period of Performance (${grantEnd}).` }, 400);
    }

    await env.DB.prepare(`
      INSERT INTO scenario_milestone_overrides (scenario_id, milestone_id, target_date)
      VALUES (?, ?, ?)
      ON CONFLICT(scenario_id, milestone_id) DO UPDATE SET
        target_date = excluded.target_date
    `).bind(scenario_id, milestone_id, target_date || null).run();

    const override = await env.DB.prepare(
      'SELECT * FROM scenario_milestone_overrides WHERE scenario_id = ? AND milestone_id = ?'
    ).bind(scenario_id, milestone_id).first();

    return json({ override });
  }

  return json({ error: 'type must be "phase" or "milestone"' }, 400);
}

// DELETE ?type=phase&scenario_id=N&phase_id=M  OR  ?type=milestone&scenario_id=N&milestone_id=M
async function handleDelete(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const scenario_id = url.searchParams.get('scenario_id');

  if (!scenario_id) return json({ error: 'scenario_id is required' }, 400);

  if (type === 'phase') {
    const phase_id = url.searchParams.get('phase_id');
    if (!phase_id) return json({ error: 'phase_id is required' }, 400);
    await env.DB.prepare(
      'DELETE FROM scenario_phase_overrides WHERE scenario_id = ? AND phase_id = ?'
    ).bind(scenario_id, phase_id).run();
    return json({ success: true });
  }

  if (type === 'milestone') {
    const milestone_id = url.searchParams.get('milestone_id');
    if (!milestone_id) return json({ error: 'milestone_id is required' }, 400);
    await env.DB.prepare(
      'DELETE FROM scenario_milestone_overrides WHERE scenario_id = ? AND milestone_id = ?'
    ).bind(scenario_id, milestone_id).run();
    return json({ success: true });
  }

  return json({ error: 'type must be "phase" or "milestone"' }, 400);
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  if (context.request.method === 'POST') return handlePost(context);
  if (context.request.method === 'DELETE') return handleDelete(context);
  return new Response('Method Not Allowed', { status: 405 });
}
