import { useState, useEffect, useCallback } from "react";
import {
  adminApi,
  AdminBusiness,
  PaginatedResponse,
  AdminBusinessDetail,
  MonthlyReport,
  MonthlyReportMonth,
} from "../../lib/adminApi";

type StatusFilter = "all" | "active" | "suspended";

// ---- Business Detail Drawer ----
function BusinessDetailDrawer({
  business,
  onClose,
}: {
  business: AdminBusiness;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<AdminBusinessDetail | null>(null);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadingReport, setLoadingReport] = useState(true);
  const [tab, setTab] = useState<"stats" | "report">("stats");

  useEffect(() => {
    setLoadingDetail(true);
    adminApi.getBusiness(business._id).then((res) => {
      if (res.data.success) setDetail(res.data.data);
      setLoadingDetail(false);
    });

    setLoadingReport(true);
    adminApi.getBusinessReport(business._id).then((res) => {
      if (res.data.success) setReport(res.data.data);
      setLoadingReport(false);
    });
  }, [business._id]);

  const formatMonth = (ym: string) => {
    const [y, m] = ym.split("-");
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleString("en-IN", {
      month: "short",
      year: "numeric",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="admin-modal-overlay"
        style={{ justifyContent: "flex-end", alignItems: "stretch", padding: 0 }}
        onClick={onClose}
      >
        {/* Drawer panel */}
        <div
          className="admin-business-drawer"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer Header */}
          <div className="admin-business-drawer-header">
            <div>
              <h2 className="admin-page-title" style={{ fontSize: "1.125rem" }}>
                {business.name}
              </h2>
              <p className="admin-page-subtitle">
                <code style={{ fontSize: "0.75rem", background: "var(--color-surface)", padding: "2px 6px", borderRadius: "4px" }}>
                  {business.businessCode}
                </code>
                {" · "}
                {business.businessType}
              </p>
            </div>
            <button
              className="admin-filter-btn"
              onClick={onClose}
              style={{ padding: "0.375rem 0.75rem" }}
            >
              ✕ Close
            </button>
          </div>

          {/* Tabs */}
          <div className="admin-drawer-tabs">
            <button
              className={`admin-drawer-tab${tab === "stats" ? " active" : ""}`}
              onClick={() => setTab("stats")}
            >
              Overview Stats
            </button>
            <button
              className={`admin-drawer-tab${tab === "report" ? " active" : ""}`}
              onClick={() => setTab("report")}
            >
              Monthly Report
            </button>
          </div>

          {/* Tab: Stats */}
          {tab === "stats" && (
            <div className="admin-drawer-body">
              {loadingDetail ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="admin-skeleton" style={{ height: 80, borderRadius: 12 }} />
                  ))}
                </div>
              ) : detail ? (
                <>
                  <div className="admin-drawer-stats-grid">
                    <div className="admin-drawer-stat">
                      <span className="stat-card-label">QR Scans</span>
                      <span className="stat-card-value">{detail.stats.qrScans.toLocaleString()}</span>
                    </div>
                    <div className="admin-drawer-stat">
                      <span className="stat-card-label">Feedback Events</span>
                      <span className="stat-card-value">{detail.stats.feedbackCount.toLocaleString()}</span>
                    </div>
                    <div className="admin-drawer-stat" style={{ borderColor: "#dcfce7" }}>
                      <span className="stat-card-label">Copied to Google</span>
                      <span className="stat-card-value" style={{ color: "#16a34a" }}>
                        {detail.stats.copiedToGoogle.toLocaleString()}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                        reviews through ReviewBoost
                      </span>
                    </div>
                    <div className="admin-drawer-stat">
                      <span className="stat-card-label">Avg Rating</span>
                      <span className="stat-card-value">{detail.stats.averageRating} ★</span>
                    </div>
                  </div>

                  <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#f0fdf4", borderRadius: "12px", border: "1px solid #bbf7d0" }}>
                    <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#166534", marginBottom: "0.25rem" }}>
                      📊 Proof of Value
                    </p>
                    <p style={{ fontSize: "0.875rem", color: "#15803d", lineHeight: 1.6 }}>
                      <strong>{business.name}</strong> has received{" "}
                      <strong>{detail.stats.copiedToGoogle.toLocaleString()}</strong> review
                      {detail.stats.copiedToGoogle !== 1 ? "s" : ""} copied to Google
                      through ReviewBoost from <strong>{detail.stats.feedbackCount.toLocaleString()}</strong> total
                      feedback events.
                    </p>
                  </div>

                  <div style={{ marginTop: "1rem" }}>
                    <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
                      Owner
                    </p>
                    <p style={{ fontWeight: 500 }}>{detail.business.ownerId?.name}</p>
                    <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                      {detail.business.ownerId?.email}
                    </p>
                  </div>
                </>
              ) : (
                <p style={{ color: "var(--color-text-muted)" }}>Failed to load stats.</p>
              )}
            </div>
          )}

          {/* Tab: Monthly Report */}
          {tab === "report" && (
            <div className="admin-drawer-body">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                  Last 12 months + current month (live)
                </p>
                <button
                  className="admin-filter-btn"
                  onClick={handlePrint}
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  🖨 Print / Save PDF
                </button>
              </div>

              {loadingReport ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="admin-skeleton" style={{ height: 36 }} />
                  ))}
                </div>
              ) : report ? (
                <>
                  {/* Summary Banner */}
                  <div style={{ padding: "1rem", background: "#f0fdf4", borderRadius: "12px", border: "1px solid #bbf7d0", marginBottom: "1rem" }}>
                    <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#166534", marginBottom: "0.25rem" }}>
                      12-Month Summary
                    </p>
                    <p style={{ fontSize: "0.875rem", color: "#15803d" }}>
                      <strong>{report.business.name}</strong> received{" "}
                      <strong>{report.totals.googleClicks.toLocaleString()}</strong> reviews copied
                      to Google from <strong>{report.totals.feedbackCount.toLocaleString()}</strong>{" "}
                      feedback events and <strong>{report.totals.scans.toLocaleString()}</strong> QR scans.
                    </p>
                  </div>

                  <div className="admin-table-card" style={{ overflow: "auto" }}>
                    <table className="admin-table" style={{ minWidth: 500 }}>
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th style={{ textAlign: "right" }}>QR Scans</th>
                          <th style={{ textAlign: "right" }}>Feedback</th>
                          <th style={{ textAlign: "right" }}>→ Google</th>
                          <th style={{ textAlign: "right" }}>Avg Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.months.map((m: MonthlyReportMonth) => (
                          <tr
                            key={m.month}
                            style={m.isCurrentMonth ? { background: "#f0fdf4", fontWeight: 600 } : {}}
                          >
                            <td>
                              {formatMonth(m.month)}
                              {m.isCurrentMonth && (
                                <span style={{ marginLeft: "0.5rem", fontSize: "0.65rem", background: "#bbf7d0", color: "#166534", padding: "1px 6px", borderRadius: "4px" }}>
                                  Live
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: "right" }}>{m.scans.toLocaleString()}</td>
                            <td style={{ textAlign: "right" }}>{m.feedbackCount.toLocaleString()}</td>
                            <td style={{ textAlign: "right", color: "#16a34a", fontWeight: 600 }}>
                              {m.googleClicks.toLocaleString()}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {m.avgRating > 0 ? `${m.avgRating} ★` : "—"}
                            </td>
                          </tr>
                        ))}
                        {/* Totals row */}
                        <tr style={{ borderTop: "2px solid var(--color-border-subtle)", fontWeight: 700, background: "var(--color-surface)" }}>
                          <td>Total</td>
                          <td style={{ textAlign: "right" }}>{report.totals.scans.toLocaleString()}</td>
                          <td style={{ textAlign: "right" }}>{report.totals.feedbackCount.toLocaleString()}</td>
                          <td style={{ textAlign: "right", color: "#16a34a" }}>{report.totals.googleClicks.toLocaleString()}</td>
                          <td style={{ textAlign: "right" }}>—</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p style={{ color: "var(--color-text-muted)" }}>Failed to load report.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ---- Main Businesses Page ----
