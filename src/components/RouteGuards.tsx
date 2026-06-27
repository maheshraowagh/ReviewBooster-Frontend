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
 * OnboardingGuard — after auth, checks if the user has a business.
 * - No business → redirect to /onboarding
 * - Has business → render the child route
 */
export function OnboardingGuard() {
  const { appUser, isLoading } = useAppAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!appUser) {
    return <Navigate to="/sign-in" replace />;
  }

  // No business yet — go to onboarding
  if (!appUser.businessId) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}

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
 * Redirects already-signed-in users to /dashboard.
 */
export function PublicOnlyRoute() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  if (isSignedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
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
