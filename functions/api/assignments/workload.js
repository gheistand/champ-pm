import { json, requireAdmin } from '../../_utils.js';

export async function onRequestGet(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const url = new URL(request.url);
  const week = url.searchParams.get('week'); // YYYY-MM-DD Monday
  const grant_id = url.searchParams.get('grant_id');
  const project_id = url.searchParams.get('project_id');

  if (!week) {
    return json({ error: 'week parameter is required (YYYY-MM-DD Monday)' }, 400);
  }

  // Calculate week end (Sunday)
  const weekEnd = new Date(week + 'T00:00:00Z');
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  // Get all active staff
  const { results: staff } = await env.DB.prepare(`
    SELECT u.id, u.name, u.title, u.role
    FROM users u
    WHERE u.is_active = 1
    ORDER BY u.name
  `).all();

  // Get week submission statuses
  const { results: weekStatuses } = await env.DB.prepare(`
    SELECT tw.user_id, tw.status
    FROM timesheet_weeks tw
    WHERE tw.week_start = ?
  `).bind(week).all();

  const weekStatusMap = {};
  weekStatuses.forEach((tw) => { weekStatusMap[tw.user_id] = tw.status; });

  // Get timesheet entries for the week
  let hoursQuery = `
    SELECT te.user_id, te.hours, te.task_id,
      t.project_id, p.grant_id
    FROM timesheet_entries te
    JOIN tasks t ON t.id = te.task_id
    JOIN projects p ON p.id = t.project_id
    WHERE te.entry_date >= ? AND te.entry_date <= ?
  `;
  const hoursParams = [week, weekEndStr];
  if (grant_id) { hoursQuery += ' AND p.grant_id = ?'; hoursParams.push(grant_id); }
  if (project_id) { hoursQuery += ' AND t.project_id = ?'; hoursParams.push(project_id); }

  const { results: entries } = await env.DB.prepare(hoursQuery).bind(...hoursParams).all();

  // Aggregate hours per user by submission status
  const hoursMap = {};
  for (const entry of entries) {
    if (!hoursMap[entry.user_id]) {
      hoursMap[entry.user_id] = { approved: 0, submitted: 0, draft: 0 };
    }
    const weekStatus = weekStatusMap[entry.user_id] || 'draft';
    if (weekStatus === 'approved') {
      hoursMap[entry.user_id].approved += entry.hours;
    } else if (weekStatus === 'submitted') {
      hoursMap[entry.user_id].submitted += entry.hours;
    } else {
      hoursMap[entry.user_id].draft += entry.hours;
    }
  }

  // Get active assignments
  let assignQuery = `
    SELECT a.*,
      u.name as user_name,
      t.name as task_name, t.status as task_status,
      p.name as project_name,
      g.name as grant_name, g.id as grant_id,
      COALESCE(SUM(te.hours), 0) as hours_logged,
      (a.allocated_hours - COALESCE(SUM(te.hours), 0)) as hours_remaining
    FROM assignments a
    JOIN users u ON u.id = a.user_id
    JOIN tasks t ON t.id = a.task_id
    JOIN projects p ON p.id = t.project_id
    JOIN grants g ON g.id = p.grant_id
    LEFT JOIN timesheet_entries te ON te.task_id = a.task_id AND te.user_id = a.user_id
    WHERE t.status = 'active' AND u.is_active = 1
  `;
  const assignParams = [];
  if (grant_id) { assignQuery += ' AND g.id = ?'; assignParams.push(grant_id); }
  if (project_id) { assignQuery += ' AND p.id = ?'; assignParams.push(project_id); }
  assignQuery += ' GROUP BY a.id ORDER BY u.name, t.name';

  const { results: assignments } = await env.DB.prepare(assignQuery).bind(...assignParams).all();

  const workload = staff.map((s) => ({
    ...s,
    hours: hoursMap[s.id] || { approved: 0, submitted: 0, draft: 0 },
    week_status: weekStatusMap[s.id] || 'no_submission',
    assignments: assignments.filter((a) => a.user_id === s.id),
  }));

  return json({ workload, week, week_end: weekEndStr });
}
