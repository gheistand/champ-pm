import { json, requireAdmin } from '../../_utils.js';

function fyStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const year = d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  return `${year}-07-01`;
}

export async function onRequestGet(context) {
  const { env, data } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  try {
    const today = new Date().toISOString().split('T')[0];
    const fy = fyStart(today);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    const [fyHours, weekHours, recentWeeks, topProjects, activeStaff] = await Promise.all([

      // Total hours logged this FY
      env.DB.prepare(`
        SELECT ROUND(SUM(te.hours), 1) as hours
        FROM timesheet_entries te
        JOIN tasks t ON t.id = te.task_id
        JOIN projects p ON p.id = t.project_id
        JOIN grants g ON g.id = p.grant_id
        WHERE te.entry_date >= ? AND g.grant_number != 'OVERHEAD'
      `).bind(fy).first(),

      // Hours logged past 7 days
      env.DB.prepare(`
        SELECT ROUND(SUM(hours), 1) as hours
        FROM timesheet_entries WHERE entry_date >= ?
      `).bind(weekAgo).first(),

      // 8 most recent timesheet week submissions
      env.DB.prepare(`
        SELECT tw.id, tw.week_start, tw.status, tw.submitted_at,
          u.name as user_name,
          ROUND(COALESCE(SUM(te.hours), 0), 1) as hours
        FROM timesheet_weeks tw
        JOIN users u ON u.id = tw.user_id
        LEFT JOIN timesheet_entries te
          ON te.user_id = tw.user_id
          AND te.entry_date >= tw.week_start
          AND te.entry_date <= date(tw.week_start, '+6 days')
        WHERE tw.status IN ('submitted', 'approved')
        GROUP BY tw.id
        ORDER BY COALESCE(tw.submitted_at, tw.created_at) DESC
        LIMIT 8
      `).all(),

      // Top 6 projects by hours this FY (exclude overhead)
      env.DB.prepare(`
        SELECT p.name as project_name, g.name as grant_name,
          ROUND(SUM(te.hours), 1) as hours
        FROM timesheet_entries te
        JOIN tasks t ON t.id = te.task_id
        JOIN projects p ON p.id = t.project_id
        JOIN grants g ON g.id = p.grant_id
        WHERE te.entry_date >= ? AND g.grant_number != 'OVERHEAD'
        GROUP BY p.id
        ORDER BY hours DESC
        LIMIT 6
      `).bind(fy).all(),

      // Staff active in last 30 days
      env.DB.prepare(`
        SELECT COUNT(DISTINCT user_id) as count
        FROM timesheet_entries WHERE entry_date >= ?
      `).bind(monthAgo).first(),
    ]);

    return json({
      fy_start: fy,
      fy_hours: fyHours?.hours || 0,
      week_hours: weekHours?.hours || 0,
      active_staff_30d: activeStaff?.count || 0,
      recent_weeks: recentWeeks.results || [],
      top_projects: topProjects.results || [],
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
