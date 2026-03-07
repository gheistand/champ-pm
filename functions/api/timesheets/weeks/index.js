import { json } from '../../../_utils.js';

export async function onRequestGet(context) {
  const { env, data } = context;

  let query;
  let params = [];

  if (data.role === 'admin') {
    query = `
      SELECT tw.*,
        u.name as user_name, u.email as user_email,
        COALESCE(SUM(te.hours), 0) as total_hours
      FROM timesheet_weeks tw
      JOIN users u ON u.id = tw.user_id
      LEFT JOIN timesheet_entries te
        ON te.user_id = tw.user_id
        AND te.entry_date >= tw.week_start
        AND te.entry_date <= date(tw.week_start, '+6 days')
      GROUP BY tw.id
      ORDER BY tw.submitted_at DESC
    `;
  } else {
    query = `
      SELECT tw.*,
        COALESCE(SUM(te.hours), 0) as total_hours
      FROM timesheet_weeks tw
      LEFT JOIN timesheet_entries te
        ON te.user_id = tw.user_id
        AND te.entry_date >= tw.week_start
        AND te.entry_date <= date(tw.week_start, '+6 days')
      WHERE tw.user_id = ?
      GROUP BY tw.id
      ORDER BY tw.week_start DESC
    `;
    params.push(data.userId);
  }

  const { results: weeks } = await env.DB.prepare(query).bind(...params).all();
  return json({ weeks });
}
