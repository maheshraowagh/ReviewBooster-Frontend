import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './providers/AuthProvider';
import {
  ProtectedRoute,
  PublicOnlyRoute,
  OnboardingGuard,
  // AdminGuard,      // Enabled in Phase 7
} from './components/RouteGuards';
import DashboardLayout from './components/DashboardLayout';

// Pages
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import DashboardPage from './pages/DashboardPage';
import OnboardingPage from './pages/OnboardingPage';
import PublicReviewFlow from './pages/public/PublicReviewFlow';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ---- Public auth pages (redirect if already signed in) ---- */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />
          </Route>

          {/* ---- Public customer flow (no auth required) ---- */}
          <Route path="/r/:businessCode" element={<PublicReviewFlow />} />

          {/* ---- Protected owner routes ---- */}
          <Route element={<ProtectedRoute />}>
            {/* Onboarding (no guard — accessible to users without a business) */}
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* Routes that require a business — wrapped with OnboardingGuard + DashboardLayout */}
            <Route element={<OnboardingGuard />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                {/* Phase 6: <Route path="/inbox" element={<InboxPage />} /> */}
                {/* Phase 6: <Route path="/settings" element={<SettingsPage />} /> */}
              </Route>
            </Route>
          </Route>

          {/* ---- Admin routes ---- */}
          {/* Phase 7: <Route element={<AdminGuard />}> ... </Route> */}

          {/* ---- Catch-all redirect ---- */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
