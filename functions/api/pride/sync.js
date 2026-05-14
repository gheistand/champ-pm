import { json } from '../../_utils.js';

// UIN → CHAMP-PM user_id mapping (stable university IDs)
const UIN_MAP = {
  '656625028': 'carnold3',
  '678026881': 'arpitab2',
  '651471355': 'gbuckley',
  '656782942': 'byard',
  '651194553': 'bchaille',
  '658082067': 'mlfuller',
  '677369379': 'fghiami',
  '656335506': 'hanstad',
  '671373662': 'heistand',
  '664080818': 'nazmul',
  '651893236': 'mrjeffer',
  '667694639': 'asjobe',
  '656840055': 'tannerj',
  '660559576': 'marnilaw',
  '660875246': 'clebeda',
  '676728334': 'makdah2',
  '656414988': 'bmcvay',
  '674585367': 'rmeekma',
  '654853452': 'smilton',
  '674360335': 'spantha',
  '654781180': 'spaudel',
  '658397873': 'powell',
  '664194340': 'sangwan2',
  '665996363': 'astillwell', // Stillwell, Ashlynn — may not be in D1 yet
  '665286055': 'abthomas',
  '656003841': 'zaloudek',
};

// Parse "Feb 25, 2027" → "2027-02-25"
function parseJobEndDate(str) {
  if (!str) return null;
  const months = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 };
  const m = str.match(/^(\w{3})\s+(\d+),\s+(\d{4})$/);
  if (!m) return null;
  const [, mon, day, year] = m;
  if (!months[mon]) return null;
  return `${year}-${String(months[mon]).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

export async function onRequest(context) {
  const { env, request } = context;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': 'https://pride.prairie.illinois.edu',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  // Authenticate via pre-shared token
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/, '').trim();
  const expectedToken = env.PRIDE_SYNC_TOKEN;

  if (!expectedToken) {
    return json({ error: 'PRIDE_SYNC_TOKEN is not configured' }, 503);
  }
  if (!token || token !== expectedToken) {
    return json({ error: 'Invalid or missing sync token' }, 401);
  }

  const body = await request.json().catch(() => null);
  if (!body?.employees || !Array.isArray(body.employees)) {
    return json({ error: 'employees array is required' }, 400);
  }

  const today = new Date().toISOString().slice(0, 10);
  const results = {
    salary_updates: [],
    salary_matches: [],
    salary_discrepancies: [],
    end_date_updates: [],
    unknown_uins: [],
    skipped: [],
  };

  for (const emp of body.employees) {
    const { uin, name, salary, emp_type, job_end_date } = emp;

    const userId = UIN_MAP[uin];
    if (!userId) {
      results.unknown_uins.push({ uin, name });
      continue;
    }

    // ── Salary sync ──────────────────────────────────────────────────────────
    const currentSalary = await env.DB.prepare(`
      SELECT annual_salary, effective_date
      FROM salary_records
      WHERE user_id = ?
      ORDER BY effective_date DESC
      LIMIT 1
    `).bind(userId).first();

    if (!currentSalary) {
      results.skipped.push({ user_id: userId, name, reason: 'no existing salary records' });
    } else if (Math.abs(currentSalary.annual_salary - salary) <= 1) {
      results.salary_matches.push({ user_id: userId, name, salary });
    } else {
      const diff = salary - currentSalary.annual_salary;
      const pride_higher = diff > 0;

      // Flag large unexplained discrepancies vs insert small adjustments
      // Rule: if PRIDE is higher, treat as an update; if PRIDE is lower, flag for review
      if (!pride_higher) {
        results.salary_discrepancies.push({
          user_id: userId,
          name,
          champ_pm_salary: currentSalary.annual_salary,
          pride_salary: salary,
          diff,
          note: 'CHAMP-PM is higher than PRIDE — review before updating',
        });
      } else {
        // Insert new salary record (append-only rule)
        await env.DB.prepare(`
          INSERT INTO salary_records
            (user_id, annual_salary, fringe_rate, appointment_type, effective_date, change_type, notes, created_by)
          VALUES (?, ?, 0.451, 'surs', ?, 'annual_increase', ?, 'pride-sync')
        `).bind(
          userId,
          salary,
          today,
          `Synced from PRIDE staffplan.php on ${today}. Previous: $${currentSalary.annual_salary.toLocaleString()}`
        ).run();

        results.salary_updates.push({
          user_id: userId,
          name,
          old_salary: currentSalary.annual_salary,
          new_salary: salary,
          diff,
        });
      }
    }

    // ── Job end date sync ────────────────────────────────────────────────────
    if (job_end_date) {
      const isoDate = parseJobEndDate(job_end_date);
      if (isoDate) {
        const user = await env.DB.prepare('SELECT end_date FROM users WHERE id=?').bind(userId).first();
        if (user && user.end_date !== isoDate) {
          await env.DB.prepare('UPDATE users SET end_date=? WHERE id=?').bind(isoDate, userId).run();
          results.end_date_updates.push({ user_id: userId, name, end_date: isoDate });
        }
      }
    }
  }

  return new Response(JSON.stringify(results, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'https://pride.prairie.illinois.edu',
    },
  });
}
