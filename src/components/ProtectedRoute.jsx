import { useAuth, useUser } from '@clerk/clerk-react';
import { Navigate, Outlet } from 'react-router-dom';
import { PageLoader } from './LoadingSpinner';

export default function ProtectedRoute({ allowedRoles }) {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  if (!isLoaded) return <PageLoader />;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;

  const role = user?.publicMetadata?.role || 'staff';

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Admins access everything; staff get redirected away from admin routes
    return <Navigate to="/timesheet" replace />;
  }

  return <Outlet />;
}
