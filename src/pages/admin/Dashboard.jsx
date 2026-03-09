import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { PageLoader } from '../../components/LoadingSpinner';

const fmt$ = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

const SEVERITY = {
  critical: {
    bg: 'bg-red-50 border-red-200',
    icon: 'bg-red-100 text-red-600',
    title: 'text-red-800',
    msg: 'text-red-700',
    badge: 'bg-red-100 text-red-700',
    label: 'Critical',
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200',
    icon: 'bg-amber-100 text-amber-600',
    title: 'text-amber-800',
    msg: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
    label: 'Warning',
  },
  info: {
    bg: 'bg-blue-50 border-blue-200',
    icon: 'bg-blue-100 text-blue-600',
    title: 'text-blue-800',
    msg: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
    label: 'Info',
  },
};

function AlertIcon({ type, severity }) {
  const cls = `w-5 h-5`;
  if (type === 'pop') {
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  // budget
  return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function BudgetBar({ pct }) {
  const clamped = Math.min(pct, 100);
  const color = pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-400' : 'bg-green-400';
  return (
    <div className="mt-2 h-1.5 rounded-full bg-gray-200 w-full">
      <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export default function AdminDashboard() {
  const api = useApi();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [staffRes, grantsRes, projectsRes, weeksRes] = await Promise.all([
          api.get('/api/staff'),
          api.get('/api/grants'),
          api.get('/api/projects'),
          api.get('/api/timesheets/weeks'),
        ]);
        setStats({
          staffCount: (staffRes.staff || []).filter(s => s.is_active).length,
          grantCount: (grantsRes.grants || []).filter(g => g.status === 'active').length,
          projectCount: (projectsRes.projects || []).filter(p => p.status === 'active').length,
          pendingCount: (weeksRes.weeks || []).filter(w => w.status === 'submitted').length,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    async function loadAlerts() {
      try {
        const res = await api.get('/api/alerts');
        setAlerts(res.alerts || []);
      } catch (e) {
        console.error('Alerts failed:', e);
      } finally {
        setAlertsLoading(false);
      }
    }

    load();
    loadAlerts();
  }, []);

  if (loading) return <PageLoader />;

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const visibleAlerts = showAll ? alerts : alerts.slice(0, 5);

  const cards = [
    { label: 'Active Staff', value: stats?.staffCount ?? '—', to: '/admin/staff', color: 'text-brand-600' },
    { label: 'Active Grants', value: stats?.grantCount ?? '—', to: '/admin/grants', color: 'text-green-600' },
    { label: 'Active Projects', value: stats?.projectCount ?? '—', to: '/admin/projects', color: 'text-purple-600' },
    { label: 'Pending Approvals', value: stats?.pendingCount ?? '—', to: '/admin/timesheets', color: stats?.pendingCount > 0 ? 'text-amber-600' : 'text-gray-400' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        {!alertsLoading && alerts.length > 0 && (
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
                {criticalCount} Critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                {warningCount} Warning
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Alerts panel ────────────────────────────────────────────────────── */}
      {!alertsLoading && alerts.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">
              Program Alerts
              <span className="ml-2 text-xs font-normal text-gray-400">
                {alerts.length} active
              </span>
            </h2>
            {alerts.length > 5 && (
              <button
                className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                onClick={() => setShowAll(v => !v)}
              >
                {showAll ? 'Show fewer' : `Show all ${alerts.length}`}
              </button>
            )}
          </div>

          <div className="space-y-2">
            {visibleAlerts.map(alert => {
              const s = SEVERITY[alert.severity] || SEVERITY.info;
              return (
                <div key={alert.id} className={`rounded-xl border p-4 flex items-start gap-3 ${s.bg}`}>
                  <div className={`rounded-lg p-1.5 shrink-0 ${s.icon}`}>
                    <AlertIcon type={alert.type} severity={alert.severity} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${s.title}`}>{alert.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${s.badge}`}>
                        {alert.grant_number}
                      </span>
                      {alert.type === 'budget' && alert.pct_used != null && (
                        <span className="text-xs text-gray-500">{alert.pct_used}% used</span>
                      )}
                    </div>
                    <p className={`text-sm mt-0.5 ${s.msg}`}>{alert.message}</p>
                    {alert.type === 'budget' && alert.pct_used != null && (
                      <BudgetBar pct={alert.pct_used} />
                    )}
                  </div>
                  <Link
                    to={`/admin/budget`}
                    className="shrink-0 text-xs text-gray-400 hover:text-gray-600 mt-0.5"
                  >
                    View →
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!alertsLoading && alerts.length === 0 && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm text-green-700 font-medium">All grants are within budget and PoP thresholds.</span>
        </div>
      )}

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(({ label, value, to, color }) => (
          <Link key={label} to={to} className="stat-card hover:shadow-md transition-shadow">
            <div className={`stat-value ${color}`}>{value}</div>
            <div className="stat-label">{label}</div>
          </Link>
        ))}
      </div>

      {/* ── Quick links + pending ────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick Links</h2>
          <div className="space-y-2">
            {[
              { to: '/admin/reports', label: 'Run a Report' },
              { to: '/admin/runway', label: 'Program Runway' },
              { to: '/admin/budget', label: 'Budget Burndown' },
              { to: '/admin/workload', label: 'Workload Overview' },
              { to: '/admin/timesheets', label: 'Review Timesheets' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
              >
                {label}
                <span className="text-gray-400">→</span>
              </Link>
            ))}
          </div>
        </div>

        {stats?.pendingCount > 0 && (
          <div className="card p-5 border-amber-200 bg-amber-50">
            <h2 className="text-sm font-semibold text-amber-800 mb-1">
              {stats.pendingCount} timesheet{stats.pendingCount !== 1 ? 's' : ''} pending approval
            </h2>
            <p className="text-sm text-amber-700 mb-3">
              Staff are waiting for their timesheets to be reviewed.
            </p>
            <Link to="/admin/timesheets" className="btn-primary btn-sm">
              Review Now
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
