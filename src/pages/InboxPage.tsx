import { useState, useEffect, useCallback, useRef } from 'react';
import api, { type ApiResponse } from '../lib/api';

// ---- Types ----------------------------------------------------------------

interface FeedbackItem {
  _id: string;
  rating: number;
  tags: string[];
  note: string;
  aiDraftText: string;
  finalText: string;
  status: 'draft' | 'copied_to_google' | 'resolved';
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

type SortOption = 'newest' | 'oldest' | 'rating_high' | 'rating_low';

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'newest', label: 'Newest First' },
  { key: 'oldest', label: 'Oldest First' },
  { key: 'rating_high', label: 'Rating: High → Low' },
  { key: 'rating_low', label: 'Rating: Low → High' },
];

const STATUS_OPTIONS = [
  { key: 'draft', label: 'Draft' },
  { key: 'copied_to_google', label: 'Copied to Google' },
  { key: 'resolved', label: 'Resolved' },
];

// ---- Helpers --------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function truncate(text: string, max: number): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

function renderStars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

const starColor = (rating: number) => {
  const map: Record<number, string> = {
    1: '#ef4444',
    2: '#f97316',
    3: '#eab308',
    4: '#22c55e',
    5: '#6366f1',
  };
  return map[rating] || '#64748b';
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    draft: 'Draft',
    copied_to_google: 'Copied to Google',
    resolved: 'Resolved',
  };
  return map[s] || s;
};

// ---- Sub-components -------------------------------------------------------

