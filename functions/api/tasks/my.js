import { json } from '../../_utils.js';

export async function onRequestGet(context) {
  const { env, data } = context;

  // Assigned tasks
  const { results: assigned } = await env.DB.prepare(`
    SELECT t.*,
      p.name as project_name,
      g.name as grant_name,
      g.id as grant_id,
      a.allocated_hours,
      a.allocated_pct,
      COALESCE(SUM(te.hours), 0) as hours_logged,
      (a.allocated_hours - COALESCE(SUM(te.hours), 0)) as hours_remaining,
      0 as is_overhead
    FROM tasks t
    JOIN assignments a ON a.task_id = t.id AND a.user_id = ?
    JOIN projects p ON p.id = t.project_id
    JOIN grants g ON g.id = p.grant_id
    LEFT JOIN timesheet_entries te ON te.task_id = t.id AND te.user_id = ?
    WHERE t.status = 'active'
    GROUP BY t.id
    ORDER BY g.name, p.name, t.name
  `).bind(data.userId, data.userId).all();

  // Overhead tasks (Leave, PD, etc.) — available to all staff regardless of assignment
  const { results: overhead } = await env.DB.prepare(`
    SELECT t.*,
      p.name as project_name,
      g.name as grant_name,
      g.id as grant_id,
      NULL as allocated_hours,
      NULL as allocated_pct,
      COALESCE(SUM(te.hours), 0) as hours_logged,
      NULL as hours_remaining,
      1 as is_overhead
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN grants g ON g.id = p.grant_id
    LEFT JOIN timesheet_entries te ON te.task_id = t.id AND te.user_id = ?
    WHERE g.grant_number = 'OVERHEAD' AND t.status = 'active'
    GROUP BY t.id
    ORDER BY t.name
  `).bind(data.userId).all();

  // Deduplicate: if a task is in both (unlikely but possible), keep assigned version
  const assignedIds = new Set(assigned.map(t => t.id));
  const overheadFiltered = overhead.filter(t => !assignedIds.has(t.id));

  return json({ tasks: [...assigned, ...overheadFiltered] });
}
