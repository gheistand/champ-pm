import { json, requireAdmin } from '../../../../_utils.js';

export async function onRequest(context) {
  const { env, data, params, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { id: scenarioId } = params;

  const scenario = await env.DB.prepare('SELECT * FROM staff_plan_scenarios WHERE id=?').bind(scenarioId).first();
  if (!scenario) return json({ error: 'Not found' }, 404);

  const { results: rows } = await env.DB.prepare(`
    SELECT r.*, u.name as employee_name
    FROM staff_plan_scenario_rows r
    LEFT JOIN users u ON u.id = r.user_id
    WHERE r.scenario_id = ?
    ORDER BY u.name, r.period_start, r.fund_number
  `).bind(scenarioId).all();

  // Group by user for sheet-per-staff format
  const byUser = {};
  for (const r of rows) {
    const name = r.employee_name || r.user_id;
    if (!byUser[name]) byUser[name] = [];
    byUser[name].push({
      Employee_Name: name,
      Employee_Type: 'AP',
      Period_Start_Date: r.period_start,
      Period_End_Date: r.period_end,
      Chart: 1,
      Fund: r.fund_number,
      Org: null,
      Program: null,
      Activity: null,
      Allocation_Percent: r.allocation_pct,
      Salary_Rate: r.salary_rate,
      Full_Account_String: r.full_account_string,
      Notes: r.notes,
    });
  }

  return json({
    scenario_name: scenario.name,
    sheets: Object.entries(byUser).map(([name, sheetRows]) => ({
      sheet_name: name.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 31),
      rows: sheetRows,
    })),
  });
}
