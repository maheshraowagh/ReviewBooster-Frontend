import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./providers/AuthProvider";
import { SocketProvider } from "./providers/SocketProvider";
import {
  ProtectedRoute,
  PublicOnlyRoute,
  OwnerGuard,
  NonAdminGuard,
  AdminGuard,
  RoleRedirect,
} from "./components/RouteGuards";
import DashboardLayout from "./components/DashboardLayout";

// Lazy-loaded pages
const SignInPage = lazy(() => import("./pages/SignInPage"));
const SignUpPage = lazy(() => import("./pages/SignUpPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const InboxPage = lazy(() => import("./pages/InboxPage"));
const InsightsPage = lazy(() => import("./pages/InsightsPage"));
const QrLocationsPage = lazy(() => import("./pages/QrLocationsPage"));
const BillingPage = lazy(() => import("./pages/BillingPage"));
const HelpPage = lazy(() => import("./pages/HelpPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const PublicReviewFlow = lazy(() => import("./pages/public/PublicReviewFlow"));
const WhatsAppPage = lazy(() => import("./pages/WhatsAppPage"));
const CampaignsPage = lazy(() => import("./pages/CampaignsPage"));
const EmailCampaignsPage = lazy(() => import("./pages/EmailCampaignsPage"));
const LocalSeoPage = lazy(() => import("./pages/LocalSeoPage"));

// Lazy-loaded admin pages
const AdminLayout = lazy(() => import("./components/AdminLayout"));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminBusinessesPage = lazy(() => import("./pages/admin/AdminBusinessesPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminActivityPage = lazy(() => import("./pages/admin/AdminActivityPage"));

// Minimal loading spinner
function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#F2F0EA',
    }}>
      <div style={{
        width: 32, height: 32, border: '3px solid #E3E1D9',
        borderTopColor: '#1A1A1A', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
            {/* ---- Public auth pages (redirect if already signed in based on role) ---- */}
            <Route element={<PublicOnlyRoute />}>
              <Route path="/sign-in/*" element={<SignInPage />} />
              <Route path="/sign-up/*" element={<SignUpPage />} />
            </Route>

            {/* ---- Public customer flow (no auth required) ---- */}
            <Route path="/r/:businessCode" element={<PublicReviewFlow />} />

            {/* ---- Protected routes requiring login ---- */}
            <Route element={<ProtectedRoute />}>
              {/* Onboarding — protected by NonAdminGuard so admins are redirected to /admin/dashboard */}
              <Route element={<NonAdminGuard />}>
                <Route path="/onboarding" element={<OnboardingPage />} />
              </Route>

              {/* Owner/Staff dashboard routes — protected by OwnerGuard (blocks admin role + checks businessId) */}
              <Route element={<OwnerGuard />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/inbox" element={<InboxPage />} />
                  <Route path="/insights" element={<InsightsPage />} />
                  <Route path="/local-seo" element={<LocalSeoPage />} />
                  <Route path="/qr-locations" element={<QrLocationsPage />} />
                  <Route path="/whatsapp" element={<WhatsAppPage />} />
                  <Route path="/campaigns" element={<CampaignsPage />} />
                  <Route path="/email-campaigns" element={<EmailCampaignsPage />} />
                  <Route path="/billing" element={<BillingPage />} />
                  <Route path="/help" element={<HelpPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>
            </Route>

            {/* ---- Admin routes (strictly role === 'admin') ---- */}
            <Route element={<AdminGuard />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                <Route path="/admin/businesses" element={<AdminBusinessesPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/activity" element={<AdminActivityPage />} />
              </Route>
            </Route>

            {/* ---- Root & Catch-all redirect based on user role ---- */}
            <Route path="/" element={<RoleRedirect />} />
            <Route path="*" element={<RoleRedirect />} />
          </Routes>
        </Suspense>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
