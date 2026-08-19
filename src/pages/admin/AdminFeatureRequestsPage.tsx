import { useState, useEffect, useCallback } from "react";
import { adminApi, AdminFeatureRequest, AdminFeatureRequestsResponse } from "../../lib/adminApi";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "in-review", label: "In Review" },
  { value: "planned", label: "Planned" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
] as const;

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#d97706", bg: "rgba(217, 119, 6, 0.1)" },
  "in-review": { label: "In Review", color: "#2563eb", bg: "rgba(37, 99, 235, 0.1)" },
  planned: { label: "Planned", color: "#7c3aed", bg: "rgba(124, 58, 237, 0.1)" },
  completed: { label: "Completed", color: "#16a34a", bg: "rgba(22, 163, 74, 0.1)" },
  declined: { label: "Declined", color: "#dc2626", bg: "rgba(220, 38, 38, 0.1)" },
};

const CATEGORY_CONFIG: Record<string, string> = {
  "ui-ux": "UI/UX",
  "new-feature": "New Feature",
  integration: "Integration",
  performance: "Performance",
  other: "Other",
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

export default function AdminFeatureRequestsPage() {
  const [data, setData] = useState<AdminFeatureRequestsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async (p: number, status: string, q: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.getFeatureRequests(p, 20, status, q);
      if (res.data.success) {
        setData(res.data.data);
      } else {
        setError("Failed to load feature requests");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load feature requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchData(1, statusFilter, searchDebounced);
  }, [statusFilter, searchDebounced, fetchData]);

  useEffect(() => {
    fetchData(page, statusFilter, searchDebounced);
  }, [page, fetchData]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdating(id);
    try {
      const res = await adminApi.updateFeatureRequest(id, { status: newStatus });
      if (res.data.success) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((item) =>
              item._id === id ? { ...item, status: newStatus as AdminFeatureRequest["status"] } : item
            ),
          };
        });
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setUpdating(null);
    }
  };

  const handleSaveNote = async (id: string) => {
    setUpdating(id);
    try {
      const res = await adminApi.updateFeatureRequest(id, { adminNote: noteText });
      if (res.data.success) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((item) =>
              item._id === id ? { ...item, adminNote: noteText } : item
            ),
          };
        });
        setEditingNote(null);
      }
    } catch {
      // silently fail
    } finally {
      setUpdating(null);
    }
  };

  const totalPending = data?.statusCounts?.pending || 0;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            Feature Requests
            {totalPending > 0 && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: "0.6rem",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  minWidth: "1.5rem",
                  height: "1.5rem",
                  padding: "0 0.45rem",
                  borderRadius: "999px",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#fff",
                  verticalAlign: "middle",
                }}
              >
                {totalPending}
              </span>
            )}
          </h1>
          <p className="admin-page-subtitle">
            Review and manage feature requests from users
            {data && <> · <strong>{data.total}</strong> total requests</>}
          </p>
        </div>
        <button
          className="admin-filter-btn"
          onClick={() => { setPage(1); fetchData(1, statusFilter, searchDebounced); }}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Status count chips */}
      {data?.statusCounts && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => {
            const count = data.statusCounts[key] || 0;
            const isActive = statusFilter === key;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(isActive ? "" : key)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "999px",
                  border: isActive ? `1.5px solid ${config.color}` : "1.5px solid var(--color-border)",
                  background: isActive ? config.bg : "transparent",
                  color: isActive ? config.color : "var(--color-text-secondary)",
                  cursor: "pointer",
                  fontSize: "0.78rem",
                  fontWeight: 500,
                  transition: "all 0.15s",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: config.color,
                    opacity: isActive ? 1 : 0.5,
                  }}
                />
                {config.label}
                <span style={{ fontWeight: 700, marginLeft: 2 }}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Search + filter row */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: "360px" }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search by title or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "0.55rem 0.75rem 0.55rem 2.25rem",
              borderRadius: "8px",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              fontSize: "0.85rem",
              outline: "none",
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "0.55rem 0.75rem",
            borderRadius: "8px",
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
            fontSize: "0.85rem",
            cursor: "pointer",
            outline: "none",
          }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="db-error">
          <span>{error}</span>
          <button className="db-error-retry" onClick={() => fetchData(page, statusFilter, searchDebounced)}>Retry</button>
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
                  <th>Request</th>
                  <th>Category</th>
                  <th>Business</th>
                  <th>Upvotes</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th style={{ width: "100px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.items && data.items.length > 0 ? (
                  data.items.map((item) => {
                    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                    const isExpanded = expandedId === item._id;
                    const isEditingThisNote = editingNote === item._id;

                    return (
                      <>
                        <tr
                          key={item._id}
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setExpandedId(isExpanded ? null : item._id);
                            if (!isExpanded) {
                              setEditingNote(null);
                            }
                          }}
                        >
                          <td>
                            <div style={{ fontWeight: 600, maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item.title}
                            </div>
                            <div className="admin-table-cell-secondary" style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item.description}
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: "0.73rem",
                                fontWeight: 500,
                                padding: "3px 8px",
                                borderRadius: "6px",
                                background: "var(--color-surface)",
                                border: "1px solid var(--color-border)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {CATEGORY_CONFIG[item.category] || item.category}
                            </span>
                          </td>
                          <td>
                            {item.businessId ? (
                              <>
                                <div style={{ fontWeight: 500, fontSize: "0.82rem" }}>{item.businessId.name}</div>
                                <code style={{ fontSize: "0.7rem", background: "var(--color-surface)", padding: "1px 5px", borderRadius: "3px" }}>
                                  {item.businessId.businessCode}
                                </code>
                              </>
                            ) : (
                              <span style={{ color: "var(--color-text-muted)" }}>—</span>
                            )}
                          </td>
                          <td>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontWeight: 600 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 9V5a3 3 0 0 0-6 0v4" />
                                <path d="M18 9H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z" />
                              </svg>
                              {item.upvotes?.length || 0}
                            </span>
                          </td>
                          <td>
                            <select
                              value={item.status}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleStatusChange(item._id, e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              disabled={updating === item._id}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                border: `1.5px solid ${statusCfg.color}`,
                                background: statusCfg.bg,
                                color: statusCfg.color,
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                outline: "none",
                                appearance: "auto",
                                opacity: updating === item._id ? 0.6 : 1,
                              }}
                            >
                              <option value="pending">Pending</option>
                              <option value="in-review">In Review</option>
                              <option value="planned">Planned</option>
                              <option value="completed">Completed</option>
                              <option value="declined">Declined</option>
                            </select>
                          </td>
                          <td>
                            <div style={{ fontWeight: 500, whiteSpace: "nowrap", fontSize: "0.82rem" }}>
                              {timeAgo(item.createdAt)}
                            </div>
                            <div className="admin-table-cell-secondary">
                              {formatDate(item.createdAt)}
                            </div>
                          </td>
                          <td>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedId(isExpanded ? null : item._id);
                              }}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                border: "1px solid var(--color-border)",
                                background: "var(--color-surface)",
                                color: "var(--color-text-secondary)",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                fontWeight: 500,
                              }}
                            >
                              {isExpanded ? "Collapse" : "Details"}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${item._id}-detail`}>
                            <td colSpan={7} style={{ padding: 0 }}>
                              <div
                                style={{
                                  padding: "1rem 1.25rem",
                                  background: "var(--color-surface)",
                                  borderTop: "1px solid var(--color-border)",
                                  borderBottom: "1px solid var(--color-border)",
                                }}
                              >
                                <div style={{ marginBottom: "0.75rem" }}>
                                  <strong style={{ fontSize: "0.82rem" }}>Full Description:</strong>
                                  <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem", lineHeight: 1.6, color: "var(--color-text-secondary)" }}>
                                    {item.description}
                                  </p>
                                </div>
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                                    <strong style={{ fontSize: "0.82rem" }}>Admin Note:</strong>
                                    {!isEditingThisNote && (
                                      <button
                                        onClick={() => {
                                          setEditingNote(item._id);
                                          setNoteText(item.adminNote || "");
                                        }}
                                        style={{
                                          padding: "2px 8px",
                                          borderRadius: "4px",
                                          border: "1px solid var(--color-border)",
                                          background: "transparent",
                                          color: "var(--color-text-muted)",
                                          cursor: "pointer",
                                          fontSize: "0.72rem",
                                        }}
                                      >
                                        {item.adminNote ? "Edit" : "Add Note"}
                                      </button>
                                    )}
                                  </div>
                                  {isEditingThisNote ? (
                                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                                      <textarea
                                        value={noteText}
                                        onChange={(e) => setNoteText(e.target.value)}
                                        placeholder="Add a note for this request…"
                                        rows={3}
                                        style={{
                                          flex: 1,
                                          padding: "0.5rem",
                                          borderRadius: "6px",
                                          border: "1px solid var(--color-border)",
                                          background: "var(--color-bg)",
                                          color: "var(--color-text)",
                                          fontSize: "0.82rem",
                                          resize: "vertical",
                                          outline: "none",
                                          fontFamily: "inherit",
                                        }}
                                      />
                                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                                        <button
                                          onClick={() => handleSaveNote(item._id)}
                                          disabled={updating === item._id}
                                          style={{
                                            padding: "6px 14px",
                                            borderRadius: "6px",
                                            border: "none",
                                            background: "#16a34a",
                                            color: "#fff",
                                            cursor: "pointer",
                                            fontSize: "0.75rem",
                                            fontWeight: 600,
                                            opacity: updating === item._id ? 0.6 : 1,
                                          }}
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() => setEditingNote(null)}
                                          style={{
                                            padding: "6px 14px",
                                            borderRadius: "6px",
                                            border: "1px solid var(--color-border)",
                                            background: "transparent",
                                            color: "var(--color-text-secondary)",
                                            cursor: "pointer",
                                            fontSize: "0.75rem",
                                          }}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p style={{ margin: 0, fontSize: "0.82rem", color: item.adminNote ? "var(--color-text-secondary)" : "var(--color-text-muted)", fontStyle: item.adminNote ? "normal" : "italic" }}>
                                      {item.adminNote || "No admin note yet"}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <div className="admin-empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <p>No feature requests found{statusFilter ? ` with status "${STATUS_CONFIG[statusFilter]?.label}"` : ""}.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {data && data.pages > 1 && (
              <div className="admin-pagination">
                <span className="admin-pagination-info">
                  Page {data.page} of {data.pages} · {data.total} requests
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
