import { useState, useEffect, useCallback, useRef } from "react";
import api, { type ApiResponse } from "../lib/api";

// ---- Types ----------------------------------------------------------------

interface FeedbackItem {
  _id: string;
  rating: number;
  tags: string[];
  note: string;
  aiDraftText: string;
  finalText: string;
  status: "draft" | "copied_to_google" | "resolved";
  createdAt: string;
  sessionId: string;
}

interface InboxResponse {
  items: FeedbackItem[];
  total: number;
  page: number;
  totalPages: number;
  atRiskCount: number;
}

type SortOption = "newest" | "oldest" | "rating_high" | "rating_low";

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "newest", label: "Newest First" },
  { key: "oldest", label: "Oldest First" },
  { key: "rating_high", label: "Rating: High → Low" },
  { key: "rating_low", label: "Rating: Low → High" },
];

const STATUS_OPTIONS = [
  { key: "draft", label: "Draft" },
  { key: "copied_to_google", label: "Copied to Google" },
  { key: "resolved", label: "Resolved" },
];

// ---- Helpers --------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function truncate(text: string, max: number): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function renderStars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

const starColor = (rating: number) => {
  const map: Record<number, string> = {
    1: "#ef4444",
    2: "#f97316",
    3: "#eab308",
    4: "#22c55e",
    5: "#6366f1",
  };
  return map[rating] || "#64748b";
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    draft: "Draft",
    copied_to_google: "Copied to Google",
    resolved: "Resolved",
  };
  return map[s] || s;
};

// ---- Sub-components -------------------------------------------------------

function RadialConversionRate({ scans, clicks }: { scans: number; clicks: number }) {
  const rate = scans > 0 ? Math.round((clicks / scans) * 100) : 0;
  
  // SVG Donut params
  const radius = 30;
  const stroke = 5.5;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  return (
    <div className="inbox-analytics-card">
      <div style={{ position: 'relative', width: '60px', height: '60px', flexShrink: 0 }}>
        <svg height="60" width="60" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            stroke="#f2f0ea"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx="30"
            cy="30"
          />
          <circle
            stroke="var(--color-brand)"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx="30"
            cy="30"
          />
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{rate}%</span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ margin: '0 0 0.15rem 0', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Google Redirection Rate
        </h3>
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.35 }}>
          {clicks} redirections out of {scans} total scans.
        </p>
      </div>
    </div>
  );
}

