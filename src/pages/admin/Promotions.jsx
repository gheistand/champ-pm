import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { PageLoader } from '../../components/LoadingSpinner';
import { formatDisplayDate } from '../../utils/dateUtils';
import { HelpButton } from '../../components/HelpButton';
import { TOOL_HELP } from '../../help/toolHelp';

function ScoreBadge({ score }) {
  const color = score >= 100 ? 'bg-green-100 text-green-700' :
    score >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {score}/100
    </span>
  );
}

export default function Promotions() {
  const api = useApi();
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/promotions/eligible');
      setData(res);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openDetail(staffItem) {
    setDetailLoading(true);
    setDetailModalOpen(true);
    try {
      const res = await api.get(`/api/promotions/staff/${staffItem.user_id}`);
      setDetail(res);
    } catch (err) {
      addToast(err.message, 'error');
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  if (loading) return <PageLoader />;

  const eligible = data?.eligible || [];
  const all = data?.all || [];
  const displayed = showAll ? all : eligible;

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2">
          <h1 className="page-title">Promotion Readiness</h1>
          <HelpButton {...TOOL_HELP.promotions} />
        </div>
        <div className="flex items-center gap-3">
          <button
            className={`btn-sm ${showAll ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show Eligible Only' : 'Show All Staff'}
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Promotion readiness is scored on a 100-point scale: 40pts (years in role), 30pts (total years), 30pts (compa-ratio ≥ 0.95).
        Staff scoring ≥ 70 are approaching or fully eligible for promotion.
      </p>

      {displayed.length === 0 ? (
        <EmptyState
          title={showAll ? 'No promotion criteria defined' : 'No staff currently eligible'}
          description={showAll
            ? 'Add classification bands and promotion criteria on the Classifications page.'
            : 'No staff members have a readiness score ≥ 70. Try "Show All Staff" to see everyone.'}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Current Classification</th>
                <th>Years in Role</th>
                <th>Years Total</th>
                <th>Compa-Ratio</th>
                <th>Score</th>
                <th>Eligible For</th>
                <th>Salary Impact</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((s, idx) => (
                <tr key={`${s.user_id}-${s.eligible_for}-${idx}`}>
                  <td>
                    <div className="font-medium text-gray-900">{s.name}</div>
                  </td>
                  <td className="text-sm">{s.current_classification || '—'}</td>
                  <td>{s.years_in_role} yr</td>
                  <td>{s.years_total} yr</td>
                  <td>
                    {s.compa_ratio != null ? (
                      <span className={`font-semibold ${s.compa_ratio >= 0.95 ? 'text-green-600' : 'text-gray-600'}`}>
                        {s.compa_ratio.toFixed(3)}
                      </span>
                    ) : '—'}
                  </td>
                  <td><ScoreBadge score={s.readiness_score} /></td>
                  <td className="font-medium text-brand-600">{s.eligible_for}</td>
                  <td>
                    {s.salary_impact != null ? (
                      <span className={s.salary_impact > 0 ? 'text-green-600' : 'text-gray-500'}>
                        {s.salary_impact > 0 ? '+' : ''}${Number(s.salary_impact).toLocaleString()}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    <button className="btn-secondary btn-sm" onClick={() => openDetail(s)}>Detail</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)}
        title={`Promotion Detail — ${detail?.user?.name || ''}`} size="lg">
        {detailLoading ? (
          <div className="py-8 text-center text-gray-400">Loading…</div>
        ) : detail ? (
          <div className="space-y-6">
            {/* User Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Current Classification</p>
                <p className="font-semibold">{detail.user.classification || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Current Salary</p>
                <p className="font-semibold">
                  {detail.current_salary ? `$${Number(detail.current_salary.annual_salary).toLocaleString()}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Years Total</p>
                <p className="font-semibold">{detail.years_total} yr</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Years in Current Role</p>
                <p className="font-semibold">{detail.years_in_role} yr</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Compa-Ratio</p>
                <p className="font-semibold">
                  {detail.compa_ratio != null ? detail.compa_ratio.toFixed(3) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Band</p>
                <p className="font-semibold text-sm">
                  {detail.band
                    ? `$${Number(detail.band.band_min).toLocaleString()} – $${Number(detail.band.band_max).toLocaleString()}`
                    : '—'}
                </p>
              </div>
            </div>

            {/* Promotion Paths */}
            {detail.promotion_paths.length === 0 ? (
              <p className="text-sm text-gray-400">No promotion criteria defined for current classification.</p>
            ) : detail.promotion_paths.map((path, i) => (
              <div key={i} className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">
                    → {path.to_classification}
                  </h3>
                  <ScoreBadge score={path.readiness_score} />
                </div>

                {/* Criteria checklist */}
                <div className="space-y-2">
                  {path.checks.map((check, ci) => (
                    <div key={ci} className="flex items-center gap-3 text-sm">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${check.met ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                        {check.met ? '✓' : '✗'}
                      </span>
                      <span className={check.met ? 'text-gray-700' : 'text-gray-400'}>
                        {check.label}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        Current: {check.value ?? '—'} · {check.points}pts
                      </span>
                    </div>
                  ))}
                </div>

                {path.notes && (
                  <p className="text-xs text-gray-400 mt-2">{path.notes}</p>
                )}
              </div>
            ))}

            {/* Salary History */}
            {detail.salary_history.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Salary History</h3>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Effective Date</th>
                        <th>Type</th>
                        <th>Salary</th>
                        <th>Classification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.salary_history.map(r => (
                        <tr key={r.id}>
                          <td>{formatDisplayDate(r.effective_date)}</td>
                          <td className="capitalize">{r.change_type}</td>
                          <td className="font-medium">${Number(r.annual_salary).toLocaleString()}</td>
                          <td className="text-xs">{r.classification || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
