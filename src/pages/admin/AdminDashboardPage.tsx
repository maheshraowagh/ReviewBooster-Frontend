import { useState, useEffect } from "react";
import { adminApi, AdminStats } from "../../lib/adminApi";

const STAT_CARDS = [
  {
    key: "totalUsers",
    label: "Total Users",
    color: "brand",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: "totalBusinesses",
    label: "Total Businesses",
    color: "cyan",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    key: "activeBusinesses",
    label: "Active Businesses",
    color: "brand",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  {
    key: "suspendedBusinesses",
    label: "Suspended",
    color: "rose",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    ),
  },
  {
    key: "totalFeedback",
    label: "Total Feedback",
    color: "amber",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    key: "totalQRCodeScans",
    label: "Total QR Scans",
    color: "cyan",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    key: "averagePlatformRating",
    label: "Avg Platform Rating",
    color: "amber",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
    ),
    suffix: " ★",
  },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi
      .getStats()
      .then((res) => {
        if (res.data.success) {
          setStats(res.data.data);
        } else {
          setError("Failed to load stats");
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load stats");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Platform Overview</h1>
          <p className="admin-page-subtitle">
            Monitor your entire ReviewBoost platform at a glance
          </p>
        </div>
      </div>

      {error && (
        <div className="db-error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
          <button className="db-error-retry" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="admin-stats-grid">
        {loading
          ? Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="admin-skeleton admin-skeleton-card" />
            ))
          : STAT_CARDS.map((card) => (
              <div key={card.key} className={`stat-card stat-card--${card.color}`}>
                <div className="stat-card-icon">{card.icon}</div>
                <div className="stat-card-body">
                  <span className="stat-card-label">{card.label}</span>
                  <span className="stat-card-value">
                    {stats?.[card.key as keyof AdminStats] ?? 0}
                    {card.suffix || ""}
                  </span>
                </div>
              </div>
            ))}
      </div>

      {/* Quick Actions */}
      {!loading && !error && (
        <div className="admin-table-card" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "1rem", color: "var(--color-text-primary)" }}>
            Quick Actions
          </h3>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <a href="/admin/businesses" className="admin-filter-btn" style={{ textDecoration: "none" }}>
              View All Businesses →
            </a>
            <a href="/admin/users" className="admin-filter-btn" style={{ textDecoration: "none" }}>
              View All Users →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
