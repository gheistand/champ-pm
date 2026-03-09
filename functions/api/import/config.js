import { json, requireAdmin } from '../../_utils.js';

// Returns everything the client needs to map a CSV import:
// - project map (csv_name → task_id)
// - staff map (csv_name overrides + all users for auto-matching)
export async function onRequestGet(context) {
  const { env, data } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  try {
    const [projMap, staffOverrides, users] = await Promise.all([
      env.DB.prepare('SELECT csv_name, task_id, notes FROM timesheet_project_map ORDER BY csv_name').all(),
      env.DB.prepare('SELECT csv_name, user_id, notes FROM timesheet_staff_map').all(),
      env.DB.prepare('SELECT id, name FROM users ORDER BY name').all(),
    ]);

    return json({
      project_map: projMap.results || [],
      staff_overrides: staffOverrides.results || [],
      users: users.results || [],
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