export default function AdminBusinessesPage() {
  const [data, setData] = useState<PaginatedResponse<AdminBusiness> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedBusiness, setSelectedBusiness] = useState<AdminBusiness | null>(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    business: AdminBusiness;
    newStatus: boolean;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBusinesses = useCallback(async (p: number, s: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.getBusinesses(p, 10, s);
      if (res.data.success) {
        setData(res.data.data);
      } else {
        setError("Failed to fetch businesses");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch businesses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBusinesses(page, search);
  }, [page, fetchBusinesses]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBusinesses(1, search);
  };

  const handleToggleStatus = async () => {
    if (!confirmModal) return;
    setActionLoading(true);
    try {
      const res = await adminApi.updateBusinessStatus(confirmModal.business._id, confirmModal.newStatus);
      if (res.data.success && data) {
        setData({
          ...data,
          items: data.items.map((b) =>
            b._id === confirmModal.business._id ? { ...b, isActive: confirmModal.newStatus } : b
          ),
        });
      }
    } catch {
      alert("Failed to update status");
    } finally {
      setActionLoading(false);
      setConfirmModal(null);
    }
  };

  const filteredItems = data?.items.filter((b) => {
    if (statusFilter === "active") return b.isActive;
    if (statusFilter === "suspended") return !b.isActive;
    return true;
  });

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Businesses</h1>
          <p className="admin-page-subtitle">
            Manage all businesses on the platform
            {data && <> · <strong>{data.total}</strong> total</>}
          </p>
        </div>
      </div>

      {error && (
        <div className="db-error">
          <span>{error}</span>
          <button className="db-error-retry" onClick={() => fetchBusinesses(page, search)}>
            Retry
          </button>
        </div>
      )}

      <div className="admin-table-card">
        <div className="admin-table-toolbar">
          <form onSubmit={handleSearch} className="admin-search-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or business code..."
              className="admin-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
          <button className={`admin-filter-btn${statusFilter === "all" ? " active" : ""}`} onClick={() => setStatusFilter("all")}>All</button>
          <button className={`admin-filter-btn${statusFilter === "active" ? " active" : ""}`} onClick={() => setStatusFilter("active")}>Active</button>
          <button className={`admin-filter-btn${statusFilter === "suspended" ? " active" : ""}`} onClick={() => setStatusFilter("suspended")}>Suspended</button>
        </div>

        {loading && !data ? (
          <div style={{ padding: "1rem" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="admin-skeleton admin-skeleton-row" />
            ))}
          </div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Code</th>
                  <th>Owner</th>
                  <th>Plan</th>
                  <th>Type</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems && filteredItems.length > 0 ? (
                  filteredItems.map((business) => (
                    <tr key={business._id}>
                      <td style={{ fontWeight: 500 }}>{business.name}</td>
                      <td>
                        <code style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", background: "var(--color-surface)", padding: "2px 6px", borderRadius: "4px" }}>
                          {business.businessCode}
                        </code>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{business.ownerId?.name || "—"}</div>
                        <div className="admin-table-cell-secondary">{business.ownerId?.email}</div>
                      </td>
                      <td>
                        <span className={`admin-status-badge admin-status-badge--${business.plan || 'free'}`}>
                          {business.plan ? business.plan.charAt(0).toUpperCase() + business.plan.slice(1) : 'Free'}
                        </span>
                      </td>
                      <td style={{ textTransform: "capitalize" }}>{business.businessType || "—"}</td>
                      <td style={{ color: "var(--color-text-muted)" }}>
                        {new Date(business.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <span className={`admin-status-badge admin-status-badge--${business.isActive ? "active" : "suspended"}`}>
                          <span className="admin-status-badge-dot" />
                          {business.isActive ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            className="admin-action-btn admin-action-btn--view"
                            onClick={() => setSelectedBusiness(business)}
                          >
                            View
                          </button>
                          <button
                            className={`admin-action-btn ${business.isActive ? "admin-action-btn--suspend" : "admin-action-btn--enable"}`}
                            onClick={() => setConfirmModal({ business, newStatus: !business.isActive })}
                          >
                            {business.isActive ? "Suspend" : "Enable"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8}>
                      <div className="admin-empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        <p>No businesses found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {data && data.pages > 1 && (
              <div className="admin-pagination">
                <span className="admin-pagination-info">
                  Page {data.page} of {data.pages} · {data.total} results
                </span>
                <div className="admin-pagination-controls">
                  <button className="admin-pagination-btn" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Prev</button>
                  <span className="admin-pagination-current">{page}</span>
                  <button className="admin-pagination-btn" disabled={page === data.pages} onClick={() => setPage((p) => Math.min(data.pages, p + 1))}>Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Business Detail Drawer */}
      {selectedBusiness && (
        <BusinessDetailDrawer
          business={selectedBusiness}
          onClose={() => setSelectedBusiness(null)}
        />
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="admin-modal-overlay" onClick={() => !actionLoading && setConfirmModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-modal-title">
              {confirmModal.newStatus ? "Enable Business" : "Suspend Business"}
            </h3>
            <p className="admin-modal-body">
              {confirmModal.newStatus ? (
                <>Are you sure you want to re-enable <strong>{confirmModal.business.name}</strong>? They will regain dashboard and QR access.</>
              ) : (
                <>Are you sure you want to suspend <strong>{confirmModal.business.name}</strong>? This blocks their dashboard and public QR page.</>
              )}
            </p>
            <div className="admin-modal-actions">
              <button className="admin-modal-btn" onClick={() => setConfirmModal(null)} disabled={actionLoading}>Cancel</button>
              <button
                className={`admin-modal-btn ${confirmModal.newStatus ? "admin-modal-btn--success" : "admin-modal-btn--danger"}`}
                onClick={handleToggleStatus}
                disabled={actionLoading}
              >
                {actionLoading ? "Processing..." : confirmModal.newStatus ? "Enable" : "Suspend"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