function DrawerDetail({
  item,
  onClose,
  onResolve,
  resolving,
}: {
  item: FeedbackItem;
  onClose: () => void;
  onResolve: (id: string) => void;
  resolving: boolean;
}) {
  const [replyDraft, setReplyDraft] = useState("");
  const [replyStarted, setReplyStarted] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [showMatchBox, setShowMatchBox] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const fetchReply = async () => {
    setReplyLoading(true);
    setReplyError("");
    setShowMatchBox(false);
    try {
      const res = await api.post<ApiResponse<{ draft: string }>>(
        `/inbox/${item._id}/reply-suggestion`,
      );
      if (res.data.success && res.data.data) {
        setReplyDraft(res.data.data.draft.slice(0, 300));
        setReplyStarted(true);
      } else {
        setReplyError(res.data.error?.message || "Failed to generate a reply");
      }
    } catch {
      setReplyError("Could not generate a reply. Please try again.");
    } finally {
      setReplyLoading(false);
    }
  };

  const handleCopyAndOpen = async () => {
    try {
      await navigator.clipboard.writeText(replyDraft);
    } catch {
      // fallback
    }
    window.open(
      "https://business.google.com/reviews",
      "_blank",
      "noopener,noreferrer",
    );
    setShowMatchBox(true);
    setToastMsg("Reply copied — paste it under the review on Google");
    setTimeout(() => setToastMsg(""), 3000);
  };

  const referenceText = item.finalText || item.aiDraftText || item.note || "";

  return (
    <>
      <div className="inbox-drawer-overlay" onClick={onClose} />
      <aside className="inbox-drawer">
        <div className="inbox-drawer-header">
          <h2 className="inbox-drawer-title">Feedback Detail</h2>
          <button
            className="inbox-drawer-close"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="18"
              height="18"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="inbox-drawer-body">
          {/* Rating */}
          <div className="inbox-drawer-section">
            <span className="inbox-drawer-label">Rating</span>
            <span
              className="inbox-drawer-stars"
              style={{ color: starColor(item.rating) }}
            >
              {renderStars(item.rating)}
            </span>
          </div>

          {/* Status */}
          <div className="inbox-drawer-section">
            <span className="inbox-drawer-label">Status</span>
            <div>
              <span className={`inbox-status-badge inbox-status--${item.status}`}>
                {statusLabel(item.status)}
              </span>
            </div>
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="inbox-drawer-section">
              <span className="inbox-drawer-label">Tags</span>
              <div className="inbox-drawer-tags">
                {item.tags.map((tag) => (
                  <span key={tag} className="inbox-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Customer Note */}
          {item.note && (
            <div className="inbox-drawer-section">
              <span className="inbox-drawer-label">Customer Note</span>
              <p className="inbox-drawer-text">{item.note}</p>
            </div>
          )}

          {/* AI Draft */}
          {item.aiDraftText && (
            <div className="inbox-drawer-section">
              <span className="inbox-drawer-label">AI Draft</span>
              <p className="inbox-drawer-text inbox-drawer-text--ai">
                {item.aiDraftText}
              </p>
            </div>
          )}

          {/* Final Text */}
          {item.finalText && (
            <div className="inbox-drawer-section">
              <span className="inbox-drawer-label">Final Review Text</span>
              <p className="inbox-drawer-text">{item.finalText}</p>
            </div>
          )}

          {/* Submitted */}
          <div className="inbox-drawer-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <span className="inbox-drawer-label">Submitted</span>
            <span className="inbox-drawer-date">
              {formatDate(item.createdAt)}
            </span>
          </div>
        </div>

        {/* Fixed Footer for Actions and Reply Draft */}
        <div className="inbox-drawer-footer">
          {/* Owner Reply card */}
          <div className="inbox-reply-card">
            <div className="inbox-reply-card-header">
              <span className="inbox-reply-card-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="16"
                  height="16"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <div>
                <span className="inbox-reply-card-title">Owner Reply Suggestion</span>
                <p className="inbox-reply-card-subtitle" style={{ margin: 0 }}>
                  Generate and copy an AI reply to address this customer feedback.
                </p>
              </div>
            </div>

            {!replyStarted && (
              <button
                className="inbox-reply-draft-btn"
                onClick={fetchReply}
                disabled={replyLoading}
              >
                {replyLoading ? (
                  <>
                    <span className="loading-spinner loading-spinner--sm" style={{ marginRight: '6px' }} />
                    Generating...
                  </>
                ) : (
                  <>✨ Draft a reply</>
                )}
              </button>
            )}

            {replyError && <p className="inbox-reply-error">{replyError}</p>}

            {replyStarted && (
              <>
                <textarea
                  className="inbox-reply-textarea"
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value.slice(0, 300))}
                  maxLength={300}
                  rows={3}
                />
                <p className="inbox-reply-count">{replyDraft.length}/300</p>

                <div className="inbox-reply-actions">
                  <button
                    className="inbox-reply-regenerate-btn"
                    onClick={fetchReply}
                    disabled={replyLoading}
                  >
                    {replyLoading ? (
                      <span className="loading-spinner loading-spinner--sm" />
                    ) : (
                      "↻ Regenerate"
                    )}
                  </button>
                  <button
                    className="inbox-reply-copy-btn"
                    onClick={handleCopyAndOpen}
                    disabled={!replyDraft.trim()}
                  >
                    Copy and Open Google Reviews
                  </button>
                </div>

                <p className="inbox-reply-hint">
                  Paste this under the review on your Google Business Profile page.
                </p>

                {showMatchBox && (
                  <div className="inbox-reply-match-box">
                    <p className="inbox-reply-match-label">
                      Match with this review content:
                    </p>
                    <p className="inbox-reply-match-text">
                      {referenceText || "(no review text)"}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sticky Mark Resolved bottom bar */}
          {item.status !== "resolved" && (
            <div className="inbox-drawer-actions">
              <button
                className="inbox-resolve-btn"
                onClick={() => onResolve(item._id)}
                disabled={resolving}
              >
                {resolving ? (
                  <span className="loading-spinner loading-spinner--sm" style={{ marginRight: '6px' }} />
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="16"
                    height="16"
                    style={{ marginRight: '6px' }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                Mark Resolved
              </button>
            </div>
          )}
        </div>
      </aside>

      {toastMsg && <div className="inbox-toast">{toastMsg}</div>}
    </>
  );
}

function SkeletonRow() {
  return (
    <tr>
      <td style={{ width: '48px' }}><div className="skeleton-box" style={{ width: '16px', height: '16px', borderRadius: '4px' }} /></td>
      <td style={{ width: '120px' }}><div className="skeleton-box" style={{ width: '80px', height: '16px' }} /></td>
      <td><div className="skeleton-box" style={{ width: '80%', height: '14px' }} /></td>
      <td><div className="skeleton-box" style={{ width: '60px', height: '16px', borderRadius: '99px' }} /></td>
      <td style={{ width: '140px' }}><div className="skeleton-box" style={{ width: '90px', height: '22px', borderRadius: '6px' }} /></td>
      <td style={{ width: '150px' }}><div className="skeleton-box" style={{ width: '100px', height: '14px' }} /></td>
      <td style={{ width: '60px' }}><div className="skeleton-box" style={{ width: '28px', height: '28px', borderRadius: '6px' }} /></td>
    </tr>
  );
}

// ---- Main Page ------------------------------------------------------------

export default function InboxPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statsData, setStatsData] = useState<any>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkResolving, setBulkResolving] = useState(false);

  // Drawer
  const [drawerItem, setDrawerItem] = useState<FeedbackItem | null>(null);
  const [drawerResolving, setDrawerResolving] = useState(false);

  // Debounce search
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search]);

  // Fetch Stats Data
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/overview?period=year');
      if (res.data.success) {
        setStatsData(res.data.data);
      }
    } catch {
      // non-blocking
    }
  }, []);

  // Fetch Inbox Data
  const fetchInbox = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      params.set("sort", sort);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (ratingFilter.length > 0) params.set("rating", ratingFilter.join(","));
      if (statusFilter.length > 0) params.set("status", statusFilter.join(","));
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await api.get<ApiResponse<InboxResponse>>(
        `/inbox?${params.toString()}`,
      );
      if (res.data.success && res.data.data) {
        setItems(res.data.data.items);
        setTotal(res.data.data.total);
        setTotalPages(res.data.data.totalPages);
      } else {
        setError(res.data.error?.message || "Failed to load inbox");
      }
    } catch {
      setError("Could not connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [
    page,
    sort,
    debouncedSearch,
    ratingFilter,
    statusFilter,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [ratingFilter, statusFilter, dateFrom, dateTo, sort]);

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i._id)));
    }
  };

  // Resolve single
  const resolveOne = async (id: string) => {
    setDrawerResolving(true);
    try {
      await api.patch(`/inbox/${id}/resolve`);
      setItems((prev) =>
        prev.map((i) =>
          i._id === id ? { ...i, status: "resolved" as const } : i,
        ),
      );
      if (drawerItem?._id === id) {
        setDrawerItem((prev) =>
          prev ? { ...prev, status: "resolved" as const } : null,
        );
      }
      fetchStats();
    } catch {
      // ignore
    } finally {
      setDrawerResolving(false);
    }
  };

  // Bulk resolve
  const bulkResolve = async () => {
    if (selected.size === 0) return;
    setBulkResolving(true);
    try {
      await api.patch("/inbox/bulk-resolve", { ids: Array.from(selected) });
      setItems((prev) =>
        prev.map((i) =>
          selected.has(i._id) ? { ...i, status: "resolved" as const } : i,
        ),
      );
      setSelected(new Set());
      fetchStats();
    } catch {
      // ignore
    } finally {
      setBulkResolving(false);
    }
  };

  // Rating filter toggle
  const toggleRating = (r: number) => {
    setRatingFilter((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    );
  };

  // Status filter toggle
  const toggleStatus = (s: string) => {
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setRatingFilter([]);
    setStatusFilter([]);
    setDateFrom("");
    setDateTo("");
    setSort("newest");
    setPage(1);
  };

  const hasActiveFilters =
    debouncedSearch ||
    ratingFilter.length > 0 ||
    statusFilter.length > 0 ||
    dateFrom ||
    dateTo;

  // Pagination range
  const pageRange = () => {
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="db-page animate-fade-in">
      {/* ---- Top bar ---- */}
      <div className="db-topbar">
        <div>
          <h1 className="db-title">Feedback Inbox</h1>
          <p className="db-subtitle">
            {total} total feedback{total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* ---- Analytics Summary Cards ---- */}
      {statsData && (
        <div className="inbox-analytics-panel">
          <RadialConversionRate scans={statsData.scans || 0} clicks={statsData.googleClicks || 0} />
          
          <div className="inbox-analytics-card">
            <div className="inbox-dist-bars">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = statsData.ratingDistribution?.[star] || 0;
                const totalScans = Object.values(statsData.ratingDistribution || {}).reduce((a: any, b: any) => a + b, 0) as number;
                const pct = totalScans > 0 ? Math.round((count / totalScans) * 100) : 0;
                return (
                  <div className="inbox-dist-row" key={star}>
                    <span className="inbox-dist-label">{star}★</span>
                    <div className="inbox-dist-track">
                      <div className="inbox-dist-fill" style={{ width: `${pct}%`, background: starColor(star) }} />
                    </div>
                    <span className="inbox-dist-count">{count}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ flexShrink: 0, textAlign: 'center', minWidth: '90px', borderLeft: '1px solid var(--color-border-subtle)', paddingLeft: '1.25rem' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.1 }}>
                {statsData.avgRating ? Number(statsData.avgRating).toFixed(1) : '0.0'}
              </div>
              <div style={{ fontSize: '0.75rem', color: starColor(Math.round(statsData.avgRating || 5)), letterSpacing: '0.5px', margin: '0.25rem 0' }}>
                {renderStars(Math.round(statsData.avgRating || 5))}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                Avg Rating
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- Search & Filters ---- */}
      <div className="inbox-toolbar">
        <div className="inbox-search-wrap">
          <svg
            className="inbox-search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="18"
            height="18"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="inbox-search"
            type="text"
            className="inbox-search"
            placeholder="Search notes, tags, review text…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="inbox-search-clear"
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
              }}
              aria-label="Clear search"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="14"
                height="14"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <div className="inbox-sort-wrap">
          <select
            id="inbox-sort"
            className="inbox-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ---- Filter chips ---- */}
      <div className="inbox-filters">
        <div className="inbox-filter-group">
          <span className="inbox-filter-label">Rating</span>
          {[1, 2, 3, 4, 5].map((r) => (
            <button
              key={r}
              className={`inbox-chip${ratingFilter.includes(r) ? " inbox-chip--active" : ""}`}
              onClick={() => toggleRating(r)}
              style={
                ratingFilter.includes(r)
                  ? { borderColor: starColor(r), color: starColor(r) }
                  : {}
              }
            >
              {r}★
            </button>
          ))}
        </div>
        <div className="inbox-filter-group">
          <span className="inbox-filter-label">Status</span>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.key}
              className={`inbox-chip${statusFilter.includes(s.key) ? " inbox-chip--active" : ""}`}
              onClick={() => toggleStatus(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="inbox-filter-group">
          <span className="inbox-filter-label">Date</span>
          <input
            type="date"
            className="inbox-date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="From date"
          />
          <span className="inbox-date-sep">—</span>
          <input
            type="date"
            className="inbox-date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="To date"
          />
        </div>
        {hasActiveFilters && (
          <button
            className="inbox-chip inbox-chip--clear"
            onClick={clearFilters}
          >
            ✕ Clear All
          </button>
        )}
      </div>

      {/* ---- Bulk action bar ---- */}
      {selected.size > 0 && (
        <div className="inbox-bulk-bar animate-fade-in">
          <label className="inbox-bulk-check">
            <input
              type="checkbox"
              checked={selected.size === items.length}
              onChange={toggleSelectAll}
              className="inbox-checkbox"
            />
            <span>{selected.size} selected</span>
          </label>
          <button
            className="inbox-bulk-resolve"
            onClick={bulkResolve}
            disabled={bulkResolving}
          >
            {bulkResolving ? (
              <span className="loading-spinner loading-spinner--sm" style={{ marginRight: '6px' }} />
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="16"
                height="16"
                style={{ marginRight: '6px' }}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            Resolve Selected
          </button>
        </div>
      )}

      {/* ---- Error ---- */}
      {error && (
        <div className="db-error" role="alert">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="20"
            height="20"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
          <button className="db-error-retry" onClick={fetchInbox}>
            Retry
          </button>
        </div>
      )}

      {/* ---- Advanced Feedback Table ---- */}
      <div className="inbox-table-container">
        <table className="inbox-table">
          <thead>
            <tr>
              <th style={{ width: '48px' }}>
                <input
                  type="checkbox"
                  checked={selected.size === items.length && items.length > 0}
                  onChange={toggleSelectAll}
                  className="inbox-checkbox"
                  aria-label="Select all feedback items"
                />
              </th>
              <th style={{ width: '130px' }}>Rating</th>
              <th>Customer Note</th>
              <th style={{ width: '180px' }}>Tags</th>
              <th style={{ width: '140px' }}>Status</th>
              <th style={{ width: '160px' }}>Submitted</th>
              <th style={{ width: '60px' }}></th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 8 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}

            {!loading && items.length > 0 && items.map((item) => {
              const isSelected = selected.has(item._id);
              return (
                <tr
                  key={item._id}
                  className={isSelected ? 'selected' : ''}
                  onClick={() => setDrawerItem(item)}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(item._id)}
                      className="inbox-checkbox"
                      aria-label={`Select feedback ${item._id}`}
                    />
                  </td>
                  <td>
                    <span
                      className="inbox-table-rating"
                      style={{
                        background: `${starColor(item.rating)}12`,
                        color: starColor(item.rating)
                      }}
                    >
                      {item.rating}★ {renderStars(item.rating).substring(0, item.rating)}
                    </span>
                  </td>
                  <td>
                    <div className="inbox-table-note-col" title={item.note || item.finalText || item.aiDraftText}>
                      {item.note || item.finalText || item.aiDraftText || (
                        <span style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>No comment left</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="inbox-table-tags-col">
                      {item.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="inbox-tag">
                          {tag}
                        </span>
                      ))}
                      {item.tags.length > 2 && (
                        <span className="inbox-tag inbox-tag--more">
                          +{item.tags.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`inbox-status-badge inbox-status--${item.status}`}>
                      {statusLabel(item.status)}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {formatDate(item.createdAt)}
                  </td>
                  <td>
                    <button className="inbox-table-btn-view" aria-label="View details">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ---- Empty state ---- */}
        {!loading && items.length === 0 && !error && (
          <div className="inbox-empty">
            <div className="inbox-empty-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="32"
                height="32"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="inbox-empty-title">No feedback found</h3>
            <p className="inbox-empty-text">
              {hasActiveFilters
                ? "Try adjusting your filters or search query."
                : "Feedback from customers will appear here once they scan your QR code."}
            </p>
            {hasActiveFilters && (
              <button
                className="inbox-chip inbox-chip--clear"
                onClick={clearFilters}
                style={{ marginTop: '0.5rem' }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ---- Pagination ---- */}
      {!loading && totalPages > 1 && (
        <div className="inbox-pagination">
          <button
            className="inbox-page-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ‹ Prev
          </button>
          {pageRange().map((p) => (
            <button
              key={p}
              className={`inbox-page-btn${p === page ? " inbox-page-btn--active" : ""}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          <button
            className="inbox-page-btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next ›
          </button>
        </div>
      )}

      {/* ---- Side drawer ---- */}
      {drawerItem && (
        <DrawerDetail
          key={drawerItem._id}
          item={drawerItem}
          onClose={() => setDrawerItem(null)}
          onResolve={resolveOne}
          resolving={drawerResolving}
        />
      )}
    </div>
  );
}


