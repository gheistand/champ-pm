import { json, requireAdmin } from '../../_utils.js';

export async function onRequestGet(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  const url = new URL(request.url);
  const grant_id = url.searchParams.get('grant_id'); // optional; 'all' or specific id
  const start_date = url.searchParams.get('start_date');
  const end_date = url.searchParams.get('end_date');
  const user_id = url.searchParams.get('user_id'); // optional
  const format = url.searchParams.get('format'); // 'csv' or 'json'

  if (!start_date || !end_date) {
    return json({ error: 'start_date and end_date are required' }, 400);
  }

  // Build WHERE clauses
  const conditions = ['te.entry_date >= ?', 'te.entry_date <= ?'];
  const params = [start_date, end_date];

  if (grant_id && grant_id !== 'all') {
    conditions.push('g.id = ?');
    params.push(grant_id);
  }
  if (user_id) {
    conditions.push('te.user_id = ?');
    params.push(user_id);
  }

  const where = conditions.join(' AND ');

  // Main report query — hours aggregated per user × task × project × grant
  const { results: rows } = await env.DB.prepare(`
    SELECT
      te.user_id,
      u.name as user_name,
      u.appointment_type,
      te.task_id,
      t.name as task_name,
      p.id as project_id,
      p.name as project_name,
      g.id as grant_id,
      g.name as grant_name,
      g.grant_number,
      SUM(te.hours) as hours,
      -- Salary at time of most recent record before period end
      (
        SELECT sr2.annual_salary FROM salary_records sr2
        WHERE sr2.user_id = te.user_id AND sr2.effective_date <= ?
        ORDER BY sr2.effective_date DESC LIMIT 1
      ) as annual_salary,
      (
        SELECT sr2.fringe_rate FROM salary_records sr2
        WHERE sr2.user_id = te.user_id AND sr2.effective_date <= ?
        ORDER BY sr2.effective_date DESC LIMIT 1
      ) as fringe_rate,
      (
        SELECT gfr.fa_rate FROM grant_fa_rates gfr
        WHERE gfr.grant_id = g.id
        ORDER BY gfr.effective_date DESC LIMIT 1
      ) as fa_rate
    FROM timesheet_entries te
    JOIN users u ON u.id = te.user_id
    JOIN tasks t ON t.id = te.task_id
    JOIN projects p ON p.id = t.project_id
    JOIN grants g ON g.id = p.grant_id
    WHERE ${where}
    GROUP BY te.user_id, te.task_id, p.id, g.id
    ORDER BY g.name, p.name, u.name, t.name
  `).bind(end_date, end_date, ...params).all();

  // Compute costs
  const report = rows.map(r => {
    const hours = Number(r.hours) || 0;
    const salary = Number(r.annual_salary) || 0;
    const fringe = Number(r.fringe_rate) || 0;
    const fa = Number(r.fa_rate) || 0;
    const hourly_loaded = salary > 0 ? (salary / 2080) * (1 + fringe) : 0;
    const personnel_cost = hours * hourly_loaded;
    const fa_cost = personnel_cost * fa;
    const total_cost = personnel_cost + fa_cost;

    return {
      user_id: r.user_id,
      user_name: r.user_name,
      grant_id: r.grant_id,
      grant_name: r.grant_name,
      grant_number: r.grant_number,
      project_id: r.project_id,
      project_name: r.project_name,
      task_id: r.task_id,
      task_name: r.task_name,
      hours: Math.round(hours * 100) / 100,
      annual_salary: salary,
      fringe_rate: fringe,
      fa_rate: fa,
      hourly_loaded: Math.round(hourly_loaded * 100) / 100,
      personnel_cost: Math.round(personnel_cost * 100) / 100,
      fa_cost: Math.round(fa_cost * 100) / 100,
      total_cost: Math.round(total_cost * 100) / 100,
    };
  });

  // Summary totals
  const totals = report.reduce((acc, r) => ({
    hours: acc.hours + r.hours,
    personnel_cost: acc.personnel_cost + r.personnel_cost,
    fa_cost: acc.fa_cost + r.fa_cost,
    total_cost: acc.total_cost + r.total_cost,
  }), { hours: 0, personnel_cost: 0, fa_cost: 0, total_cost: 0 });

  // Build per-grant summaries
  const byGrant = {};
  for (const r of report) {
    if (!byGrant[r.grant_id]) {
      byGrant[r.grant_id] = {
        grant_id: r.grant_id,
        grant_name: r.grant_name,
        grant_number: r.grant_number,
        hours: 0, personnel_cost: 0, fa_cost: 0, total_cost: 0,
      };
    }
    byGrant[r.grant_id].hours += r.hours;
    byGrant[r.grant_id].personnel_cost += r.personnel_cost;
    byGrant[r.grant_id].fa_cost += r.fa_cost;
    byGrant[r.grant_id].total_cost += r.total_cost;
  }

  if (format === 'csv') {
    const headers = [
      'Grant', 'Grant #', 'Project', 'Task', 'Staff', 'Hours',
      'Annual Salary', 'Fringe Rate', 'F&A Rate',
      'Personnel Cost', 'F&A Cost', 'Total Cost',
    ];
    const csvRows = [headers.join(',')];
    for (const r of report) {
      csvRows.push([
        `"${r.grant_name}"`,
        `"${r.grant_number}"`,
        `"${r.project_name}"`,
        `"${r.task_name}"`,
        `"${r.user_name}"`,
        r.hours,
        r.annual_salary,
        (r.fringe_rate * 100).toFixed(1) + '%',
        (r.fa_rate * 100).toFixed(1) + '%',
        r.personnel_cost.toFixed(2),
        r.fa_cost.toFixed(2),
        r.total_cost.toFixed(2),
      ].join(','));
    }
    // Totals row
    csvRows.push([
      '"TOTAL"', '', '', '', '',
      Math.round(totals.hours * 100) / 100,
      '', '', '',
      totals.personnel_cost.toFixed(2),
      totals.fa_cost.toFixed(2),
      totals.total_cost.toFixed(2),
    ].join(','));

    return new Response(csvRows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="champ-report-${start_date}-${end_date}.csv"`,
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  return json({
    start_date,
    end_date,
    rows: report,
    totals: {
      hours: Math.round(totals.hours * 100) / 100,
      personnel_cost: Math.round(totals.personnel_cost * 100) / 100,
      fa_cost: Math.round(totals.fa_cost * 100) / 100,
      total_cost: Math.round(totals.total_cost * 100) / 100,
    },
    by_grant: Object.values(byGrant).map(g => ({
      ...g,
      hours: Math.round(g.hours * 100) / 100,
      personnel_cost: Math.round(g.personnel_cost * 100) / 100,
      fa_cost: Math.round(g.fa_cost * 100) / 100,
      total_cost: Math.round(g.total_cost * 100) / 100,
    })),
  });
}
