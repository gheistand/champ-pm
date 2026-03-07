import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { PageLoader } from '../../components/LoadingSpinner';

export default function AdminDashboard() {
  const api = useApi();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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
          staffCount: staffRes.staff?.length || 0,
          grantCount: grantsRes.grants?.length || 0,
          projectCount: projectsRes.projects?.length || 0,
          pendingCount: weeksRes.weeks?.filter((w) => w.status === 'submitted').length || 0,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <PageLoader />;

  const cards = [
    { label: 'Active Staff', value: stats?.staffCount ?? '—', to: '/admin/staff', color: 'text-brand-600' },
    { label: 'Active Grants', value: stats?.grantCount ?? '—', to: '/admin/grants', color: 'text-green-600' },
    { label: 'Projects', value: stats?.projectCount ?? '—', to: '/admin/projects', color: 'text-purple-600' },
    { label: 'Pending Approvals', value: stats?.pendingCount ?? '—', to: '/admin/timesheets', color: 'text-amber-600' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(({ label, value, to, color }) => (
          <Link key={label} to={to} className="stat-card hover:shadow-md transition-shadow">
            <div className={`stat-value ${color}`}>{value}</div>
            <div className="stat-label">{label}</div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick Links</h2>
          <div className="space-y-2">
            {[
              { to: '/admin/staff', label: 'Manage Staff' },
              { to: '/admin/grants', label: 'View Grants' },
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
            <p className="text-sm text-amber-700 mb-3">Staff are waiting for their timesheets to be reviewed.</p>
            <Link to="/admin/timesheets" className="btn-primary btn-sm">
              Review Now
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
