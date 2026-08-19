import { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useDashboardOverview } from '../hooks/queries/useDashboardOverview';
import type { Period } from '../services/dashboardService';


import { DateFilterControl } from '../components/dashboard/DateFilterControl';

// ---- Types ----------------------------------------------------------------


// ---- Sub-components -------------------------------------------------------

import { StatCard, RatingBar, PremiumTrendChart, RadialConversionRate } from '../components/dashboard/DashboardWidgets';

// ---- Main page ------------------------------------------------------------

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
  { key: 'custom', label: 'Custom' },
];

export default function DashboardPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [period, setPeriod] = useState<Period>('week');
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [appliedStart, setAppliedStart] = useState<string>(todayStr);
  const [appliedEnd, setAppliedEnd] = useState<string>(todayStr);

  const activeStart = period === 'custom' ? appliedStart : undefined;
  const activeEnd = period === 'custom' ? appliedEnd : undefined;

  const { data, isLoading: loading, error: queryError, refetch } = useDashboardOverview(period, activeStart, activeEnd);
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Could not connect to server. Please try again.') : null;

  const dist = data?.ratingDistribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const maxDist = Math.max(...Object.values(dist), 1);
  const totalFeedback = Object.values(dist).reduce((a, b) => a + b, 0);

  const handleApplyCustom = (start: string, end: string) => {
    setAppliedStart(start);
    setAppliedEnd(end);
  };

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
        <DateFilterControl
          periods={PERIODS}
          activePeriod={period}
          onPeriodChange={(p) => setPeriod(p as Period)}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onApplyCustom={handleApplyCustom}
        />
      </div>

      {/* ---- Error state ---- */}
      {error && (
        <div className="db-error" role="alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
          <button className="db-error-retry" onClick={() => refetch()}>Retry</button>
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
