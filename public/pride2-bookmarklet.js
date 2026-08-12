// CHAMP-PM PRIDE 2.0 DISCOVERY Bookmarklet
// -------------------------------------------------------------------------
// TEMPORARY / DISCOVERY TOOL — not the final sync bookmarklet.
//
// PRIDE 2.0 (pride2.prairie.illinois.edu) is a Laravel + React SPA that
// calls clean JSON REST-style endpoints internally (unlike PRIDE 1.0's
// server-rendered HTML tables). This bookmarklet does NOT scrape the DOM —
// it re-calls those same JSON endpoints using the browser's existing
// authenticated session (session cookie + CSRF token, same-origin), and
// POSTs the raw responses to CHAMP-PM's capture endpoint so Glenn + the
// CHAMP-PM agent can inspect the real field shapes together.
//
// Save the minified version in bookmarklet2.txt as a browser bookmark URL.
// Run it while logged into https://pride2.prairie.illinois.edu (any page —
// it calls the API directly, doesn't need to be on a specific screen, but
// you may need to be on/near the Staff Plan screen for some endpoints to
// resolve required query params like org_group_id).
//
// After running once, tell CHAMP-PM agent "check the pride2 captures" and it
// will query pride2_capture_log via wrangler d1 execute to review shapes.
//
// KNOWN ENDPOINT(S) — confirm/extend this list live with Glenn's session:
//   1. GET /staff-plan/plans?start_date=&end_date=&people=&org_group_id=...
//   2. (TBD) salary / change history endpoint
//   3. (TBD) grant balance / commitment burndown endpoint
// -------------------------------------------------------------------------

(function () {
  'use strict';

  const CHAMP_PM_URL = 'https://champ-pm.app/api/pride2/sync';
  const TOKEN_KEY = 'champ_pm_pride2_token';

  if (!location.hostname.includes('pride2.prairie.illinois.edu')) {
    alert('Run this bookmarklet on pride2.prairie.illinois.edu (logged in).');
    return;
  }

  // ── Auth token for CHAMP-PM endpoint ────────────────────────────────────
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = prompt(
      'CHAMP-PM PRIDE 2.0 Discovery Sync\n\n' +
      'Enter your CHAMP-PM sync token (one-time setup — will be saved locally):'
    );
    if (!token) return;
    localStorage.setItem(TOKEN_KEY, token.trim());
    token = token.trim();
  }

  // ── Grab CSRF token PRIDE 2.0 uses for its own axios calls ──────────────
  // Laravel apps typically expose this as a meta tag or XSRF-TOKEN cookie.
  function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) return meta.getAttribute('content');
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
    return null;
  }
  const csrfToken = getCsrfToken();

  const status = document.createElement('div');
  status.style.cssText = [
    'position:fixed', 'top:20px', 'right:20px', 'z-index:99999',
    'background:#1e40af', 'color:#fff', 'padding:12px 18px', 'border-radius:10px',
    'font:14px/1.5 system-ui,sans-serif', 'box-shadow:0 4px 20px rgba(0,0,0,.3)',
    'max-width:340px', 'white-space:pre',
  ].join(';');
  status.textContent = '⏳ Calling PRIDE 2.0 endpoints…';
  document.body.appendChild(status);

  // ── Endpoints to probe ───────────────────────────────────────────────────
  // Add/edit this list live once more endpoint URLs are confirmed.
  const today = new Date();
  const yearStart = `${today.getFullYear()}-01-01`;
  const yearEnd = `${today.getFullYear()}-12-31`;

  const targets = [
    {
      endpoint: 'staff-plan/plans',
      url: `/staff-plan/plans?start_date=${yearStart}&end_date=${yearEnd}`,
    },
    // TODO once confirmed with Glenn:
    // { endpoint: 'salary-history', url: '/...' },
    // { endpoint: 'grant-balances', url: '/...' },
  ];

  const headers = { 'Accept': 'application/json' };
  if (csrfToken) headers['X-XSRF-TOKEN'] = csrfToken;

  Promise.all(
    targets.map(t =>
      fetch(t.url, { headers, credentials: 'same-origin' })
        .then(async r => ({
          endpoint: t.endpoint,
          params: { url: t.url },
          response: r.ok ? await r.json().catch(async () => ({ _nonJsonBody: await r.text() })) : { _error: r.status, _statusText: r.statusText },
        }))
        .catch(err => ({ endpoint: t.endpoint, params: { url: t.url }, response: { _fetchError: String(err) } }))
    )
  )
    .then(captures => {
      status.textContent = `⏳ Got ${captures.length} response(s), sending to CHAMP-PM…`;
      return fetch(CHAMP_PM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({ captures }),
      });
    })
    .then(r => {
      if (r.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        throw new Error('Invalid sync token — cleared. Run again to re-enter.');
      }
      if (!r.ok) throw new Error('Server error: ' + r.status);
      return r.json();
    })
    .then(data => {
      status.style.background = '#166534';
      status.textContent = '✅ PRIDE 2.0 capture complete\nSaved: ' + (data.saved || []).join(', ');
      setTimeout(() => status.remove(), 15000);
    })
    .catch(err => {
      status.style.background = '#991b1b';
      status.textContent = '❌ Discovery failed: ' + err.message;
      setTimeout(() => status.remove(), 12000);
    });
})();
