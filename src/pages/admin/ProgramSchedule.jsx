import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { PageLoader } from '../../components/LoadingSpinner';
import ProgramGantt from '../../components/schedule/ProgramGantt';

const VIEW_TABS = [
  { id: 'study_area', label: 'By Study Area' },
  { id: 'grant', label: 'By Grant' },
  { id: 'all', label: 'All Projects' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'data_development', label: 'Data Development' },
  { value: 'mapping', label: 'Mapping' },
  { value: 'custom', label: 'Custom' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active Grants' },
  { value: 'all', label: 'All Grants' },
  { value: 'closed', label: 'Closed Grants' },
];

export default function ProgramSchedule() {
  const api = useApi();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ grants: [], study_areas: [], dependencies: [] });

  const [viewMode, setViewMode] = useState('study_area');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterStudyArea, setFilterStudyArea] = useState('');

  async function load(status) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('grant_status', status);
      const res = await api.get(`/api/program-schedule?${params}`);
      setData(res);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(filterStatus);
  }, [filterStatus]);

  const studyAreas = data.study_areas || [];

  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Program Schedule</h1>
          <p className="text-sm text-gray-500 mt-0.5">All projects across grants on a shared timeline</p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white text-gray-700"
            aria-label="Filter by project type"
          >
            {TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white text-gray-700"
            aria-label="Filter by grant status"
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            value={filterStudyArea}
            onChange={e => setFilterStudyArea(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white text-gray-700"
            aria-label="Filter by study area"
          >
            <option value="">All Study Areas</option>
            {studyAreas.map(sa => (
              <option key={sa.id} value={String(sa.id)}>{sa.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {VIEW_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              viewMode === tab.id
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chart — fixed-height viewport container */}
      <div className="h-[calc(100vh-220px)] min-h-[300px]">
        {loading ? (
          <PageLoader />
        ) : data.grants.length === 0 ? (
          <div className="rounded border border-gray-200 bg-white p-8 text-center text-gray-400 text-sm">
            No project schedules found. Open a project and set up its schedule to see it here.
          </div>
        ) : (
          <ProgramGantt
            grants={data.grants}
            studyAreas={data.study_areas}
            dependencies={data.dependencies}
            viewMode={viewMode}
            filterType={filterType}
            filterStatus={filterStatus}
            filterStudyArea={filterStudyArea}
          />
        )}
      </div>
    </div>
  );
}
