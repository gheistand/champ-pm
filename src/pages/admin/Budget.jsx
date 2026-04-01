import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { PageLoader } from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { formatDisplayDate } from '../../utils/dateUtils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { HelpButton } from '../../components/HelpButton';
import { TOOL_HELP } from '../../help/toolHelp';

function BudgetGauge({ pct, size = 'md' }) {
  const color = pct > 85 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-green-500';
  const textColor = pct > 85 ? 'text-red-600' : pct > 60 ? 'text-amber-600' : 'text-green-600';
  const h = size === 'sm' ? 'h-2' : 'h-3';
  return (
    <div>
      <div className={`w-full ${h} bg-gray-200 rounded-full overflow-hidden`}>
        <div className={`${h} ${color} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <p className={`text-xs font-medium ${textColor} mt-1`}>{pct.toFixed(1)}% used</p>
    </div>
  );
}

export default function AdminBudget() {
  const api = useApi();
  const { addToast } = useToast();
  const [programData, setProgramData] = useState(null);
  const [projections, setProjections] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [programRes, projRes] = await Promise.all([
        api.get('/api/budget/program'),
        api.get('/api/budget/projections'),
      ]);
      setProgramData(programRes);
      setProjections(projRes.projections || []);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageLoader />;

  const grants = programData?.grants || [];
  const totals = programData?.totals || {};

  // Build stacked bar chart data
  const barData = grants.map(g => ({
    name: g.name.length > 20 ? g.name.substring(0, 20) + '…' : g.name,
    'Personnel': g.personnel_cost,
    'F&A': g.fa_cost,
    'Remaining': Math.max(0, g.remaining),
  }));

  // Build monthly trend from projections
  const monthlyMap = {};
  for (const p of projections) {
    for (const m of (p.monthly_data || [])) {
      if (!monthlyMap[m.month]) monthlyMap[m.month] = { month: m.month, total: 0 };
      monthlyMap[m.month].total += m.total_cost;
    }
  }
  const monthlySorted = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
  // Only last 12 months
  const monthlyTrend = monthlySorted.slice(-12);

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2">
          <h1 className="page-title">Program Budget</h1>
          <HelpButton {...TOOL_HELP.budget} />
        </div>
      </div>

      {/* Program summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-value text-gray-900">${Number(totals.fema_budget || 0).toLocaleString()}</div>
          <div className="stat-label">Total Budget</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-brand-600">${Number(totals.total_cost || 0).toLocaleString()}</div>
          <div className="stat-label">Total Cost</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-green-600">${Number(totals.remaining || 0).toLocaleString()}</div>
          <div className="stat-label">Remaining</div>
        </div>
        <div className="stat-card">
          <div className="stat-label mb-2">Budget Used</div>
          <BudgetGauge pct={totals.pct_used || 0} />
        </div>
      </div>

      {grants.length === 0 ? (
        <EmptyState title="No active grants" description="Active grants with budget data will appear here." />
      ) : (
        <>
          {/* Grant cards */}
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Active Grants</h2>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {grants.map(g => {
              const colorClass = g.pct_used > 85 ? 'border-red-200' : g.pct_used > 60 ? 'border-amber-200' : 'border-gray-200';
              return (
                <Link key={g.id} to={`/admin/grants/${g.id}`} className={`card p-5 border-2 ${colorClass} hover:shadow-md transition-shadow`}>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">{g.name}</h3>
                  <p className="text-xs text-gray-500 mb-3">{g.funder}</p>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-gray-500">FEMA Budget</p>
                      <p className="font-semibold text-sm">${Number(g.fema_budget || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Cost</p>
                      <p className="font-semibold text-sm">${Number(g.total_cost || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Remaining</p>
                      <p className="font-semibold text-sm text-green-600">${Number(g.remaining || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Days Left</p>
                      <p className="font-semibold text-sm">{g.days_remaining}</p>
                    </div>
                  </div>

                  <BudgetGauge pct={g.pct_used || 0} size="sm" />
                </Link>
              );
            })}
          </div>

          {/* Stacked bar chart */}
          {barData.length > 0 && (
            <div className="card p-5 mb-8">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Budget Breakdown by Grant</h2>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={barData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="Personnel" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="F&A" stackId="a" fill="#8b5cf6" />
                  <Bar dataKey="Remaining" stackId="a" fill="#d1d5db" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Monthly burn rate chart */}
          {monthlyTrend.length > 1 && (
            <div className="card p-5 mb-8">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly Cost Trend</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                  <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Projections table */}
          {projections.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Burn Rate Projections</h2>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Grant</th>
                      <th>Total Budget</th>
                      <th>Cost to Date</th>
                      <th>Monthly Burn</th>
                      <th>Projected Final</th>
                      <th>Projected Remaining</th>
                      <th>Exhaustion Date</th>
                      <th>PoP End</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projections.map(p => {
                      const overBudget = p.projected_remaining < 0;
                      const exhaustsBeforeEnd = p.exhaustion_date && p.pop_end && p.exhaustion_date < p.pop_end;
                      return (
                        <tr key={p.grant_id}>
                          <td className="font-medium">{p.grant_name}</td>
                          <td>${Number(p.total_budget).toLocaleString()}</td>
                          <td>${Number(p.cost_to_date).toLocaleString()}</td>
                          <td>${Number(p.monthly_burn_rate).toLocaleString()}</td>
                          <td className={overBudget ? 'text-red-600 font-medium' : ''}>
                            ${Number(p.projected_final_cost).toLocaleString()}
                          </td>
                          <td className={overBudget ? 'text-red-600 font-medium' : 'text-green-600'}>
                            ${Number(p.projected_remaining).toLocaleString()}
                          </td>
                          <td className={exhaustsBeforeEnd ? 'text-red-600 font-medium' : ''}>
                            {p.exhaustion_date ? formatDisplayDate(p.exhaustion_date) : 'N/A'}
                          </td>
                          <td>{formatDisplayDate(p.pop_end) || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
