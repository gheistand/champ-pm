import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { PageLoader } from '../../components/LoadingSpinner';

export default function MyAssignments() {
  const api = useApi();
  const { addToast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/tasks/my')
      .then((r) => setTasks(r.tasks || []))
      .catch((e) => addToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Assignments</h1>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks assigned yet"
          description="Contact your admin to be assigned to tasks."
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Project</th>
                <th>Grant</th>
                <th>Allocated Hours</th>
                <th>Hours Logged</th>
                <th>Hours Remaining</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => {
                const remaining = Number(t.hours_remaining || 0);
                return (
                  <tr key={t.id}>
                    <td className="font-medium">{t.name}</td>
                    <td>{t.project_name}</td>
                    <td>{t.grant_name}</td>
                    <td>{Number(t.allocated_hours || 0).toFixed(0)}h</td>
                    <td>{Number(t.hours_logged || 0).toFixed(1)}h</td>
                    <td className={remaining < 0 ? 'text-red-600 font-medium' : ''}>
                      {remaining.toFixed(1)}h
                    </td>
                    <td><Badge status={t.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
