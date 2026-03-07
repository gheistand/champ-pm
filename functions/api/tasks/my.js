import { json } from '../../_utils.js';

export async function onRequestGet(context) {
  const { env, data } = context;

  const { results: tasks } = await env.DB.prepare(`
    SELECT t.*,
      p.name as project_name,
      g.name as grant_name,
      g.id as grant_id,
      a.allocated_hours,
      a.allocated_pct,
      COALESCE(SUM(te.hours), 0) as hours_logged,
      (a.allocated_hours - COALESCE(SUM(te.hours), 0)) as hours_remaining
    FROM tasks t
    JOIN assignments a ON a.task_id = t.id AND a.user_id = ?
    JOIN projects p ON p.id = t.project_id
    JOIN grants g ON g.id = p.grant_id
    LEFT JOIN timesheet_entries te ON te.task_id = t.id AND te.user_id = ?
    WHERE t.status = 'active'
    GROUP BY t.id
    ORDER BY g.name, p.name, t.name
  `).bind(data.userId, data.userId).all();

  return json({ tasks });
}
