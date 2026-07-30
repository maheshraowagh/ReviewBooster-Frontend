import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminApi,
  type AdminStats,
  type AdminStatsFilters,
  type AdminStatsRange,
} from "../../lib/adminApi";

type MetricKey =
  | "lifetimeRevenuePaise"
  | "periodRevenuePaise"
  | "todayRevenuePaise"
  | "todayReviews"
  | "totalFeedback"
  | "activeSubscriptions"
  | "successfulPayments"
  | "googleRedirects"
  | "totalBusinesses"
  | "averagePlatformRating";

const METRICS: Array<{
  key: MetricKey;
  label: string;
  color: string;
  kind?: "currency" | "rating";
  icon: string;
}> = [
  {
    key: "lifetimeRevenuePaise",
    label: "Lifetime Revenue",
    color: "brand",
    kind: "currency",
    icon: "₹",
  },
  {
    key: "periodRevenuePaise",
    label: "Filtered Revenue",
    color: "cyan",
    kind: "currency",
    icon: "↗",
  },
  {
    key: "todayRevenuePaise",
    label: "Today's Revenue",
    color: "brand",
    kind: "currency",
    icon: "₹",
  },
  {
    key: "todayReviews",
    label: "Today's Reviews",
    color: "amber",
    icon: "★",
  },
  {
    key: "totalFeedback",
    label: "Reviews in Period",
    color: "amber",
    icon: "✦",
  },
  {
    key: "activeSubscriptions",
    label: "Paid Subscriptions",
    color: "brand",
    icon: "✓",
  },
  {
    key: "successfulPayments",
    label: "Successful Payments",
    color: "cyan",
    icon: "₹",
  },
  {
    key: "googleRedirects",
    label: "Google Redirects",
    color: "rose",
    icon: "G",
  },
  {
    key: "totalBusinesses",
    label: "Businesses",
    color: "cyan",
    icon: "B",
  },
  {
    key: "averagePlatformRating",
    label: "Average Rating",
    color: "amber",
    kind: "rating",
    icon: "★",
  },
];

const RANGE_OPTIONS: Array<{ value: AdminStatsRange; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom dates" },
];

function formatCurrency(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format((paise || 0) / 100);
}

