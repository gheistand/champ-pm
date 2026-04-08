import { json, requireAdmin } from '../../_utils.js';

async function handleGet(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const url = new URL(request.url);
  const grantStatus = url.searchParams.get('grant_status') || 'active';
  const projectType = url.searchParams.get('project_type');
  const studyAreaId = url.searchParams.get('study_area_id');

  // 1. Grants
  let grantWhere = grantStatus === 'all' ? '' : `WHERE g.status = '${grantStatus}'`;
  const { results: grants } = await env.DB.prepare(`
    SELECT id, name, grant_number, start_date, end_date, status, funder
    FROM grants g
    ${grantWhere}
    ORDER BY g.start_date
  `).all();

  if (grants.length === 0) {
    return json({ grants: [], study_areas: [], dependencies: [] });
  }

  const grantIds = grants.map(g => g.id);
  const grantPlaceholders = grantIds.map(() => '?').join(',');

  // 2. Projects
  let projectWhere = `WHERE p.grant_id IN (${grantPlaceholders})`;
  const projectBinds = [...grantIds];
  if (projectType) {
    projectWhere += ` AND p.project_type = ?`;
    projectBinds.push(projectType);
  }
  if (studyAreaId) {
    projectWhere += ` AND p.study_area_id = ?`;
    projectBinds.push(studyAreaId);
  }

  const { results: projects } = await env.DB.prepare(`
    SELECT p.id, p.grant_id, p.name, p.project_type, p.study_area_id,
           p.start_date, p.end_date, p.status
    FROM projects p
    ${projectWhere}
    ORDER BY p.start_date
  `).bind(...projectBinds).all();

  const projectIds = projects.map(p => p.id);

  if (projectIds.length === 0) {
    const { results: studyAreas } = await env.DB.prepare(
      `SELECT id, name, status FROM study_areas ORDER BY name`
    ).all();
    return json({ grants: grants.map(g => ({ ...g, projects: [] })), study_areas: studyAreas, dependencies: [] });
  }

  const projectPlaceholders = projectIds.map(() => '?').join(',');

  // 3. Schedule phases + 4. Key milestones — run in parallel
  // Note: fetch all dependencies without IN clause to avoid D1's 100-param limit;
  // filter in JS. Dependencies table is small so this is fine.
  const [phasesRes, milestonesRes, studyAreasRes, depsRes] = await Promise.all([
    env.DB.prepare(`
      SELECT id, project_id, label, start_date, end_date, display_order
      FROM schedule_phases
      WHERE project_id IN (${projectPlaceholders})
      ORDER BY project_id, display_order, id
    `).bind(...projectIds).all(),

    env.DB.prepare(`
      SELECT id, project_id, label, target_date, is_key_decision, is_pop_anchor
      FROM schedule_milestones
      WHERE project_id IN (${projectPlaceholders})
        AND (is_key_decision = 1 OR is_pop_anchor = 1)
      ORDER BY project_id, target_date
    `).bind(...projectIds).all(),

    env.DB.prepare(
      `SELECT id, name, status FROM study_areas ORDER BY name`
    ).all(),

    // Fetch all dependencies — filter in JS to avoid double-binding projectIds (D1 100-param limit)
    env.DB.prepare(`
      SELECT pd.id, pd.upstream_project_id, pd.downstream_project_id,
             pd.upstream_milestone_id, pd.dependency_label
      FROM project_dependencies pd
    `).all(),
  ]);

  // Filter dependencies to only those involving our projects
  const projectIdSet = new Set(projectIds);
  const filteredDeps = depsRes.results.filter(
    d => projectIdSet.has(d.upstream_project_id) || projectIdSet.has(d.downstream_project_id)
  );

  // Group phases and milestones by project_id
  const phasesByProject = {};
  for (const ph of phasesRes.results) {
    if (!phasesByProject[ph.project_id]) phasesByProject[ph.project_id] = [];
    phasesByProject[ph.project_id].push(ph);
  }

  const milestonesByProject = {};
  for (const ms of milestonesRes.results) {
    if (!milestonesByProject[ms.project_id]) milestonesByProject[ms.project_id] = [];
    milestonesByProject[ms.project_id].push(ms);
  }

  // Attach projects to grants
  const projectsByGrant = {};
  for (const p of projects) {
    if (!projectsByGrant[p.grant_id]) projectsByGrant[p.grant_id] = [];
    projectsByGrant[p.grant_id].push({
      ...p,
      phases: phasesByProject[p.id] || [],
      milestones: milestonesByProject[p.id] || [],
    });
  }

  const grantsWithProjects = grants.map(g => ({
    ...g,
    projects: projectsByGrant[g.id] || [],
  }));

  // Build study_areas with project_ids
  const studyAreaProjectIds = {};
  for (const p of projects) {
    if (p.study_area_id) {
      if (!studyAreaProjectIds[p.study_area_id]) studyAreaProjectIds[p.study_area_id] = [];
      studyAreaProjectIds[p.study_area_id].push(p.id);
    }
  }

  const studyAreas = studyAreasRes.results.map(sa => ({
    ...sa,
    project_ids: studyAreaProjectIds[sa.id] || [],
  }));

  return json({
    grants: grantsWithProjects,
    study_areas: studyAreas,
    dependencies: filteredDeps,
  });
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context);
  return new Response('Method Not Allowed', { status: 405 });
}
