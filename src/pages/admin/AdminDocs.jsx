import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DOCS_VERSION, DOCS_UPDATED } from '../../docs/metadata';

// Technical Reference
import FormulaReference from '../../docs/FormulaReference';
import BusinessRules from '../../docs/BusinessRules';
import Assumptions from '../../docs/Assumptions';
import DatabaseSchema from '../../docs/DatabaseSchema';

// Architecture
import ArchitectureDiagram from '../../docs/ArchitectureDiagram';

// User Guides
import GettingStarted from '../../docs/GettingStarted';
import DashboardGuide from '../../docs/DashboardGuide';
import StaffGuide from '../../docs/StaffGuide';
import GrantsGuide from '../../docs/GrantsGuide';
import TimesheetsGuide from '../../docs/TimesheetsGuide';
import BudgetGuide from '../../docs/BudgetGuide';
import RunwayGuide from '../../docs/RunwayGuide';
import ReportsGuide from '../../docs/ReportsGuide';
import SalaryGuide from '../../docs/SalaryGuide';
import EquityGuide from '../../docs/EquityGuide';
import StaffPlansGuide from '../../docs/StaffPlansGuide';
import ScheduleGuide from '../../docs/ScheduleGuide';
import ProgramScheduleGuide from '../../docs/ProgramScheduleGuide';
import ImportGuide from '../../docs/ImportGuide';
import CRMGuide from '../../docs/CRMGuide';

const NAV = [
  {
    section: 'technical',
    label: 'Technical Reference',
    pages: [
      { page: 'formulas', label: 'Formula Reference', component: FormulaReference },
      { page: 'business-rules', label: 'Business Rules', component: BusinessRules },
      { page: 'assumptions', label: 'Assumptions & Config', component: Assumptions },
      { page: 'schema', label: 'Database Schema', component: DatabaseSchema },
    ],
  },
  {
    section: 'architecture',
    label: 'Architecture',
    pages: [
      { page: 'diagram', label: 'System Overview', component: ArchitectureDiagram },
    ],
  },
  {
    section: 'user-guide',
    label: 'User Guide',
    pages: [
      { page: 'getting-started', label: 'Getting Started', component: GettingStarted },
      { page: 'dashboard', label: 'Dashboard', component: DashboardGuide },
      { page: 'staff', label: 'Staff Management', component: StaffGuide },
      { page: 'grants', label: 'Grants & Projects', component: GrantsGuide },
      { page: 'timesheets', label: 'Timesheets', component: TimesheetsGuide },
      { page: 'budget', label: 'Budget & Burndown', component: BudgetGuide },
      { page: 'runway', label: 'Runway & Staff Plans', component: RunwayGuide },
      { page: 'reports', label: 'Reports & Export', component: ReportsGuide },
      { page: 'salary', label: 'Salary & Fringe Rates', component: SalaryGuide },
      { page: 'equity', label: 'Equity Dashboard', component: EquityGuide },
      { page: 'staff-plans', label: 'Staff Plans', component: StaffPlansGuide },
      { page: 'schedule', label: 'Project Schedule', component: ScheduleGuide },
      { page: 'program-schedule', label: 'Program Schedule', component: ProgramScheduleGuide },
      { page: 'import', label: 'Import', component: ImportGuide },
      { page: 'crm', label: 'CRM', component: CRMGuide },
    ],
  },
];

const DEFAULT_SECTION = 'technical';
const DEFAULT_PAGE = 'formulas';

function findPage(section, page) {
  const s = NAV.find(n => n.section === section);
  if (!s) return null;
  return s.pages.find(p => p.page === page) || s.pages[0];
}

function ChevronIcon({ open }) {
  return (
    <svg
      className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default function AdminDocs() {
  const { section = DEFAULT_SECTION, page = DEFAULT_PAGE } = useParams();
  const navigate = useNavigate();

  // Track which sections are open
  const [openSections, setOpenSections] = useState(() => {
    const init = {};
    for (const n of NAV) init[n.section] = true;
    return init;
  });

  const toggleSection = (s) =>
    setOpenSections(prev => ({ ...prev, [s]: !prev[s] }));

  const goTo = (s, p) => navigate(`/admin/docs/${s}/${p}`);

  const current = findPage(section, page);
  const PageComponent = current?.component;

  return (
    <div className="docs-layout-outer flex h-full -m-6 overflow-hidden">
      {/* ── Left Sidebar ── */}
      <aside className="docs-sidebar w-56 shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col overflow-hidden">
        {/* Version block */}
        <div className="px-4 py-4 border-b border-gray-200">
          <p className="text-sm font-bold text-gray-900">CHAMP-PM Docs</p>
          <p className="text-xs text-gray-400 mt-0.5">v{DOCS_VERSION} · Updated {DOCS_UPDATED}</p>
        </div>

        {/* Nav tree */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV.map(({ section: sec, label, pages }) => (
            <div key={sec} className="mb-1">
              <button
                onClick={() => toggleSection(sec)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 rounded"
              >
                <ChevronIcon open={openSections[sec]} />
                {label}
              </button>
              {openSections[sec] && (
                <div className="ml-3 mt-0.5">
                  {pages.map(({ page: pg, label: lbl }) => {
                    const isActive = section === sec && page === pg;
                    return (
                      <button
                        key={pg}
                        onClick={() => goTo(sec, pg)}
                        className={`w-full text-left px-2 py-1.5 text-xs rounded mb-0.5 transition-colors ${
                          isActive
                            ? 'bg-blue-600 text-white font-medium'
                            : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                        }`}
                      >
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Print button */}
        <div className="px-3 py-3 border-t border-gray-200 no-print">
          <button
            onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <PrintIcon className="w-3.5 h-3.5" />
            Print / Export PDF
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="docs-content flex-1 overflow-y-auto p-8">
        {PageComponent ? (
          <PageComponent />
        ) : (
          <div className="text-gray-400 text-sm">Page not found. Select a topic from the sidebar.</div>
        )}
      </main>
    </div>
  );
}

function PrintIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  );
}