function formatMetric(
  stats: AdminStats | null,
  key: MetricKey,
  kind?: "currency" | "rating",
) {
  const value = Number(stats?.[key] || 0);
  if (kind === "currency") return formatCurrency(value);
  if (kind === "rating") return `${value.toFixed(2)} ★`;
  return value.toLocaleString("en-IN");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [filters, setFilters] = useState<AdminStatsFilters>({ range: "30d" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    if (
      filters.range === "custom" &&
      (!filters.from || !filters.to)
    ) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await adminApi.getStats(filters);
      if (!response.data.success) throw new Error("Failed to load statistics");
      setStats(response.data.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load statistics",
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const maxReviewCount = useMemo(
    () => Math.max(1, ...(stats?.reviewTrend.map((item) => item.reviews) || [])),
    [stats],
  );
  const maxRevenue = useMemo(
    () =>
      Math.max(
        1,
        ...(stats?.revenueTrend.map((item) => item.revenuePaise) || []),
      ),
    [stats],
  );

  return (
    <div className="admin-page admin-page--wide">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Revenue &amp; Platform Overview</h1>
          <p className="admin-page-subtitle">
            Verified Razorpay revenue and customer review activity
          </p>
        </div>
        {stats?.appliedFilters.timezone && (
          <span className="admin-report-timezone">
            Reporting timezone: {stats.appliedFilters.timezone}
          </span>
        )}
      </div>

      <div className="admin-analytics-filters">
        <label>
          <span>Date range</span>
          <select
            value={filters.range}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                range: event.target.value as AdminStatsRange,
              }))
            }
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Business</span>
          <select
            value={filters.businessId || ""}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                businessId: event.target.value || undefined,
              }))
            }
          >
            <option value="">All businesses</option>
            {stats?.filterOptions.businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name} ({business.businessCode})
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Current plan</span>
          <select
            value={filters.plan || ""}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                plan: event.target.value || undefined,
              }))
            }
          >
            <option value="">All plans</option>
            {stats?.filterOptions.plans.map((plan) => (
              <option key={plan} value={plan}>
                {plan.charAt(0).toUpperCase() + plan.slice(1)}
              </option>
            ))}
          </select>
        </label>

        {filters.range === "custom" && (
          <>
            <label>
              <span>From</span>
              <input
                type="date"
                value={filters.from || ""}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    from: event.target.value || undefined,
                  }))
                }
              />
            </label>
            <label>
              <span>To</span>
              <input
                type="date"
                value={filters.to || ""}
                min={filters.from}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    to: event.target.value || undefined,
                  }))
                }
              />
            </label>
          </>
        )}

        <button
          type="button"
          className="admin-filter-btn"
          onClick={() => setFilters({ range: "30d" })}
        >
          Reset
        </button>
      </div>

      {error && (
        <div className="db-error">
          <span>{error}</span>
          <button className="db-error-retry" onClick={fetchStats}>
            Retry
          </button>
        </div>
      )}

      <div className="admin-stats-grid admin-stats-grid--analytics">
        {loading
          ? Array.from({ length: METRICS.length }).map((_, index) => (
              <div key={index} className="admin-skeleton admin-skeleton-card" />
            ))
          : METRICS.map((metric) => (
              <div
                key={metric.key}
                className={`stat-card stat-card--${metric.color}`}
              >
                <div className="stat-card-icon admin-metric-symbol">
                  {metric.icon}
                </div>
                <div className="stat-card-body">
                  <span className="stat-card-label">{metric.label}</span>
                  <span className="stat-card-value">
                    {formatMetric(stats, metric.key, metric.kind)}
                  </span>
                </div>
              </div>
            ))}
      </div>

      {!loading && stats && (
        <>
          <div className="admin-analytics-grid">
            <section className="admin-table-card admin-trend-card">
              <div className="admin-card-heading">
                <div>
                  <h2>Review activity</h2>
                  <p>Submitted reviews and average customer rating</p>
                </div>
              </div>
              {stats.reviewTrend.length === 0 ? (
                <div className="admin-mini-empty">No reviews in this period.</div>
              ) : (
                <div className="admin-trend-list">
                  {stats.reviewTrend.slice(-14).map((item) => (
                    <div className="admin-trend-row" key={item.date}>
                      <span>{item.date.slice(5)}</span>
                      <div className="admin-trend-track">
                        <div
                          className="admin-trend-fill admin-trend-fill--reviews"
                          style={{
                            width: `${Math.max(
                              4,
                              (item.reviews / maxReviewCount) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                      <strong>{item.reviews}</strong>
                      <small>{item.averageRating.toFixed(1)} ★</small>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="admin-table-card admin-trend-card">
              <div className="admin-card-heading">
                <div>
                  <h2>Revenue activity</h2>
                  <p>Captured Razorpay payments only</p>
                </div>
              </div>
              {stats.revenueTrend.length === 0 ? (
                <div className="admin-mini-empty">No captured payments in this period.</div>
              ) : (
                <div className="admin-trend-list">
                  {stats.revenueTrend.slice(-14).map((item) => (
                    <div className="admin-trend-row" key={item.date}>
                      <span>{item.date.slice(5)}</span>
                      <div className="admin-trend-track">
                        <div
                          className="admin-trend-fill admin-trend-fill--revenue"
                          style={{
                            width: `${Math.max(
                              4,
                              (item.revenuePaise / maxRevenue) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                      <strong>{formatCurrency(item.revenuePaise)}</strong>
                      <small>{item.payments} paid</small>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="admin-table-card">
            <div className="admin-card-heading">
              <div>
                <h2>Recent verified payments</h2>
                <p>Deduplicated by Razorpay payment ID</p>
              </div>
            </div>
            {stats.recentPayments.length === 0 ? (
              <div className="admin-mini-empty">No payments match these filters.</div>
            ) : (
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Business</th>
                      <th>Plan</th>
                      <th>Payment ID</th>
                      <th style={{ textAlign: "right" }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentPayments.map((payment) => (
                      <tr key={payment.paymentId}>
                        <td>{formatDate(payment.revenueDate)}</td>
                        <td>
                          <strong>{payment.businessName || "Unknown"}</strong>
                          <div className="admin-table-cell-secondary">
                            {payment.businessCode}
                          </div>
                        </td>
                        <td style={{ textTransform: "capitalize" }}>
                          {payment.plan}
                        </td>
                        <td>
                          <code>{payment.paymentId}</code>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          {formatCurrency(payment.amountPaidPaise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
