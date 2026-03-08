import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { PageLoader } from '../../components/LoadingSpinner';
import { formatDisplayDate } from '../../utils/dateUtils';

export default function SalaryAdjustments() {
  const api = useApi();
  const { addToast } = useToast();
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/salary-adjustments');
      setAdjustments(res.adjustments || []);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(adj, newStatus) {
    try {
      await api.put(`/api/salary-adjustments/${adj.id}`, { status: newStatus });
      addToast(`Adjustment ${newStatus}`);
      load();
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  async function applyAdjustment(adj) {
    if (!confirm(`Apply this adjustment? This will create a new salary record of $${Number(adj.proposed_salary).toLocaleString()} for ${adj.user_name}.`)) return;
    try {
      await api.post(`/api/salary-adjustments/${adj.id}/apply`);
      addToast('Adjustment applied — new salary record created');
      load();
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  function exportCSV() {
    const headers = ['Name', 'Email', 'Classification', 'Type', 'Current Salary', 'Proposed Salary', 'Change', 'Change %', 'Reason', 'Effective Date', 'Status'];
    const rows = adjustments.map(a => [
      a.user_name || '', a.user_email || '', a.user_classification || '',
      a.adjustment_type, a.current_salary, a.proposed_salary,
      (a.proposed_salary - a.current_salary).toFixed(2),
      ((a.proposed_salary / a.current_salary - 1) * 100).toFixed(1) + '%',
      (a.reason || '').replace(/,/g, ';'),
      a.effective_date || '', a.status,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salary-adjustments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <PageLoader />;

  const statusBadge = (status) => {
    const map = {
      draft: { status: 'draft', label: 'Draft' },
      approved: { status: 'submitted', label: 'Approved' },
      denied: { status: 'rejected', label: 'Denied' },
      applied: { status: 'active', label: 'Applied' },
    };
    const m = map[status] || { status: status, label: status };
    return <Badge status={m.status} label={m.label} />;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Salary Adjustments</h1>
        {adjustments.length > 0 && (
          <button className="btn-secondary" onClick={exportCSV}>Export CSV</button>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Review and manage salary adjustment recommendations. Approved adjustments can be applied to create official salary records.
      </p>

      {adjustments.length === 0 ? (
        <EmptyState
          title="No adjustments"
          description="Salary adjustments are created from the Equity Dashboard. Visit the equity page to analyze staff compensation and recommend adjustments."
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Type</th>
                <th>Current</th>
                <th>Proposed</th>
                <th>Change</th>
                <th>Reason</th>
                <th>Effective</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map(a => {
                const change = a.proposed_salary - a.current_salary;
                const changePct = ((a.proposed_salary / a.current_salary) - 1) * 100;
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="font-medium text-gray-900">{a.user_name || a.user_id}</div>
                      <div className="text-xs text-gray-400">{a.user_classification || ''}</div>
                    </td>
                    <td className="capitalize text-sm">{a.adjustment_type}</td>
                    <td className="text-sm">${Number(a.current_salary).toLocaleString()}</td>
                    <td className="font-semibold">${Number(a.proposed_salary).toLocaleString()}</td>
                    <td>
                      <span className={change > 0 ? 'text-green-600' : 'text-red-600'}>
                        {change > 0 ? '+' : ''}${Number(change).toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">({changePct.toFixed(1)}%)</span>
                    </td>
                    <td className="text-xs text-gray-500 max-w-40 truncate">{a.reason || '—'}</td>
                    <td className="text-sm">{formatDisplayDate(a.effective_date) || '—'}</td>
                    <td>{statusBadge(a.status)}</td>
                    <td>
                      <div className="flex gap-1">
                        {a.status === 'draft' && (
                          <>
                            <button className="btn-sm text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100"
                              onClick={() => updateStatus(a, 'approved')}>Approve</button>
                            <button className="btn-sm text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                              onClick={() => updateStatus(a, 'denied')}>Deny</button>
                          </>
                        )}
                        {a.status === 'approved' && (
                          <button className="btn-primary btn-sm" onClick={() => applyAdjustment(a)}>Apply</button>
                        )}
                      </div>
                    </td>
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
