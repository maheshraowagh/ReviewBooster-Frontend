import { useState, useEffect, useCallback } from "react";
import { adminApi, AuditLogEntry, PaginatedResponse } from "../../lib/adminApi";

const ACTION_CONFIG: Record<string, { label: string; variant: "active" | "suspended" }> = {
  BUSINESS_SUSPENDED: { label: "Business Suspended", variant: "suspended" },
  BUSINESS_ENABLED: { label: "Business Enabled", variant: "active" },
};

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminActivityPage() {
  const [data, setData] = useState<PaginatedResponse<AuditLogEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const fetchActivity = useCallback(async (p: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.getActivity(p);
      if (res.data.success) {
        setData(res.data.data);
      } else {
        setError("Failed to load activity log");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load activity log");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity(page);
  }, [page, fetchActivity]);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Activity Log</h1>
          <p className="admin-page-subtitle">
            Record of all admin actions on the platform
            {data && <> · <strong>{data.total}</strong> total entries</>}
          </p>
        </div>
        <button
          className="admin-filter-btn"
          onClick={() => { setPage(1); fetchActivity(1); }}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="db-error">
          <span>{error}</span>
          <button className="db-error-retry" onClick={() => fetchActivity(page)}>Retry</button>
        </div>
      )}

      <div className="admin-table-card">
        {loading && !data ? (
          <div style={{ padding: "1rem" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="admin-skeleton admin-skeleton-row" style={{ marginBottom: "2px" }} />
            ))}
          </div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Business</th>
                  <th>Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {data?.items && data.items.length > 0 ? (
                  data.items.map((entry) => {
                    const config = ACTION_CONFIG[entry.action] || {
                      label: entry.action,
                      variant: "active" as const,
                    };
                    return (
                      <tr key={entry._id}>
                        <td>
                          <div style={{ fontWeight: 500, whiteSpace: "nowrap" }}>
                            {timeAgo(entry.createdAt)}
                          </div>
                          <div className="admin-table-cell-secondary">
                            {formatDate(entry.createdAt)}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>
                            {entry.actorUserId?.name || "Unknown Admin"}
                          </div>
                          <div className="admin-table-cell-secondary">
                            {entry.actorUserId?.email}
                          </div>
                        </td>
                        <td>
                          <span className={`admin-status-badge admin-status-badge--${config.variant}`}>
                            <span className="admin-status-badge-dot" />
                            {config.label}
                          </span>
                        </td>
                        <td>
                          {entry.businessId ? (
                            <>
                              <div style={{ fontWeight: 500 }}>
                                {entry.businessId.name}
                              </div>
                              <div className="admin-table-cell-secondary">
                                <code style={{ fontSize: "0.7rem", background: "var(--color-surface)", padding: "1px 5px", borderRadius: "3px" }}>
                                  {entry.businessId.businessCode}
                                </code>
                              </div>
                            </>
                          ) : (
                            <span style={{ color: "var(--color-text-muted)" }}>—</span>
                          )}
                        </td>
                        <td style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", maxWidth: "200px" }}>
                          {entry.metadata?.businessName && (
                            <div>
                              {entry.action === "BUSINESS_SUSPENDED"
                                ? "Suspended"
                                : "Enabled"}{" "}
                              <strong>{entry.metadata.businessName}</strong>
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontFamily: "monospace" }}>
                            {entry.ipAddress || "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6}>
                      <div className="admin-empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                        <p>No activity recorded yet. Admin actions will appear here.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {data && data.pages > 1 && (
              <div className="admin-pagination">
                <span className="admin-pagination-info">
                  Page {data.page} of {data.pages} · {data.total} entries
                </span>
                <div className="admin-pagination-controls">
                  <button
                    className="admin-pagination-btn"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    ← Prev
                  </button>
                  <span className="admin-pagination-current">{page}</span>
                  <button
                    className="admin-pagination-btn"
                    disabled={page === data.pages}
                    onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
