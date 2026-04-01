import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { PageLoader } from '../../components/LoadingSpinner';
import {
  getCurrentWeekStart, toISODate, formatWeekRange, addWeeks,
} from '../../utils/dateUtils';
import { HelpButton } from '../../components/HelpButton';
import { TOOL_HELP } from '../../help/toolHelp';

export default function AdminWorkload() {
  const api = useApi();
  const { addToast } = useToast();
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart());
  const [workload, setWorkload] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grants, setGrants] = useState([]);
  const [grantFilter, setGrantFilter] = useState('');
  const [view, setView] = useState('chart'); // 'chart' | 'table'

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const week = toISODate(weekStart);
      let url = `/api/assignments/workload?week=${week}`;
      if (grantFilter) url += `&grant_id=${grantFilter}`;
      const [wlRes, grantsRes] = await Promise.all([
        api.get(url),
        api.get('/api/grants'),
      ]);
      setWorkload(wlRes.workload || []);
      setGrants(grantsRes.grants || []);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [weekStart, grantFilter]);

  useEffect(() => { load(); }, [load]);

  const chartData = workload.map((s) => ({
    name: s.name.split(' ')[0], // first name for brevity
    fullName: s.name,
    approved: Number(s.hours.approved || 0),
    submitted: Number(s.hours.submitted || 0),
    draft: Number(s.hours.draft || 0),
    total: Number(s.hours.approved || 0) + Number(s.hours.submitted || 0) + Number(s.hours.draft || 0),
  }));

  function prevWeek() { setWeekStart((w) => addWeeks(w, -1)); }
  function nextWeek() { setWeekStart((w) => addWeeks(w, 1)); }

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2">
          <h1 className="page-title">Workload</h1>
          <HelpButton {...TOOL_HELP.workload} />
        </div>
        <div className="flex items-center gap-3">
          <select
            className="form-select w-44"
            value={grantFilter}
            onChange={(e) => setGrantFilter(e.target.value)}
          >
            <option value="">All Grants</option>
            {grants.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              className={`px-3 py-1.5 text-sm ${view === 'chart' ? 'bg-brand-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              onClick={() => setView('chart')}
            >
              Chart
            </button>
            <button
              className={`px-3 py-1.5 text-sm border-l border-gray-300 ${view === 'table' ? 'bg-brand-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              onClick={() => setView('table')}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Week picker */}
      <div className="flex items-center gap-3 mb-6">
        <button className="btn-secondary btn-sm" onClick={prevWeek}>← Prev</button>
        <span className="text-sm font-medium text-gray-700 min-w-48 text-center">
          {formatWeekRange(weekStart)}
        </span>
        <button className="btn-secondary btn-sm" onClick={nextWeek}>Next →</button>
        <button
          className="btn-secondary btn-sm ml-2"
          onClick={() => setWeekStart(getCurrentWeekStart())}
        >
          This Week
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : workload.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">No staff data for this week.</div>
      ) : view === 'chart' ? (
        <div className="card p-6">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                label={{ value: 'Hours', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12 }}
              />
              <Tooltip
                formatter={(value, name) => [`${value.toFixed(1)}h`, name]}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
              />
              <Legend />
              <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="5 5" label={{ value: '40h', position: 'right', fontSize: 11, fill: '#ef4444' }} />
              <Bar dataKey="approved" name="Approved" stackId="hours" fill="#22c55e" radius={[0, 0, 0, 0]} />
              <Bar dataKey="submitted" name="Submitted" stackId="hours" fill="#eab308" />
              <Bar dataKey="draft" name="Draft" stackId="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 flex items-center gap-6 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block"></span>Approved</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400 inline-block"></span>Submitted</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500 inline-block"></span>Draft</span>
            <span className="flex items-center gap-1"><span className="w-6 border-t-2 border-dashed border-red-500 inline-block"></span>40h threshold</span>
          </div>
        </div>
      ) : (
        /* Gantt-style table */
        <div className="space-y-4">
          {workload.map((s) => {
            const totalHours = s.hours.approved + s.hours.submitted + s.hours.draft;
            return (
              <div key={s.id} className="card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div>
                    <span className="font-medium text-gray-900">{s.name}</span>
                    {s.title && <span className="text-gray-400 text-sm ml-2">{s.title}</span>}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-700">{s.hours.approved.toFixed(1)}h approved</span>
                    <span className="text-amber-600">{s.hours.submitted.toFixed(1)}h submitted</span>
                    <span className="text-blue-600">{s.hours.draft.toFixed(1)}h draft</span>
                    <span className={`font-semibold ${totalHours > 40 ? 'text-red-600' : 'text-gray-700'}`}>
                      {totalHours.toFixed(1)}h total
                    </span>
                  </div>
                </div>
                {s.assignments.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-400">No active assignments.</p>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Project</th>
                        <th>Grant</th>
                        <th>Allocated</th>
                        <th>Logged</th>
                        <th>Remaining</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.assignments.map((a) => {
                        const remaining = Number(a.hours_remaining || 0);
                        return (
                          <tr key={a.id}>
                            <td className="font-medium">{a.task_name}</td>
                            <td>{a.project_name}</td>
                            <td>{a.grant_name}</td>
                            <td>{Number(a.allocated_hours).toFixed(0)}h</td>
                            <td>{Number(a.hours_logged).toFixed(1)}h</td>
                            <td className={remaining < 0 ? 'text-red-600 font-medium' : ''}>
                              {remaining.toFixed(1)}h
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
