import { ClerkProvider, useAuth, useUser } from '@clerk/clerk-react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './hooks/useToast';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { PageLoader } from './components/LoadingSpinner';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminStaff from './pages/admin/Staff';
import AdminGrants from './pages/admin/Grants';
import GrantDetail from './pages/admin/GrantDetail';
import AdminProjects from './pages/admin/Projects';
import ProjectDetail from './pages/admin/ProjectDetail';
import AdminTasks from './pages/admin/Tasks';
import AdminAssignments from './pages/admin/Assignments';
import AdminWorkload from './pages/admin/Workload';
import AdminTimesheets from './pages/admin/Timesheets';
import AdminSalary from './pages/admin/Salary';
import AdminFringeRates from './pages/admin/FringeRates';
import AdminBudget from './pages/admin/Budget';
import AdminRunway from './pages/admin/Runway';
import AdminReports from './pages/admin/Reports';
import AdminImport from './pages/admin/Import';
import AdminClassifications from './pages/admin/Classifications';
import AdminEquity from './pages/admin/Equity';
import AdminPromotions from './pages/admin/Promotions';
import AdminSalaryAdjustments from './pages/admin/SalaryAdjustments';
import AdminCRM from './pages/admin/CRM';
import AdminCRMContact from './pages/admin/CRMContact';
import AdminStaffPlans from './pages/admin/StaffPlans';
import ProgramSchedule from './pages/admin/ProgramSchedule';
import AdminDocs from './pages/admin/AdminDocs';

// Staff pages
import StaffTimesheet from './pages/staff/Timesheet';
import MyAssignments from './pages/staff/MyAssignments';
import MyProfile from './pages/staff/MyProfile';

import LandingPage from './pages/LandingPage';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('VITE_CLERK_PUBLISHABLE_KEY is not set. Create a .env file with this variable.');
}

function RoleRedirect() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  if (!isLoaded) return <PageLoader />;
  if (!isSignedIn) return <LandingPage />;


  const role = user?.publicMetadata?.role || 'staff';
  return role === 'admin'
    ? <Navigate to="/admin/dashboard" replace />
    : <Navigate to="/timesheet" replace />;
}

// Sign-in is handled by Clerk Account Portal (accounts.champ-pm.app)
// This route catches redirects and bounces unauthenticated users there
function SignInPage() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return <PageLoader />;
  if (isSignedIn) return <Navigate to="/" replace />;
  // Redirect to Clerk Account Portal — avoids needs_client_trust issue with embedded component
  window.location.href = `https://accounts.champ-pm.app/sign-in?redirect_url=${encodeURIComponent(window.location.origin)}`;
  return <PageLoader />;
}

export default function App() {
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      fallbackRedirectUrl="/"
    >
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/" element={<RoleRedirect />} />

            {/* Admin-only routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route element={<AppLayout />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/staff" element={<AdminStaff />} />
                <Route path="/admin/grants" element={<AdminGrants />} />
                <Route path="/admin/grants/:id" element={<GrantDetail />} />
                <Route path="/admin/projects" element={<AdminProjects />} />
                <Route path="/admin/projects/:id" element={<ProjectDetail />} />
                <Route path="/admin/tasks" element={<AdminTasks />} />
                <Route path="/admin/assignments" element={<AdminAssignments />} />
                <Route path="/admin/workload" element={<AdminWorkload />} />
                <Route path="/admin/timesheets" element={<AdminTimesheets />} />
                <Route path="/admin/salary" element={<AdminSalary />} />
                <Route path="/admin/fringe-rates" element={<AdminFringeRates />} />
                <Route path="/admin/budget" element={<AdminBudget />} />
                <Route path="/admin/runway" element={<AdminRunway />} />
                <Route path="/admin/reports" element={<AdminReports />} />
                <Route path="/admin/import" element={<AdminImport />} />
                <Route path="/admin/classifications" element={<AdminClassifications />} />
                <Route path="/admin/equity" element={<AdminEquity />} />
                <Route path="/admin/promotions" element={<AdminPromotions />} />
                <Route path="/admin/salary-adjustments" element={<AdminSalaryAdjustments />} />
                <Route path="/admin/staff-plans" element={<AdminStaffPlans />} />
                <Route path="/admin/program-schedule" element={<ProgramSchedule />} />
                <Route path="/admin/docs" element={<AdminDocs />} />
                <Route path="/admin/docs/:section" element={<AdminDocs />} />
                <Route path="/admin/docs/:section/:page" element={<AdminDocs />} />
              </Route>
            </Route>

            {/* CRM — all authenticated staff can view */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'staff']} />}>
              <Route element={<AppLayout />}>
                <Route path="/admin/crm" element={<AdminCRM />} />
                <Route path="/admin/crm/:id" element={<AdminCRMContact />} />
              </Route>
            </Route>

            {/* Staff + admin shared routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'staff']} />}>
              <Route element={<AppLayout />}>
                <Route path="/timesheet" element={<StaffTimesheet />} />
                <Route path="/my-assignments" element={<MyAssignments />} />
                <Route path="/my-profile" element={<MyProfile />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ClerkProvider>
  );
}
