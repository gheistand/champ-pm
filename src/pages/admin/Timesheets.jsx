import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { PageLoader } from '../../components/LoadingSpinner';
import { formatWeekRange, formatDisplayDate } from '../../utils/dateUtils';

export default function AdminTimesheets() {
  const api = useApi();
  const { addToast } = useToast();
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewWeek, setReviewWeek] = useState(null);
  const [entries, setEntries] = useState([]);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('submitted');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/timesheets/weeks');
      setWeeks(res.weeks || []);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openReview(week) {
    setReviewWeek(week);
    setReviewNotes('');
    try {
      const res = await api.get(`/api/timesheets?week=${week.week_start}`);
      const weekEntries = (res.entries || []).filter((e) => e.user_id === week.user_id);
      setEntries(weekEntries);
    } catch (e) {
      addToast(e.message, 'error');
    }
  }

  async function handleAction(action) {
    setActionLoading(true);
    try {
      if (action === 'approve') {
        await api.post(`/api/timesheets/weeks/${reviewWeek.id}/approve`);
        addToast(`Approved ${reviewWeek.user_name}'s timesheet`);
      } else {
        await api.post(`/api/timesheets/weeks/${reviewWeek.id}/reject`, { notes: reviewNotes });
        addToast(`Rejected ${reviewWeek.user_name}'s timesheet`);
      }
      setReviewWeek(null);
      load();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  }

  const filtered = weeks.filter((w) => !filterStatus || w.status === filterStatus);

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Timesheet Approvals</h1>
        <select className="form-select w-40" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All</option>
          <option value="submitted">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No timesheets"
          description={filterStatus === 'submitted' ? 'No timesheets pending review.' : 'Nothing to show.'}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Week</th>
                <th>Total Hours</th>
                <th>Submitted</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <tr key={w.id}>
                  <td className="font-medium">{w.user_name}</td>
                  <td>{formatWeekRange(w.week_start)}</td>
                  <td>{Number(w.total_hours || 0).toFixed(1)}h</td>
                  <td>{w.submitted_at ? formatDisplayDate(w.submitted_at) : '—'}</td>
                  <td><Badge status={w.status} /></td>
                  <td>
                    <button className="btn-secondary btn-sm" onClick={() => openReview(w)}>
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reviewWeek && (
        <Modal isOpen onClose={() => setReviewWeek(null)} title={`${reviewWeek.user_name} — ${formatWeekRange(reviewWeek.week_start)}`} size="lg">
          <div className="mb-4">
            <Badge status={reviewWeek.status} className="mr-2" />
            <span className="text-sm text-gray-500">Total: {Number(reviewWeek.total_hours || 0).toFixed(1)}h</span>
          </div>

          <div className="table-container mb-4">
            <table className="table">
              <thead><tr><th>Date</th><th>Task</th><th>Project</th><th>Hours</th><th>Notes</th></tr></thead>
              <tbody>
                {entries.length === 0
                  ? <tr><td colSpan={5} className="text-center py-4 text-gray-400">No entries found.</td></tr>
                  : entries.map((e) => (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap">{formatDisplayDate(e.entry_date)}</td>
                      <td>{e.task_name}</td>
                      <td>{e.project_name}</td>
                      <td>{Number(e.hours).toFixed(1)}h</td>
                      <td className="text-gray-400">{e.notes || ''}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>

          {reviewWeek.status === 'submitted' && (
            <div className="space-y-3">
              <div>
                <label className="form-label">Rejection Notes (required if rejecting)</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Explain why you are rejecting…"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  className="btn-danger"
                  disabled={actionLoading || !reviewNotes.trim()}
                  onClick={() => handleAction('reject')}
                >
                  Reject
                </button>
                <button
                  className="btn-primary"
                  disabled={actionLoading}
                  onClick={() => handleAction('approve')}
                >
                  Approve
                </button>
              </div>
            </div>
          )}

          {reviewWeek.status !== 'submitted' && reviewWeek.review_notes && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-amber-800">Review Notes</p>
              <p className="text-sm text-amber-700 mt-1">{reviewWeek.review_notes}</p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
