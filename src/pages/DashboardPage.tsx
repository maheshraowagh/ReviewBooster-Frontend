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
  reviewVelocity: {
    thisWeek: number;
    lastWeek: number;
    weeklyAvgLast30Days: number;
    trend: 'up' | 'down' | 'stable';
  };
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

function PremiumTrendChart({ data }: { data: TrendPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) {
    return (
      <div className="trend-empty">
        <p>No trend data for single-day view.</p>
      </div>
    );
  }

  const width = 600;
  const height = 220;
  const padT = 20;
  const padB = 30;
  const padL = 35;
  const padR = 15;

  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const getX = (idx: number) => padL + (idx * (chartW / Math.max(1, data.length - 1)));
  const getY = (val: number) => padT + chartH - ((val / 5) * chartH);

  const points = data.map((pt, i) => ({
    x: getX(i),
    y: getY(pt.avgRating || 0),
    rating: pt.avgRating,
    count: pt.count,
    label: pt.label
  }));

  let linePath = "";
  let areaPath = "";

  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
      const cpY2 = p1.y;
      linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    areaPath = `${linePath} L ${points[points.length - 1].x} ${padT + chartH} L ${points[0].x} ${padT + chartH} Z`;
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * width;
    
    let closestIdx = 0;
    let minDiff = Infinity;
    points.forEach((pt, idx) => {
      const diff = Math.abs(pt.x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    setHoveredIdx(closestIdx);
  };

  return (
    <div ref={containerRef} className="premium-chart-container" style={{ position: 'relative', height: '100%' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIdx(null)}
        style={{ overflow: 'visible', cursor: 'crosshair' }}
      >
        <defs>
          <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3f7d45" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#3f7d45" stopOpacity="0.00" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Gridlines */}
        {[0, 1, 2, 3, 4, 5].map((val) => {
          const y = getY(val);
          return (
            <g key={val} className="chart-gridline">
              <line
                x1={padL}
                y1={y}
                x2={width - padR}
                y2={y}
                stroke="#E3E1D9"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padL - 8}
                y={y + 3}
                textAnchor="end"
                fontSize="10"
                fontWeight="600"
                fill="#8A8A80"
              >
                {val}★
              </text>
            </g>
          );
        })}

        {/* Fill Area */}
        {areaPath && (
          <path d={areaPath} fill="url(#chartAreaGradient)" />
        )}

        {/* Line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="#3f7d45"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}

        {/* Labels */}
        {points.map((pt, i) => (
          <text
            key={i}
            x={pt.x}
            y={height - 5}
            textAnchor="middle"
            fontSize="10"
            fontWeight="600"
            fill="#8A8A80"
          >
            {pt.label}
          </text>
        ))}

        {/* Tracker */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <line
            x1={points[hoveredIdx].x}
            y1={padT}
            x2={points[hoveredIdx].x}
            y2={padT + chartH}
            stroke="#6b6b63"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        )}

        {/* Dots */}
        {points.map((pt, i) => {
          const isActive = hoveredIdx === i;
          return (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={isActive ? 6.5 : 4.5}
              fill={isActive ? "#3f7d45" : "#ffffff"}
              stroke="#3f7d45"
              strokeWidth={isActive ? 3 : 2.5}
              filter={isActive ? "url(#glow)" : undefined}
              style={{ transition: 'r 0.1s, stroke-width 0.1s' }}
            />
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredIdx !== null && points[hoveredIdx] && (
        <div
          className="chart-tooltip-box"
          style={{
            position: 'absolute',
            left: `${((points[hoveredIdx].x - padL) / chartW) * 100}%`,
            top: `${(points[hoveredIdx].y / height) * 100 - 15}%`,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            zIndex: 10,
            background: '#1A1A1A',
            color: '#ffffff',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '0.7rem',
            boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
            border: '1px solid #3F7D45',
            display: 'flex',
            flexDirection: 'column',
            gap: '1px',
          }}
        >
          <span style={{ fontWeight: 700, color: '#e9f2e7' }}>{points[hoveredIdx].label}</span>
          <span style={{ fontWeight: 600 }}>Avg Rating: {points[hoveredIdx].rating} ★</span>
          {points[hoveredIdx].count > 0 && (
            <span style={{ opacity: 0.8 }}>{points[hoveredIdx].count} reviews</span>
          )}
        </div>
      )}
    </div>
  );
}

function RadialConversionRate({ scans, clicks }: { scans: number; clicks: number }) {
  const rate = scans > 0 ? Math.round((clicks / scans) * 100) : 0;
  const size = 100;
  const strokeW = 9;
  const radius = (size - strokeW) / 2;
  const circ = 2 * Math.PI * radius;
  const strokeOffset = circ - (rate / 100) * circ;

  return (
    <div className="db-card conversion-radial-card" style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
      <div className="radial-svg-wrapper" style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f2f0ea" strokeWidth={strokeW} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#3F7D45"
            strokeWidth={strokeW}
            strokeDasharray={circ}
            strokeDashoffset={strokeOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1
        }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1A1A1A' }}>{rate}%</span>
          <span style={{ fontSize: '0.55rem', fontWeight: 600, color: '#8A8A80', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Redir.</span>
        </div>
      </div>
      <div className="conversion-info" style={{ flex: 1, minWidth: 0 }}>
        <h2 className="db-card-title" style={{ margin: '0 0 4px 0' }}>Redirection rate</h2>
        <p style={{ fontSize: '0.75rem', color: '#6B6B63', margin: '0 0 10px 0', lineHeight: 1.4 }}>
          QR scans converted to Google review page clicks.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B6B63' }}>
            <span>Success clicks:</span>
            <strong style={{ color: '#1A1A1A' }}>{clicks}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B6B63' }}>
            <span>Total QR scans:</span>
            <strong style={{ color: '#1A1A1A' }}>{scans}</strong>
          </div>
        </div>
      </div>
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

          {/* ---- Dashboard Layout Grid ---- */}
          <div className="db-layout-grid">
            {/* Left side: AI Insight, Rating Trend, Review Velocity */}
            <div className="db-layout-left">
              {/* AI Insight */}
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

              {/* Rating Trend Chart */}
              <div className="db-card db-card--trend">
                <h2 className="db-card-title">Rating Trend</h2>
                <PremiumTrendChart data={data.ratingTrend} />
              </div>

              {/* Review Velocity Card */}
              {data.reviewVelocity && (
                <div className={`db-card db-velocity-card db-velocity-card--${data.reviewVelocity.trend}`}>
                  <div className="velocity-card-header">
                    <div className="velocity-card-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="db-card-title" style={{ margin: 0 }}>Review Velocity & Momentum</h2>
                      <p className="db-card-subtitle" style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        Google review redirection velocity
                      </p>
                    </div>
                  </div>
                  <div className="velocity-card-body">
                    <div className="velocity-stats">
                      <div className="velocity-stat">
                        <span className="label">This Week</span>
                        <span className="val">{data.reviewVelocity.thisWeek}</span>
                      </div>
                      <div className="velocity-stat">
                        <span className="label">Last Week</span>
                        <span className="val">{data.reviewVelocity.lastWeek}</span>
                      </div>
                      <div className="velocity-stat">
                        <span className="label">30-Day Avg / Wk</span>
                        <span className="val">{data.reviewVelocity.weeklyAvgLast30Days}</span>
                      </div>
                    </div>
                    <div className={`velocity-status-banner velocity-status-banner--${data.reviewVelocity.trend}`}>
                      <span className="status-dot"></span>
                      <span className="status-text">
                        {data.reviewVelocity.trend === 'up' && 'Trending Up — Excellent momentum. Keep placing QR codes at key customer touchpoints.'}
                        {data.reviewVelocity.trend === 'down' && 'Momentum Slowing — Clicks are down. Try placing QR codes on table tents or receipt slips.'}
                        {data.reviewVelocity.trend === 'stable' && 'Steady Pace — Consistent reviews are coming in. Maintain current QR placement.'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right side: Rating Distribution, QR Quick Link / Mini QR Code */}
            <div className="db-layout-right">
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

              {/* Scan Conversion Radial Ring Card */}
              <RadialConversionRate scans={data.scans} clicks={data.googleClicks} />

              {/* Review QR Code Canvas Mini-card */}
              {data.businessCode && (
                <div className="db-card db-qr-mini-card">
                  <h2 className="db-card-title">Scan QR Code</h2>
                  <div className="qr-mini-inner">
                    <div className="qr-mini-canvas-container">
                      <QRCodeCanvas
                        value={`${window.location.origin}/r/${data.businessCode}`}
                        size={110}
                        level="H"
                        bgColor="#ffffff"
                        fgColor="#1A1A1A"
                      />
                    </div>
                    <div className="qr-mini-info">
                      <p className="qr-mini-url-text">r/{data.businessCode}</p>
                      <p className="qr-mini-desc">
                        Customers scan this code to leave feedback and write Google reviews.
                      </p>
                      <div className="qr-mini-actions">
                        <a href="/qr-locations" className="qr-mini-btn btn-view">
                          View & Print QR
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
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
