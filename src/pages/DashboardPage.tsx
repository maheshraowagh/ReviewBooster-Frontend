import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import api, { type ApiResponse } from '../lib/api';


// ---- Types ----------------------------------------------------------------

type Period = 'today' | 'yesterday' | 'week' | 'month' | 'year';

interface TrendPoint {
  label: string;
  avgRating: number;
  count: number;
}

interface OverviewData {
  period: string;
  scans: number;
  avgRating: number;
  googleClicks: number;
  atRiskCount: number;
  insight: string | null;
  ratingTrend: TrendPoint[];
  ratingDistribution: Record<string, number>;
  businessName: string;
  businessCode: string;
}

// ---- Sub-components -------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: 'brand' | 'cyan' | 'amber' | 'rose';
}) {
  return (
    <div className={`stat-card stat-card--${accent || 'brand'}`}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-body">
        <p className="stat-card-label">{label}</p>
        <p className="stat-card-value">{value}</p>
        {sub && <p className="stat-card-sub">{sub}</p>}
      </div>
    </div>
  );
}

function RatingBar({ star, count, max }: { star: number; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#6366f1'];
  return (
    <div className="rating-bar-row">
      <span className="rating-bar-label">{star}★</span>
      <div className="rating-bar-track">
        <div
          className="rating-bar-fill"
          style={{ width: `${pct}%`, background: colors[star - 1] }}
        />
      </div>
      <span className="rating-bar-count">{count}</span>
    </div>
  );
}

function TrendChart({ data, period }: { data: TrendPoint[]; period: Period }) {
  if (!data || data.length === 0) {
    return (
      <div className="trend-empty">
        <p>No trend data for single-day view.</p>
      </div>
    );
  }
  const max = 5;
  return (
    <div className="trend-chart">
      {data.map((pt, i) => {
        const heightPct = pt.avgRating > 0 ? (pt.avgRating / max) * 100 : 0;
        return (
          <div key={i} className="trend-col">
            <div className="trend-bar-wrapper">
              <div
                className="trend-bar"
                style={{ height: `${heightPct}%` }}
                title={`${pt.avgRating > 0 ? pt.avgRating : 'No data'}`}
              >
                {pt.avgRating > 0 && (
                  <span className="trend-bar-tooltip">{pt.avgRating}</span>
                )}
              </div>
            </div>
            <span className="trend-col-label">{pt.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---- Main page ------------------------------------------------------------

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('week');
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  const downloadQR = () => {
    const canvas = qrRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `qr-${data?.businessName || 'reviewboost'}.png`;
    link.click();
  };

  const fetchOverview = useCallback(async (p: Period) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<ApiResponse<OverviewData>>(`/dashboard/overview?period=${p}`);
      if (res.data.success && res.data.data) {
        setData(res.data.data);
      } else {
        setError(res.data.error?.message || 'Failed to load dashboard data');
      }
    } catch {
      setError('Could not connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview(period);
  }, [period, fetchOverview]);

  const dist = data?.ratingDistribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const maxDist = Math.max(...Object.values(dist), 1);
  const totalFeedback = Object.values(dist).reduce((a, b) => a + b, 0);

  return (
    <div className="db-page animate-fade-in">
      {/* ---- Top bar ---- */}
      <div className="db-topbar">
        <div>
          <h1 className="db-title">Dashboard</h1>
          {data?.businessName && (
            <p className="db-subtitle">{data.businessName}</p>
          )}
        </div>
        <div className="db-period-tabs" role="tablist" aria-label="Time period selector">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              id={`period-tab-${key}`}
              role="tab"
              aria-selected={period === key}
              className={`db-period-btn${period === key ? ' active' : ''}`}
              onClick={() => setPeriod(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Error state ---- */}
      {error && (
        <div className="db-error" role="alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
          <button className="db-error-retry" onClick={() => fetchOverview(period)}>Retry</button>
        </div>
      )}

      {/* ---- Loading state ---- */}
      {loading && (
        <div className="db-loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}

      {/* ---- Content ---- */}
      {!loading && data && (
        <>
          {/* ---- Stat cards ---- */}
          <div className="db-stats-grid">
            <StatCard
              label="Total Scans"
              value={data.scans.toLocaleString()}
              sub={`in ${data.period}`}
              accent="brand"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                  <rect x="7" y="7" width="10" height="10" rx="1" />
                </svg>
              }
            />
            <StatCard
              label="Avg Rating"
              value={data.avgRating > 0 ? `${data.avgRating} ★` : '—'}
              sub={`${totalFeedback} responses`}
              accent="cyan"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              }
            />
            <StatCard
              label="Google Clicks"
              value={data.googleClicks.toLocaleString()}
              sub="redirected to review"
              accent="amber"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              }
            />
            <StatCard
              label="At-Risk Feedback"
              value={data.atRiskCount}
              sub="rating ≤ 2 stars"
              accent="rose"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              }
            />
          </div>

          {/* ---- AI Insight ---- */}
          {data.insight && (
            <div className="db-insight">
              <div className="db-insight-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4m0 4h.01" />
                </svg>
              </div>
              <div>
                <p className="db-insight-label">AI Insight</p>
                <p className="db-insight-text">{data.insight}</p>
              </div>
            </div>
          )}

          {/* ---- Charts row ---- */}
          <div className="db-charts-row">
            {/* Rating Trend */}
            <div className="db-card db-card--trend">
              <h2 className="db-card-title">Rating Trend</h2>
              <TrendChart data={data.ratingTrend} period={period} />
            </div>

            {/* Rating Distribution */}
            <div className="db-card db-card--dist">
              <h2 className="db-card-title">Rating Distribution</h2>
              <div className="rating-dist">
                {[5, 4, 3, 2, 1].map((star) => (
                  <RatingBar
                    key={star}
                    star={star}
                    count={dist[star] ?? 0}
                    max={maxDist}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ---- QR Code Card ---- */}
          {data.businessCode && (
            <div className="db-card db-qr-card">
              <h2 className="db-card-title">Your Review QR Code</h2>
              <div className="db-qr-inner">
                <div className="db-qr-wrap">
                  <div className="db-qr-canvas-bg">
                    <QRCodeCanvas
                      ref={qrRef}
                      value={`${window.location.origin}/r/${data.businessCode}`}
                      size={200}
                      level="H"
                      bgColor="#ffffff"
                      fgColor="#1a1a2e"
                    />
                  </div>
                </div>
                <div className="db-qr-info">
                  <p className="db-qr-label">Scan link</p>
                  <p className="db-qr-url">{window.location.origin}/r/{data.businessCode}</p>
                  <p className="db-qr-hint">
                    Print this QR code and place it where customers can easily scan it to leave a review.
                  </p>
                  <button className="db-qr-download" onClick={downloadQR}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download PNG
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ---- Empty (no data, no error, no loading) ---- */}
      {!loading && !data && !error && (
        <div className="db-empty">
          <p>No dashboard data available yet.</p>
        </div>
      )}
    </div>
  );
}