function FeedbackCard({
  item,
  selected,
  onToggle,
  onClick,
}: {
  item: FeedbackItem;
  selected: boolean;
  onToggle: () => void;
  onClick: () => void;
}) {
  return (
    <div
      className={`inbox-card${selected ? ' inbox-card--selected' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="inbox-card-check" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="inbox-checkbox"
          aria-label={`Select feedback ${item._id}`}
        />
      </div>
      <div className="inbox-card-body">
        <div className="inbox-card-top">
          <span className="inbox-card-stars" style={{ color: starColor(item.rating) }}>
            {renderStars(item.rating)}
          </span>
          <span className={`inbox-status-badge inbox-status--${item.status}`}>
            {statusLabel(item.status)}
          </span>
        </div>
        <div className="inbox-card-tags">
          {item.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="inbox-tag">{tag}</span>
          ))}
          {item.tags.length > 4 && (
            <span className="inbox-tag inbox-tag--more">+{item.tags.length - 4}</span>
          )}
        </div>
        <p className="inbox-card-note">
          {truncate(item.note || item.finalText || item.aiDraftText || 'No note', 120)}
        </p>
        <span className="inbox-card-date">{formatDate(item.createdAt)}</span>
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
  return (
    <>
      <div className="inbox-drawer-overlay" onClick={onClose} />
      <aside className="inbox-drawer">
        <div className="inbox-drawer-header">
          <h2 className="inbox-drawer-title">Feedback Detail</h2>
          <button className="inbox-drawer-close" onClick={onClose} aria-label="Close drawer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="inbox-drawer-body">
          {/* Rating */}
          <div className="inbox-drawer-section">
            <span className="inbox-drawer-label">Rating</span>
            <span className="inbox-drawer-stars" style={{ color: starColor(item.rating) }}>
              {renderStars(item.rating)}
            </span>
          </div>

          {/* Status */}
          <div className="inbox-drawer-section">
            <span className="inbox-drawer-label">Status</span>
            <span className={`inbox-status-badge inbox-status--${item.status}`}>
              {statusLabel(item.status)}
            </span>
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="inbox-drawer-section">
              <span className="inbox-drawer-label">Tags</span>
              <div className="inbox-drawer-tags">
                {item.tags.map((tag) => (
                  <span key={tag} className="inbox-tag">{tag}</span>
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
              <p className="inbox-drawer-text inbox-drawer-text--ai">{item.aiDraftText}</p>
            </div>
          )}

          {/* Final Text */}
          {item.finalText && (
            <div className="inbox-drawer-section">
              <span className="inbox-drawer-label">Final Review Text</span>
              <p className="inbox-drawer-text">{item.finalText}</p>
            </div>
          )}

          {/* Timestamp */}
          <div className="inbox-drawer-section">
            <span className="inbox-drawer-label">Submitted</span>
            <span className="inbox-drawer-date">{formatDate(item.createdAt)}</span>
          </div>
        </div>

        {/* Actions */}
        {item.status !== 'resolved' && (
          <div className="inbox-drawer-actions">
            <button
              className="inbox-resolve-btn"
              onClick={() => onResolve(item._id)}
              disabled={resolving}
            >
              {resolving ? (
                <span className="loading-spinner loading-spinner--sm" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              Mark Resolved
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

function SkeletonCard() {
  return (
    <div className="inbox-card inbox-card--skeleton">
      <div className="inbox-card-check"><div className="skeleton-box skeleton-check" /></div>
      <div className="inbox-card-body">
        <div className="inbox-card-top">
          <div className="skeleton-box skeleton-stars" />
          <div className="skeleton-box skeleton-badge" />
        </div>
        <div className="inbox-card-tags">
          <div className="skeleton-box skeleton-tag" />
          <div className="skeleton-box skeleton-tag" />
        </div>
        <div className="skeleton-box skeleton-text" />
        <div className="skeleton-box skeleton-date" />
      </div>
    </div>
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

  // Filters
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkResolving, setBulkResolving] = useState(false);

  // Drawer
  const [drawerItem, setDrawerItem] = useState<FeedbackItem | null>(null);
  const [drawerResolving, setDrawerResolving] = useState(false);

  // Debounce search
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

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

  // Fetch data
  const fetchInbox = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      params.set('sort', sort);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (ratingFilter.length > 0) params.set('rating', ratingFilter.join(','));
      if (statusFilter.length > 0) params.set('status', statusFilter.join(','));
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await api.get<ApiResponse<InboxResponse>>(`/inbox?${params.toString()}`);
      if (res.data.success && res.data.data) {
        setItems(res.data.data.items);
        setTotal(res.data.data.total);
        setTotalPages(res.data.data.totalPages);
      } else {
        setError(res.data.error?.message || 'Failed to load inbox');
      }
    } catch {
      setError('Could not connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, sort, debouncedSearch, ratingFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

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
        prev.map((i) => (i._id === id ? { ...i, status: 'resolved' as const } : i))
      );
      if (drawerItem?._id === id) {
        setDrawerItem((prev) => (prev ? { ...prev, status: 'resolved' as const } : null));
      }
    } catch {
      // silently fail — user sees the status didn't change
    } finally {
      setDrawerResolving(false);
    }
  };

  // Bulk resolve
  const bulkResolve = async () => {
    if (selected.size === 0) return;
    setBulkResolving(true);
    try {
      await api.patch('/inbox/bulk-resolve', { ids: Array.from(selected) });
      setItems((prev) =>
        prev.map((i) =>
          selected.has(i._id) ? { ...i, status: 'resolved' as const } : i
        )
      );
      setSelected(new Set());
    } catch {
      // silently fail
    } finally {
      setBulkResolving(false);
    }
  };

  // Rating filter toggle
  const toggleRating = (r: number) => {
    setRatingFilter((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  };

  // Status filter toggle
  const toggleStatus = (s: string) => {
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setRatingFilter([]);
    setStatusFilter([]);
    setDateFrom('');
    setDateTo('');
    setSort('newest');
    setPage(1);
  };

  const hasActiveFilters =
    debouncedSearch || ratingFilter.length > 0 || statusFilter.length > 0 || dateFrom || dateTo;

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
          <p className="db-subtitle">{total} total feedback{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* ---- Search & Filters ---- */}
      <div className="inbox-toolbar">
        <div className="inbox-search-wrap">
          <svg className="inbox-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
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
            <button className="inbox-search-clear" onClick={() => { setSearch(''); setDebouncedSearch(''); }} aria-label="Clear search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
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
              <option key={o.key} value={o.key}>{o.label}</option>
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
              className={`inbox-chip${ratingFilter.includes(r) ? ' inbox-chip--active' : ''}`}
              onClick={() => toggleRating(r)}
              style={ratingFilter.includes(r) ? { borderColor: starColor(r), color: starColor(r) } : {}}
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
              className={`inbox-chip${statusFilter.includes(s.key) ? ' inbox-chip--active' : ''}`}
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
          <button className="inbox-chip inbox-chip--clear" onClick={clearFilters}>
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
              <span className="loading-spinner loading-spinner--sm" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
          <button className="db-error-retry" onClick={fetchInbox}>Retry</button>
        </div>
      )}

      {/* ---- Loading skeleton ---- */}
      {loading && (
        <div className="inbox-list">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* ---- Feedback list ---- */}
      {!loading && items.length > 0 && (
        <>
          <div className="inbox-list">
            {items.map((item) => (
              <FeedbackCard
                key={item._id}
                item={item}
                selected={selected.has(item._id)}
                onToggle={() => toggleSelect(item._id)}
                onClick={() => setDrawerItem(item)}
              />
            ))}
          </div>

          {/* ---- Pagination ---- */}
          {totalPages > 1 && (
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
                  className={`inbox-page-btn${p === page ? ' inbox-page-btn--active' : ''}`}
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
        </>
      )}

      {/* ---- Empty state ---- */}
      {!loading && items.length === 0 && !error && (
        <div className="inbox-empty">
          <div className="inbox-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="48" height="48">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3 className="inbox-empty-title">No feedback found</h3>
          <p className="inbox-empty-text">
            {hasActiveFilters
              ? 'Try adjusting your filters or search query.'
              : 'Feedback from customers will appear here once they scan your QR code.'}
          </p>
          {hasActiveFilters && (
            <button className="inbox-chip inbox-chip--clear" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* ---- Side drawer ---- */}
      {drawerItem && (
        <DrawerDetail
          item={drawerItem}
          onClose={() => setDrawerItem(null)}
          onResolve={resolveOne}
          resolving={drawerResolving}
        />
      )}
    </div>
  );
}
