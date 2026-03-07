import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { PageLoader } from '../../components/LoadingSpinner';
import { formatDisplayDate } from '../../utils/dateUtils';

export default function AdminProjects() {
  const api = useApi();
  const { addToast } = useToast();
  const [projects, setProjects] = useState([]);
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grantFilter, setGrantFilter] = useState('');

  const load = useCallback(async () => {
    try {
      const url = grantFilter ? `/api/projects?grant_id=${grantFilter}` : '/api/projects';
      const [projRes, grantsRes] = await Promise.all([api.get(url), api.get('/api/grants')]);
      setProjects(projRes.projects || []);
      setGrants(grantsRes.grants || []);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [grantFilter]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Projects</h1>
        <div className="flex items-center gap-3">
          <select
            className="form-select w-48"
            value={grantFilter}
            onChange={(e) => setGrantFilter(e.target.value)}
          >
            <option value="">All Grants</option>
            {grants.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      </div>

      {projects.length === 0 ? (
        <EmptyState title="No projects" description="Projects are created within grants." />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Grant</th>
                <th>Period</th>
                <th>Budget</th>
                <th>Est. Hours</th>
                <th>Logged</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/admin/projects/${p.id}`} className="font-medium text-brand-600 hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td>{p.grant_name}</td>
                  <td>
                    {p.start_date
                      ? `${formatDisplayDate(p.start_date)} – ${formatDisplayDate(p.end_date)}`
                      : '—'}
                  </td>
                  <td>${Number(p.budget || 0).toLocaleString()}</td>
                  <td>{Number(p.estimated_hours || 0).toFixed(0)}h</td>
                  <td>{Number(p.hours_logged || 0).toFixed(1)}h</td>
                  <td><Badge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
