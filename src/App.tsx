import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./providers/AuthProvider";
import {
  ProtectedRoute,
  PublicOnlyRoute,
  OnboardingGuard,
  AdminGuard,
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

// Admin Pages
import AdminLayout from "./components/AdminLayout";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminBusinessesPage from "./pages/admin/AdminBusinessesPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";

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
                <Route path="/inbox" element={<InboxPage />} />
                <Route path="/insights" element={<InsightsPage />} />
                <Route path="/qr-locations" element={<QrLocationsPage />} />
                <Route path="/whatsapp" element={<WhatsAppPage />} />
                <Route path="/campaigns" element={<CampaignsPage />} />
                <Route path="/billing" element={<BillingPage />} />
                <Route path="/help" element={<HelpPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>

          {/* ---- Admin routes ---- */}
          <Route element={<AdminGuard />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/businesses" element={<AdminBusinessesPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
            </Route>
          </Route>

          {/* ---- Catch-all redirect ---- */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
