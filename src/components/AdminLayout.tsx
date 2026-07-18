import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";

export default function AdminLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="layout-container">
      {/* Admin Sidebar */}
      <aside className="sidebar" style={{ borderRight: "1px solid var(--color-surface-200)" }}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--color-brand)" }}>
              Admin Panel
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            Overview
          </NavLink>
          <NavLink
            to="/admin/businesses"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            Businesses
          </NavLink>
          <NavLink
            to="/admin/users"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            Users
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button
            className="nav-item text-danger"
            onClick={() => navigate("/dashboard")}
            style={{ marginBottom: "0.5rem" }}
          >
            ← Exit Admin Panel
          </button>
          <button className="nav-item text-danger" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Admin Content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
