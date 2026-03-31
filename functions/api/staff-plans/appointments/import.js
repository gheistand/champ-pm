import { json, requireAdmin } from '../../../_utils.js';

// Staff name → user_id map
const STAFF_MAP = {
  'Camden Arnold': 'carnold3',
  'Arpita Banerjee': 'arpitab2',
  'Greta Buckley': 'gbuckley',
  'Gregory Byard': 'byard',
  'Brian Chaille': 'bchaille',
  'Diana Davisson': 'dianad',
  'Michelle Fuller': 'mlfuller',
  'Christopher Hanstad': 'hanstad',
  'Glenn Heistand': 'heistand',
  'Nazmul Huda': 'nazmul',
  'Matthew Jefferson': 'mrjeffer',
  'Addison Jobe': 'asjobe',
  'Tanner Jones': 'tannerj',
  'Love Kumar': 'lkumar',
  'Marni Law': 'marnilaw',
  'Caitlin Lebeda': 'clebeda',
  'Lena Makdah': 'makdah2',
  'Brad McVay': 'bmcvay',
  'Ryan Meekma': 'rmeekma',
  'Sarah Milton': 'smilton',
  'Samikshya Pantha': 'spantha',
  'Sabin Paudel': 'spaudel',
  'James Powell': 'powell',
  'Mary Richardson': 'mjr',
  'Nikhil Sangwan': 'sangwan2',
  'Fereshteh Ghiami Shomami': 'fghiami',
  'Aaron Thomas': 'abthomas',
  'Zoe Zaloudek': 'zaloudek',
};

// Normalize date from M/D/YYYY or YYYY-MM-DD to YYYY-MM-DD
function normalizeDate(d) {
  if (!d) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const parts = d.split('/');
  if (parts.length === 3) {
    const [m, day, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return d;
}

export async function onRequest(context) {
  const { env, data, request } = context;
  const denied = requireAdmin(data);
  if (denied) return denied;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const body = await request.json();
  // body.rows: array of spreadsheet row objects
  // Expected columns: Employee_Name, Employee_Type, Period_Start_Date, Period_End_Date,
  //   Chart, Fund, Org, Program, Activity, Allocation_Percent, Salary_Rate, Full_Account_String
  const { rows, replace_user_id } = body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return json({ error: 'rows array is required' }, 400);
  }

  const errors = [];
  const toInsert = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = r.Employee_Name || r.employee_name || '';
    const userId = STAFF_MAP[name] || replace_user_id;
    if (!userId) {
      errors.push(`Row ${i + 1}: unknown employee "${name}"`);
      continue;
    }

    const fundNumber = String(r.Fund || r.fund_number || '').trim();
    const periodStart = normalizeDate(r.Period_Start_Date || r.period_start);
    const periodEnd = normalizeDate(r.Period_End_Date || r.period_end);
    const allocationPct = parseFloat(r.Allocation_Percent || r.allocation_pct || 0);
    const salaryRate = parseFloat(r.Salary_Rate || r.salary_rate || 0) || null;

    if (!fundNumber || !periodStart || !periodEnd) {
      errors.push(`Row ${i + 1}: missing Fund, Period_Start_Date, or Period_End_Date`);
      continue;
    }

    toInsert.push({
      user_id: userId,
      fund_number: fundNumber,
      chart: parseInt(r.Chart || r.chart || 1),
      org: r.Org || r.org || null,
      program: r.Program || r.program || null,
      activity: r.Activity || r.activity || null,
      full_account_string: r.Full_Account_String || r.full_account_string || null,
      period_start: periodStart,
      period_end: periodEnd,
      allocation_pct: allocationPct,
      salary_rate: salaryRate,
      employee_type: r.Employee_Type || r.employee_type || 'AP',
    });
  }

  // Insert all valid rows
  const stmt = env.DB.prepare(`
    INSERT INTO staff_appointments
      (user_id, fund_number, chart, org, program, activity, full_account_string,
       period_start, period_end, allocation_pct, salary_rate, employee_type, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'import')
  `);

  for (const row of toInsert) {
    await stmt.bind(
      row.user_id, row.fund_number, row.chart, row.org, row.program,
      row.activity, row.full_account_string, row.period_start, row.period_end,
      row.allocation_pct, row.salary_rate, row.employee_type
    ).run();
  }

  return json({
    imported: toInsert.length,
    errors: errors.length > 0 ? errors : undefined,
  }, 201);
}
