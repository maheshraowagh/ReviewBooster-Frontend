import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./providers/AuthProvider";
import {
  ProtectedRoute,
  PublicOnlyRoute,
  OwnerGuard,
  NonAdminGuard,
  AdminGuard,
  RoleRedirect,
} from "./components/RouteGuards";
import DashboardLayout from "./components/DashboardLayout";

// Pages
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import DashboardPage from "./pages/DashboardPage";
import InboxPage from "./pages/InboxPage";
import InsightsPage from "./pages/InsightsPage";
import QrLocationsPage from "./pages/QrLocationsPage";
import BillingPage from "./pages/BillingPage";
import HelpPage from "./pages/HelpPage";
import OnboardingPage from "./pages/OnboardingPage";
import SettingsPage from "./pages/SettingsPage";
import PublicReviewFlow from "./pages/public/PublicReviewFlow";
import WhatsAppPage from "./pages/WhatsAppPage";
import CampaignsPage from "./pages/CampaignsPage";
import EmailCampaignsPage from "./pages/EmailCampaignsPage";

// Admin Pages
import AdminLayout from "./components/AdminLayout";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminBusinessesPage from "./pages/admin/AdminBusinessesPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminActivityPage from "./pages/admin/AdminActivityPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
      </AuthProvider>
    </BrowserRouter>
  );
}
