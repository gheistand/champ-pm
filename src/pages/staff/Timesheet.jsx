import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { PageLoader } from '../../components/LoadingSpinner';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import {
  getCurrentWeekStart, getWorkWeekDates, toISODate,
  formatWeekRange, formatShortDate, addWeeks,
} from '../../utils/dateUtils';
import { HelpButton } from '../../components/HelpButton';
import { TOOL_HELP } from '../../help/toolHelp';

export default function StaffTimesheet() {
  const api = useApi();
  const { addToast } = useToast();
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart());
  const [tasks, setTasks] = useState([]);
  const [entries, setEntries] = useState({}); // { "taskId|date": { hours, notes, id } }
  const [weekStatus, setWeekStatus] = useState(null); // timesheet_weeks record
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const weekKey = toISODate(weekStart);
  const workDays = getWorkWeekDates(weekStart);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, timesheetRes, weeksRes] = await Promise.all([
        api.get('/api/tasks/my'),
        api.get(`/api/timesheets?week=${weekKey}`),
        api.get('/api/timesheets/weeks'),
      ]);

      setTasks(tasksRes.tasks || []);

      // Build entries map
      const map = {};
      for (const e of timesheetRes.entries || []) {
        map[`${e.task_id}|${e.entry_date}`] = { hours: e.hours, notes: e.notes || '', id: e.id };
      }
      setEntries(map);

      // Find week status
      const ws = (weeksRes.weeks || []).find((w) => w.week_start === weekKey);
      setWeekStatus(ws || null);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [weekKey]);

  useEffect(() => { load(); }, [load]);

  const isLocked = weekStatus?.status === 'submitted' || weekStatus?.status === 'approved';

  async function handleHoursChange(taskId, date, hours) {
    const key = `${taskId}|${date}`;
    const h = parseFloat(hours);

    // Optimistic update
    setEntries((prev) => ({
      ...prev,
      [key]: { ...prev[key], hours: isNaN(h) ? '' : h },
    }));

    if (isNaN(h) || hours === '') return;

    try {
      if (h === 0) {
        // Delete if exists
        const existing = entries[key];
        if (existing?.id) {
          await api.del(`/api/timesheets/${existing.id}`);
          setEntries((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }
      } else {
        const res = await api.post('/api/timesheets', { task_id: taskId, entry_date: date, hours: h, notes: entries[key]?.notes || null });
        setEntries((prev) => ({
          ...prev,
          [key]: { hours: h, notes: prev[key]?.notes || '', id: res.entry?.id },
        }));
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  async function handleNotesChange(taskId, date, notes) {
    const key = `${taskId}|${date}`;
    setEntries((prev) => ({ ...prev, [key]: { ...prev[key], notes } }));
    const entry = entries[key];
    if (!entry?.id) return;
    try {
      await api.post('/api/timesheets', {
        task_id: taskId, entry_date: date,
        hours: entry.hours || 0, notes,
      });
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await api.post(`/api/timesheets/submit?week=${weekKey}`);
      addToast('Timesheet submitted for approval');
      load();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function dailyTotal(date) {
    return tasks.reduce((sum, t) => {
      const e = entries[`${t.id}|${date}`];
      return sum + (parseFloat(e?.hours) || 0);
    }, 0);
  }

  function weeklyTotal() {
    return workDays.reduce((sum, d) => sum + dailyTotal(toISODate(d)), 0);
  }

  function prevWeek() { setWeekStart((w) => addWeeks(w, -1)); }
  function nextWeek() { setWeekStart((w) => addWeeks(w, 1)); }

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2">
          <h1 className="page-title">My Timesheet</h1>
          <HelpButton {...TOOL_HELP.timesheet} />
        </div>
        <div className="flex items-center gap-2">
          {weekStatus && <Badge status={weekStatus.status} />}
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-3 mb-6">
        <button className="btn-secondary btn-sm" onClick={prevWeek}>← Prev</button>
        <span className="text-sm font-medium text-gray-700 min-w-48 text-center">
          {formatWeekRange(weekStart)}
        </span>
        <button className="btn-secondary btn-sm" onClick={nextWeek}>Next →</button>
        <button className="btn-secondary btn-sm ml-2" onClick={() => setWeekStart(getCurrentWeekStart())}>
          This Week
        </button>
      </div>

      {/* Rejection notice */}
      {weekStatus?.status === 'rejected' && weekStatus.review_notes && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm font-medium text-red-800">Timesheet Rejected</p>
          <p className="text-sm text-red-700 mt-1">{weekStatus.review_notes}</p>
          <p className="text-xs text-red-500 mt-2">Please correct your entries and resubmit.</p>
        </div>
      )}

      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks assigned"
          description="Contact your admin to be assigned to tasks before logging time."
        />
      ) : (
        <>
          <div className="card overflow-x-auto mb-4">
            <table className="table min-w-[700px]">
              <thead>
                <tr>
                  <th className="w-48">Task</th>
                  {workDays.map((d) => {
                    const dateStr = toISODate(d);
                    const total = dailyTotal(dateStr);
                    return (
                      <th key={dateStr} className="text-center">
                        <div>{formatShortDate(d)}</div>
                        {total > 0 && (
                          <div className={`text-xs font-normal ${total > 8 ? 'text-amber-600' : 'text-gray-400'}`}>
                            {total.toFixed(1)}h
                          </div>
                        )}
                      </th>
                    );
                  })}
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const taskTotal = workDays.reduce((sum, d) => {
                    const e = entries[`${task.id}|${toISODate(d)}`];
                    return sum + (parseFloat(e?.hours) || 0);
                  }, 0);
                  return (
                    <tr key={task.id}>
                      <td>
                        <div className="font-medium text-gray-900 text-xs">{task.name}</div>
                        <div className="text-xs text-gray-400">{task.grant_name}</div>
                      </td>
                      {workDays.map((d) => {
                        const dateStr = toISODate(d);
                        const key = `${task.id}|${dateStr}`;
                        const entry = entries[key] || {};
                        return (
                          <td key={dateStr} className="p-1 space-y-1">
                            <input
                              type="number"
                              min="0"
                              max="24"
                              step="0.25"
                              disabled={isLocked}
                              value={entry.hours ?? ''}
                              onChange={(e) => handleHoursChange(task.id, dateStr, e.target.value)}
                              className="w-16 text-center text-sm border border-gray-200 rounded px-1 py-1 disabled:bg-gray-50 disabled:text-gray-400 focus:border-brand-400 focus:outline-none"
                              placeholder="0"
                            />
                            <input
                              type="text"
                              disabled={isLocked}
                              value={entry.notes ?? ''}
                              onChange={(e) => handleNotesChange(task.id, dateStr, e.target.value)}
                              className="w-16 text-xs border border-gray-100 rounded px-1 py-0.5 disabled:bg-gray-50 disabled:text-gray-400 focus:border-brand-300 focus:outline-none text-gray-500 placeholder-gray-300"
                              placeholder="note"
                            />
                          </td>
                        );
                      })}
                      <td className="text-right font-medium text-sm">
                        {taskTotal > 0 ? `${taskTotal.toFixed(1)}h` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-medium">
                  <td className="px-4 py-2 text-sm">Daily Total</td>
                  {workDays.map((d) => {
                    const dateStr = toISODate(d);
                    const total = dailyTotal(dateStr);
                    return (
                      <td key={dateStr} className={`text-center text-sm px-4 py-2 ${total > 8 ? 'text-amber-600' : ''}`}>
                        {total > 0 ? `${total.toFixed(1)}h` : '—'}
                      </td>
                    );
                  })}
                  <td className={`text-right text-sm px-4 py-2 ${weeklyTotal() > 40 ? 'text-amber-600' : 'text-gray-900'}`}>
                    {weeklyTotal().toFixed(1)}h
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Submit / status */}
          {!isLocked && (
            <div className="flex justify-end">
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={submitting || weeklyTotal() === 0}
              >
                {submitting ? 'Submitting…' : 'Submit Week for Approval'}
              </button>
            </div>
          )}

          {weekStatus?.status === 'submitted' && (
            <div className="flex justify-end">
              <div className="text-sm text-amber-600 font-medium">
                Timesheet submitted — awaiting approval.
              </div>
            </div>
          )}

          {weekStatus?.status === 'approved' && (
            <div className="flex justify-end">
              <div className="text-sm text-green-600 font-medium">
                Timesheet approved.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
