import { useState, useEffect, useRef } from "react";
import { useDashboardOverview } from '../hooks/queries/useDashboardOverview';
import { useInbox, useResolveInboxItem, useBulkResolveInboxItems, useInboxReplySuggestion } from '../hooks/queries/useInbox';
import type { FeedbackItem, InboxQueryParams } from '../services/inboxService';

// ---- Types ----------------------------------------------------------------



type SortOption = "newest" | "oldest" | "rating_high" | "rating_low";

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "newest", label: "Newest First" },
  { key: "oldest", label: "Oldest First" },
  { key: "rating_high", label: "Rating: High → Low" },
  { key: "rating_low", label: "Rating: Low → High" },
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

function ResolutionHealthCard({
  resolved,
  total,
  unresolved,
  rate,
}: {
  resolved: number;
  total: number;
  unresolved: number;
  rate: number;
}) {
  const getHealthStatus = () => {
    if (rate >= 80) return { label: 'Optimal Health', variant: 'good', text: 'Excellent turnaround on reviews.' };
    if (rate >= 50) return { label: 'Needs Attention', variant: 'warn', text: 'Several reviews pending resolution.' };
    return { label: 'Critical Action', variant: 'alert', text: 'High volume of unresolved complaints.' };
  };

  const status = getHealthStatus();

  // Circle progress calculation
  const circSize = 88;
  const strokeW = 8;
  const radius = (circSize - strokeW) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, rate)) / 100) * circumference;

  return (
    <div className="db-card inbox-health-card">
      <div className="inbox-health-header">
        <div>
          <h3 className="db-card-title" style={{ margin: '0 0 2px 0' }}>Resolution Health</h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#6B6B63', fontWeight: 500 }}>
            Operational response & triage efficiency
          </p>
        </div>
        <span className={`inbox-gauge-badge inbox-gauge-badge--${status.variant}`}>
          {status.label}
        </span>
      </div>

      <div className="inbox-health-content">
        {/* Left: Mini Efficiency Ring */}
        <div className="inbox-health-ring-wrap">
          <svg width={circSize} height={circSize} viewBox={`0 0 ${circSize} ${circSize}`} style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx={circSize / 2}
              cy={circSize / 2}
              r={radius}
              fill="none"
              stroke="var(--brutal-cream, #F5F3ED)"
              strokeWidth={strokeW}
            />
            <circle
              cx={circSize / 2}
              cy={circSize / 2}
              r={radius}
              fill="none"
              stroke="var(--brutal-border, #1A1A1A)"
              strokeWidth={strokeW}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          </svg>
          <div className="inbox-health-ring-inner">
            <span className="inbox-health-rate-num">{rate}%</span>
            <span className="inbox-health-rate-sub">RESOLVED</span>
          </div>
        </div>

        {/* Right: Operational Health Details */}
        <div className="inbox-health-details">
          <div className="inbox-health-meter-bar">
            <div className="inbox-health-meter-fill" style={{ width: `${Math.min(100, Math.max(0, rate))}%` }} />
          </div>

          <p className="inbox-health-desc-text">
            {status.text}
          </p>

          <div className="inbox-health-stats-row">
            <div className="inbox-health-stat">
              <span className="label">Resolved</span>
              <strong className="val val--resolved">{resolved}</strong>
            </div>
            <div className="inbox-health-stat">
              <span className="label">Pending</span>
              <strong className="val val--pending">{unresolved}</strong>
            </div>
            <div className="inbox-health-stat">
              <span className="label">Total Feedback</span>
              <strong className="val">{total}</strong>
            </div>
          </div>
        </div>
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
  const [replyError, setReplyError] = useState("");
  const [showMatchBox, setShowMatchBox] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const replyMutation = useInboxReplySuggestion();

  const fetchReply = async () => {
    setReplyError("");
    setShowMatchBox(false);
    try {
      const draft = await replyMutation.mutateAsync(item._id);
      setReplyDraft(draft.slice(0, 300));
      setReplyStarted(true);
    } catch (err: any) {
      setReplyError(err.message || "Could not generate a reply. Please try again.");
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
                disabled={replyMutation.isPending}
              >
                {replyMutation.isPending ? (
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
                    disabled={replyMutation.isPending}
                  >
                    {replyMutation.isPending ? (
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
  const [page, setPage] = useState(1);
  const limit = 20;

  // Filters
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Drawer
  const [drawerItem, setDrawerItem] = useState<FeedbackItem | null>(null);

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

  // Queries
  const queryParams: InboxQueryParams = {
    page,
    limit,
    sort,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(ratingFilter.length > 0 && { rating: ratingFilter.join(",") }),
    ...(statusFilter.length > 0 && { status: statusFilter.join(",") }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  };

  const { data: inboxData, isLoading: loading, error: queryError, refetch } = useInbox(queryParams);
  const error = queryError ? queryError.message : null;
  const { data: fallbackStats } = useDashboardOverview('year');

  const resolveMutation = useResolveInboxItem();
  const bulkResolveMutation = useBulkResolveInboxItems();

  const items = inboxData?.items || [];
  const total = inboxData?.total || 0;
  const totalPages = inboxData?.totalPages || 1;

  // Extract or synthesize operational inbox stats
  const inboxStats = inboxData?.stats ?? (fallbackStats ? {
    totalFeedback: total || Object.values(fallbackStats.ratingDistribution || {}).reduce((a: any, b: any) => a + b, 0) as number,
    unresolvedCount: inboxData?.atRiskCount ?? 0,
    resolvedCount: Math.max(0, (total || 0) - (inboxData?.atRiskCount ?? 0)),
    atRiskCount: fallbackStats.atRiskCount ?? inboxData?.atRiskCount ?? 0,
    resolutionRate: total > 0 ? Math.round((Math.max(0, total - (inboxData?.atRiskCount ?? 0)) / total) * 100) : 100,
    avgRating: fallbackStats.avgRating ? Number(fallbackStats.avgRating) : 0,
    ratingDistribution: fallbackStats.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  } : null);

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
    try {
      await resolveMutation.mutateAsync(id);
      if (drawerItem?._id === id) {
        setDrawerItem((prev) =>
          prev ? { ...prev, status: "resolved" as const } : null,
        );
      }
    } catch {
      // ignore
    }
  };

  // Bulk resolve
  const bulkResolve = async () => {
    if (selected.size === 0) return;
    try {
      await bulkResolveMutation.mutateAsync(Array.from(selected));
      setSelected(new Set());
    } catch {
      // ignore
    }
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

      {/* ---- Operational Inbox KPI Cards ---- */}
      {inboxStats && (
        <div className="inbox-analytics-wrapper">
          {/* Top Operational KPI Stat Cards Grid */}
          <div className="inbox-stats-grid">
            <div className="stat-card stat-card--amber" title="Feedback not yet marked resolved">
              <div className="stat-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="stat-card-body">
                <p className="stat-card-label">Action Needed</p>
                <p className="stat-card-value">{inboxStats.unresolvedCount}</p>
                <p className="stat-card-sub">pending / unresolved</p>
              </div>
            </div>

            <div className="stat-card stat-card--rose" title="Critical ratings 1 or 2 stars needing damage control">
              <div className="stat-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div className="stat-card-body">
                <p className="stat-card-label">At-Risk Feedback</p>
                <p className="stat-card-value">{inboxStats.atRiskCount}</p>
                <p className="stat-card-sub">rating ≤ 2 stars</p>
              </div>
            </div>

            <div className="stat-card stat-card--brand" title="Percentage of received feedback marked resolved">
              <div className="stat-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div className="stat-card-body">
                <p className="stat-card-label">Resolution Rate</p>
                <p className="stat-card-value">{inboxStats.resolutionRate}%</p>
                <p className="stat-card-sub">{inboxStats.resolvedCount} of {inboxStats.totalFeedback} resolved</p>
              </div>
            </div>

            <div className="stat-card stat-card--cyan" title="Average sentiment score across all customer feedback">
              <div className="stat-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div className="stat-card-body">
                <p className="stat-card-label">Customer Sentiment</p>
                <p className="stat-card-value">{inboxStats.avgRating > 0 ? `${inboxStats.avgRating} ★` : '—'}</p>
                <p className="stat-card-sub">from {inboxStats.totalFeedback} responses</p>
              </div>
            </div>
          </div>

          {/* Secondary 50%-50% Breakdown Row: Rating Dist + Speedometer Resolution Gauge */}
          <div className="inbox-breakdown-row">
            {/* Left 50%: Rating Distribution Detail Card */}
            <div className="db-card inbox-breakdown-card">
              <div className="inbox-breakdown-header">
                <div>
                  <h3 className="db-card-title" style={{ margin: '0 0 2px 0' }}>Rating Breakdown</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#6B6B63', fontWeight: 500 }}>
                    Distribution of incoming customer feedback
                  </p>
                </div>
                <div className="inbox-score-hero">
                  <span className="inbox-score-val">{inboxStats.avgRating > 0 ? inboxStats.avgRating.toFixed(1) : '0.0'}</span>
                  <span className="inbox-score-stars" style={{ color: starColor(Math.round(inboxStats.avgRating || 5)) }}>
                    {renderStars(Math.round(inboxStats.avgRating || 5))}
                  </span>
                  <span className="inbox-score-caption">{inboxStats.totalFeedback} reviews</span>
                </div>
              </div>

              <div className="inbox-dist-bars" style={{ marginTop: '1.25rem' }}>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = inboxStats.ratingDistribution[star] || 0;
                  const pct = inboxStats.totalFeedback > 0 ? Math.round((count / inboxStats.totalFeedback) * 100) : 0;
                  return (
                    <div className="inbox-dist-row" key={star}>
                      <span className="inbox-dist-label">{star}★</span>
                      <div className="inbox-dist-track">
                        <div className="inbox-dist-fill" style={{ width: `${pct}%`, background: starColor(star) }} />
                      </div>
                      <span className="inbox-dist-pct">{pct}%</span>
                      <span className="inbox-dist-count">({count})</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 50%: Resolution Health & Operational Efficiency Card */}
            <ResolutionHealthCard
              resolved={inboxStats.resolvedCount}
              total={inboxStats.totalFeedback}
              unresolved={inboxStats.unresolvedCount}
              rate={inboxStats.resolutionRate}
            />
          </div>
        </div>
      )}

      {/* ---- Row 1: Search & Sort ---- */}
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

        <div className="inbox-select-wrap">
          <select
            id="inbox-sort"
            className="inbox-filter-select"
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

      {/* ---- Row 2: Filters (Rating, Status, Date) styled like Newest First ---- */}
      <div className="inbox-filter-bar-row">
        {/* Rating Filter Dropdown */}
        <div className="inbox-select-wrap">
          <select
            id="inbox-rating-filter"
            className={`inbox-filter-select${ratingFilter.length > 0 ? " inbox-filter-select--active" : ""}`}
            value={ratingFilter.length > 0 ? ratingFilter.join(",") : ""}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) setRatingFilter([]);
              else setRatingFilter(val.split(",").map(Number));
            }}
          >
            <option value="">Rating: All</option>
            <option value="5">5 Stars (★★★★★)</option>
            <option value="4">4 Stars (★★★★☆)</option>
            <option value="3">3 Stars (★★★☆☆)</option>
            <option value="2">2 Stars (★★☆☆☆)</option>
            <option value="1">1 Star (★☆☆☆☆)</option>
            <option value="1,2">At-Risk (1-2★)</option>
          </select>
        </div>

        {/* Status Filter Dropdown */}
        <div className="inbox-select-wrap">
          <select
            id="inbox-status-filter"
            className={`inbox-filter-select${statusFilter.length > 0 ? " inbox-filter-select--active" : ""}`}
            value={statusFilter.length > 0 ? statusFilter[0] : ""}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) setStatusFilter([]);
              else setStatusFilter([val]);
            }}
          >
            <option value="">Status: All</option>
            <option value="draft">Draft</option>
            <option value="copied_to_google">Copied to Google</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {/* Compact Date Box */}
        <div className="inbox-date-range-box">
          <input
            type="date"
            className="inbox-date-input"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="From date"
            title="Filter from date"
          />
          <span className="inbox-date-arrow">→</span>
          <input
            type="date"
            className="inbox-date-input"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="To date"
            title="Filter to date"
          />
        </div>

        {/* Reset Filter Button */}
        {hasActiveFilters && (
          <button
            className="inbox-reset-filter-btn"
            onClick={clearFilters}
            type="button"
            title="Clear all active filters"
          >
            ✕ Reset Filters
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
            disabled={bulkResolveMutation.isPending}
          >
            {bulkResolveMutation.isPending ? (
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
          <button className="db-error-retry" onClick={() => refetch()}>
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
                        background: `${starColor(item.rating)}15`,
                        color: starColor(item.rating)
                      }}
                    >
                      <span>{item.rating}★</span>
                      <span className="inbox-table-stars">{'★'.repeat(item.rating)}</span>
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
          resolving={resolveMutation.isPending}
        />
      )}
    </div>
  );
}


