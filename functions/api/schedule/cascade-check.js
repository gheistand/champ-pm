import { json, requireAdmin } from '../../_utils.js';

async function handleGet(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const url = new URL(request.url);
  const project_id = url.searchParams.get('project_id');
  const scenario_id = url.searchParams.get('scenario_id');

  if (!project_id) return json({ error: 'project_id is required' }, 400);

  // Find all downstream dependencies of this project
  const { results: deps } = await env.DB.prepare(`
    SELECT pd.id, pd.downstream_project_id, pd.upstream_milestone_id, pd.dependency_label,
           p.name as downstream_project_name
    FROM project_dependencies pd
    JOIN projects p ON p.id = pd.downstream_project_id
    WHERE pd.upstream_project_id = ?
  `).bind(project_id).all();

  if (deps.length === 0) return json({ warnings: [] });

  const warnings = [];

  for (const dep of deps) {
    let upstreamDate = null;
    let milestoneLabel = dep.dependency_label || 'Upstream Milestone';

    if (dep.upstream_milestone_id) {
      // Get base milestone date and label
      const ms = await env.DB.prepare(
        'SELECT label, target_date FROM schedule_milestones WHERE id = ?'
      ).bind(dep.upstream_milestone_id).first();
      if (ms) {
        milestoneLabel = ms.label;
        upstreamDate = ms.target_date;
      }

      // Apply scenario override if present
      if (scenario_id && upstreamDate) {
        const override = await env.DB.prepare(
          'SELECT target_date FROM scenario_milestone_overrides WHERE scenario_id = ? AND milestone_id = ?'
        ).bind(scenario_id, dep.upstream_milestone_id).first();
        if (override?.target_date) upstreamDate = override.target_date;
      }
    }

    if (!upstreamDate) continue;

    // Get downstream project's earliest phase start date
    const downstreamStart = await env.DB.prepare(
      'SELECT MIN(start_date) as start_date FROM schedule_phases WHERE project_id = ?'
    ).bind(dep.downstream_project_id).first();

    if (!downstreamStart?.start_date) continue;

    if (upstreamDate > downstreamStart.start_date) {
      const upMonth = new Date(upstreamDate + 'T00:00:00Z')
        .toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
      const downMonth = new Date(downstreamStart.start_date + 'T00:00:00Z')
        .toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
      warnings.push({
        downstream_project_id: dep.downstream_project_id,
        downstream_project_name: dep.downstream_project_name,
        upstream_milestone_label: milestoneLabel,
        upstream_milestone_date: upstreamDate,
        downstream_start_date: downstreamStart.start_date,
        message: `${milestoneLabel} (${upMonth}) is after ${dep.downstream_project_name} start (${downMonth}). Downstream project may need to be rescheduled.`,
      });
    }
  }

  return json({ warnings });
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  return new Response('Method Not Allowed', { status: 405 });
}
