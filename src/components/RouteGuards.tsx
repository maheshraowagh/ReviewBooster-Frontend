import { useAuth } from '@clerk/clerk-react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppAuth } from '../providers/AuthProvider';

/**
 * ProtectedRoute — requires Clerk authentication.
 * Redirects to /sign-in if not signed in.
 * Shows a loading spinner while auth state is being determined.
 */
export function ProtectedRoute() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  return <Outlet />;
}

/**
 * NonAdminGuard — prevents admin users from accessing owner-only pages like /onboarding.
 * Redirects admin users directly to /admin/dashboard.
 */
export function NonAdminGuard() {
  const { appUser, isLoading } = useAppAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!appUser) {
    return <Navigate to="/sign-in" replace />;
  }

  if (appUser.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
}

/**
 * OwnerGuard — only allows users with role 'owner' (or 'staff').
 * Admin users are redirected to /admin/dashboard.
 * Users without a business are redirected to /onboarding.
 */
export function OwnerGuard() {
  const { appUser, isLoading } = useAppAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!appUser) {
    return <Navigate to="/sign-in" replace />;
  }

  // Admin users should not see owner routes
  if (appUser.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // No business yet — go to onboarding
  if (!appUser.businessId) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}

/**
 * OnboardingGuard — legacy alias for OwnerGuard, kept for backwards compatibility.
 */
export const OnboardingGuard = OwnerGuard;

/**
 * AdminGuard — only allows users with role 'admin'.
 * Non-admin users are redirected to /dashboard.
 */
export function AdminGuard() {
  const { appUser, isLoading } = useAppAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!appUser || appUser.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

/**
 * PublicOnlyRoute — for sign-in/sign-up pages.
 * Redirects already-signed-in users based on their role.
 */
export function PublicOnlyRoute() {
  const { isSignedIn, isLoaded } = useAuth();
  const { appUser } = useAppAuth();

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  if (isSignedIn) {
    // Route admin users to admin panel, owners to dashboard
    if (appUser?.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

/**
 * RoleRedirect — redirects the user to the correct landing page according to their role.
 * Used for root or catch-all routes (*).
 */
export function RoleRedirect() {
  const { appUser, isLoading } = useAppAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!appUser) {
    return <Navigate to="/sign-in" replace />;
  }

  if (appUser.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

/**
 * Simple full-screen loading spinner.
 */
function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <p>Loading...</p>
    </div>
  );
}
