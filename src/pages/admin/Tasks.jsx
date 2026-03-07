import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { PageLoader } from '../../components/LoadingSpinner';

export default function AdminTasks() {
  const api = useApi();
  const { addToast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [grants, setGrants] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grantFilter, setGrantFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  const load = useCallback(async () => {
    try {
      const url = projectFilter
        ? `/api/tasks?project_id=${projectFilter}`
        : '/api/tasks';
      const [tasksRes, grantsRes] = await Promise.all([api.get(url), api.get('/api/grants')]);
      setTasks(tasksRes.tasks || []);
      setGrants(grantsRes.grants || []);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [projectFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (grantFilter) {
      api.get(`/api/projects?grant_id=${grantFilter}`)
        .then((r) => setProjects(r.projects || []))
        .catch(() => {});
      setProjectFilter('');
    } else {
      setProjects([]);
      setProjectFilter('');
    }
  }, [grantFilter]);

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tasks</h1>
        <div className="flex items-center gap-3">
          <select className="form-select w-44" value={grantFilter} onChange={(e) => setGrantFilter(e.target.value)}>
            <option value="">All Grants</option>
            {grants.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          {grantFilter && (
            <select className="form-select w-44" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              <option value="">All Projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <EmptyState title="No tasks" description="Tasks are created within projects." />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Project</th>
                <th>Grant</th>
                <th>Est. Hours</th>
                <th>Logged</th>
                <th>Assigned Staff</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{t.name}</td>
                  <td>{t.project_name}</td>
                  <td>{t.grant_name}</td>
                  <td>{Number(t.estimated_hours || 0).toFixed(0)}h</td>
                  <td>{Number(t.hours_logged || 0).toFixed(1)}h</td>
                  <td className="max-w-xs truncate">{t.assigned_staff || '—'}</td>
                  <td><Badge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
