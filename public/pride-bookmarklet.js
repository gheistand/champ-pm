// CHAMP-PM PRIDE Sync Bookmarklet
// Save the minified version below as a browser bookmark URL.
// Click it while on https://pride.prairie.illinois.edu/pride/staffplan3/staffplan.php

(function () {
  'use strict';

  const CHAMP_PM_URL = 'https://champ-pm.app/api/pride/sync';
  const TOKEN_KEY = 'champ_pm_pride_token';

  // ── Auth token ──────────────────────────────────────────────────────────────
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = prompt(
      'CHAMP-PM PRIDE Sync\n\n' +
      'Enter your CHAMP-PM sync token (one-time setup — will be saved locally):'
    );
    if (!token) return;
    localStorage.setItem(TOKEN_KEY, token.trim());
    token = token.trim();
  }

  // ── Verify we\'re on the right page ─────────────────────────────────────────
  if (!location.href.includes('staffplan.php')) {
    alert('Please navigate to the Monthly Staff Plan page (staffplan.php) first.');
    return;
  }

  // ── Parse the staff plan table ──────────────────────────────────────────────
  const table = document.querySelector('table.grid');
  if (!table) {
    alert('Could not find the staff plan table. Make sure the page has fully loaded.');
    return;
  }

  // Get month headers from first header row
  const headerRow = table.querySelector('tr.tableHeaderTD');
  const allHeaders = Array.from(headerRow.querySelectorAll('th')).map(th => th.textContent.trim());
  const monthHeaders = allHeaders.slice(9); // skip first 9 cols

  const employees = [];
  const rows = Array.from(table.querySelectorAll('tr'));

  let currentEmp = null;

  for (const row of rows) {
    if (row.classList.contains('tableHeaderTD')) continue;

    const cells = Array.from(row.querySelectorAll('td'));
    if (!cells.length) continue;

    // Check if this row starts a new employee (has a link to edit.php)
    const empLink = cells[0].querySelector('a[href*="edit.php?uin="]');
    if (empLink) {
      // Save previous employee
      if (currentEmp) employees.push(currentEmp);

      const uinMatch = empLink.getAttribute('href').match(/uin=(\d+)/);
      const uin = uinMatch ? uinMatch[1] : null;
      const nameText = empLink.textContent.trim();

      // salary text is after the <br> in the same cell
      const cellText = cells[0].textContent.trim();
      const salaryMatch = cellText.match(/\$([0-9,]+)\s*\((\w+)\)/);
      const salary = salaryMatch ? parseInt(salaryMatch[1].replace(/,/g, ''), 10) : 0;
      const empType = salaryMatch ? salaryMatch[2] : '';

      // Job end date is in column index 7 (0-based), but rowspan complicates it
      // Use the cell with the right position based on rowspan
      // The 8th td in this row (index 7) = Job End Date
      // But rowspan means we may not have all cells in every row
      // Safely extract: cols are [name, org, cat, title, sup, comments, nonr_end, job_end, acct, ...months]
      const jobEndDate = cells[7] ? cells[7].textContent.trim() : '';

      // Account category and monthly pcts are the last cells
      // In a new-employee row: cells = [name(rowspan), org, cat, title, sup, comments, nonr_end, job_end, acct, ...pcts]
      const acctCell = cells[8];
      const acctCategory = acctCell ? acctCell.textContent.trim() : '';
      const pcts = cells.slice(9).map(td => parseFloat(td.textContent) || 0);

      currentEmp = {
        uin,
        name: nameText,
        salary,
        emp_type: empType,
        job_end_date: jobEndDate || null,
        allocations: acctCategory ? [{ category: acctCategory, percentages: pcts }] : [],
      };
    } else {
      // Continuation row for same employee (additional account categories)
      if (!currentEmp) continue;
      const acctCell = cells[0];
      const acctCategory = acctCell ? acctCell.textContent.trim() : '';
      if (!acctCategory || acctCategory === 'Employee') continue;
      const pcts = cells.slice(1).map(td => parseFloat(td.textContent) || 0);
      currentEmp.allocations.push({ category: acctCategory, percentages: pcts });
    }
  }

  if (currentEmp) employees.push(currentEmp);

  if (!employees.length) {
    alert('No employee data found. Try reloading the page and running again.');
    return;
  }

  // ── POST to CHAMP-PM ────────────────────────────────────────────────────────
  const status = document.createElement('div');
  status.style.cssText = [
    'position:fixed', 'top:20px', 'right:20px', 'z-index:99999',
    'background:#1e40af', 'color:#fff', 'padding:12px 18px', 'border-radius:10px',
    'font:14px/1.5 system-ui,sans-serif', 'box-shadow:0 4px 20px rgba(0,0,0,.3)',
    'max-width:320px',
  ].join(';');
  status.textContent = `⏳ Syncing ${employees.length} employees to CHAMP-PM…`;
  document.body.appendChild(status);

  fetch(CHAMP_PM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
    },
    body: JSON.stringify({ employees, month_headers: monthHeaders }),
  })
    .then(r => {
      if (r.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        throw new Error('Invalid sync token — it has been cleared. Run the bookmarklet again to re-enter.');
      }
      if (!r.ok) throw new Error('Server error: ' + r.status);
      return r.json();
    })
    .then(data => {
      const lines = [
        '✅ CHAMP-PM PRIDE Sync Complete',
        '',
        `✔ Salary matches: ${data.salary_matches?.length ?? 0}`,
        `📈 Salary updates: ${data.salary_updates?.length ?? 0}`,
        data.salary_updates?.length
          ? data.salary_updates.map(u => `   ${u.name}: $${u.old_salary.toLocaleString()} → $${u.new_salary.toLocaleString()}`).join('\n')
          : '',
        data.salary_discrepancies?.length
          ? `⚠️ Discrepancies (review): ${data.salary_discrepancies.length}\n` +
            data.salary_discrepancies.map(d => `   ${d.name}: PRIDE $${d.pride_salary.toLocaleString()} vs CHAMP-PM $${d.champ_pm_salary.toLocaleString()}`).join('\n')
          : '',
        data.end_date_updates?.length
          ? `📅 End date updates: ${data.end_date_updates.length}\n` +
            data.end_date_updates.map(u => `   ${u.name}: ${u.end_date}`).join('\n')
          : '',
        data.unknown_uins?.length
          ? `❓ Unknown UIns (not in CHAMP-PM): ${data.unknown_uins.map(u => u.name).join(', ')}`
          : '',
      ].filter(Boolean).join('\n');

      status.style.background = '#166534';
      status.style.whiteSpace = 'pre';
      status.style.fontSize = '12px';
      status.textContent = lines;
      setTimeout(() => status.remove(), 15000);
    })
    .catch(err => {
      status.style.background = '#991b1b';
      status.textContent = '❌ Sync failed: ' + err.message;
      setTimeout(() => status.remove(), 10000);
    });
})();
