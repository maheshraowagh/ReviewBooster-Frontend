import { useState } from 'react';
import { useInsightsData, useSentimentData, useAtRiskData } from '../hooks/queries/useInsights';
import type { Period, TopicItem } from '../services/insightsService';



const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

const BAND_CONFIG: { key: string; label: string; stars: string; color: string }[] = [
  { key: 'excellent', label: 'Excellent', stars: '5★', color: '#3F7D45' },
  { key: 'good', label: 'Good', stars: '4★', color: '#22c55e' },
  { key: 'average', label: 'Average', stars: '3★', color: '#eab308' },
  { key: 'poor', label: 'Poor', stars: '1-2★', color: '#ef4444' },
];

export default function InsightsPage() {
  const [period, setPeriod] = useState<Period>('week');

  const {
    data: insightsData,
    isLoading: insightsLoading,
    error: insightsError,
    refetch: refetchInsights,
  } = useInsightsData(period);

  const {
    data: sentimentData,
    isLoading: sentimentLoading,
    error: sentimentError,
    refetch: refetchSentiment,
  } = useSentimentData(period);

  const {
    data: atRiskData,
    isLoading: atRiskLoading,
    error: atRiskError,
    refetch: refetchAtRisk,
  } = useAtRiskData();

  const loading = insightsLoading || sentimentLoading || atRiskLoading;
  const error = insightsError?.message || sentimentError?.message || atRiskError?.message || null;

  const handleRetry = () => {
    refetchInsights();
    refetchSentiment();
    refetchAtRisk();
  };

  // ---- Sentiment helpers ----
  const getPctBarColor = (pct: number) => {
    if (pct <= 40) return '#ef4444';
    if (pct <= 70) return '#eab308';
    return '#3F7D45';
  };

  const renderTopicDelta = (item: TopicItem) => {
    const delta = item.count - item.prevCount;
    if (delta === 0) return null;
    const isIncrease = delta > 0;
    const isBad = (item.sentiment === 'negative' && isIncrease) || (item.sentiment === 'positive' && !isIncrease);
    return (
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isBad ? '#ef4444' : '#3F7D45' }}>
        {isIncrease ? '↑' : '↓'} {Math.abs(delta)}
      </span>
    );
  };

  // Existing delta arrow for tag trends section
  const renderDeltaArrow = (delta: number, sentiment: 'positive' | 'negative') => {
    if (delta === 0) return null;
    const isIncrease = delta > 0;
    const isBad = (sentiment === 'negative' && isIncrease) || (sentiment === 'positive' && !isIncrease);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: isBad ? '#ef4444' : '#3F7D45' }}>
        {isIncrease ? '↑' : '↓'} {Math.abs(delta)}
      </div>
    );
  };

  // Compute positive trend comparison text
  const getTrendSummary = () => {
    if (!sentimentData || sentimentData.overallTrend.length < 2) return null;
    const trend = sentimentData.overallTrend;
    const half = Math.floor(trend.length / 2);
    const recentPositive = trend.slice(half).reduce((s, t) => s + t.positiveCount, 0);
    const olderPositive = trend.slice(0, half).reduce((s, t) => s + t.positiveCount, 0);
    if (olderPositive === 0 && recentPositive === 0) return null;
    if (olderPositive === 0) return 'Positive feedback is trending well.';
    const pctChange = Math.round(((recentPositive - olderPositive) / olderPositive) * 100);
    if (pctChange > 0) return `Your positive feedback is up ${pctChange}% compared to earlier this ${period}.`;
    if (pctChange < 0) return `Positive feedback is down ${Math.abs(pctChange)}% compared to earlier this ${period}.`;
    return 'Positive feedback is holding steady.';
  };

  return (
    <div className="db-page animate-fade-in">
      {/* ---- Top bar ---- */}
      <div className="db-topbar">
        <div>
          <h1 className="db-title">Insights</h1>
          <p className="db-subtitle">Deep dive into customer feedback trends</p>
        </div>
        <div className="db-period-tabs" role="tablist" aria-label="Time period selector">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
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
          <button className="db-error-retry" onClick={handleRetry}>Retry</button>
        </div>
      )}

      {/* ---- Loading state ---- */}
      {loading && (
        <div className="db-loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}

      {/* ---- Content ---- */}
      {!loading && (
        <>
          {/* ================================================================
              Section 1 — Sentiment Trend
              ================================================================ */}
          {sentimentData && sentimentData.totalFeedback >= 5 ? (
            <div className="db-card" style={{ marginBottom: '1.5rem' }}>
              <h2 className="db-card-title">How your sentiment is trending</h2>
              {getTrendSummary() && (
                <p style={{ fontSize: '0.875rem', color: '#3F7D45', marginBottom: '1rem', fontWeight: 500 }}>
                  {getTrendSummary()}
                </p>
              )}
              <div className="sentiment-trend-chart">
                {sentimentData.overallTrend.map((pt, i) => {
                  const total = pt.positiveCount + pt.negativeCount;
                  const maxBar = Math.max(...sentimentData.overallTrend.map(t => t.positiveCount + t.negativeCount), 1);
                  const heightPct = total > 0 ? (total / maxBar) * 100 : 0;
                  const posPct = total > 0 ? Math.round((pt.positiveCount / total) * 100) : 0;
                  const negPct = total > 0 ? 100 - posPct : 0;
                  return (
                    <div key={i} className="sentiment-trend-col">
                      <div className="sentiment-trend-bar-wrapper">
                        <div className="sentiment-trend-bar" style={{ height: `${heightPct}%` }}>
                          <div className="sentiment-trend-pos" style={{ height: `${posPct}%` }} title={`${pt.positiveCount} positive (${posPct}%)`}>
                            {total > 0 && posPct >= 15 && (
                              <span className="sentiment-bar-pct">{posPct}%</span>
                            )}
                          </div>
                          <div className="sentiment-trend-neg" style={{ height: `${negPct}%` }} title={`${pt.negativeCount} negative (${negPct}%)`}>
                            {total > 0 && negPct >= 15 && (
                              <span className="sentiment-bar-pct">{negPct}%</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {total > 0 && (posPct < 15 || negPct < 15) && (
                        <span className="sentiment-trend-tooltip">{posPct}% / {negPct}%</span>
                      )}
                      <span className="sentiment-trend-label">{pt.label}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.75rem', color: '#6B6B63' }}>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#3F7D45', marginRight: 4, verticalAlign: 'middle' }} />Positive</span>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#ef4444', marginRight: 4, verticalAlign: 'middle' }} />Negative</span>
              </div>
            </div>
          ) : sentimentData && sentimentData.totalFeedback < 5 ? (
            <div className="db-card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: '#A3A39A', fontSize: '0.9375rem' }}>
                Not enough data for sentiment analysis yet ({sentimentData.totalFeedback} of 5 required reviews).
              </p>
            </div>
          ) : null}

          {/* ================================================================
              Section 2 — Per-Topic Sentiment Bars
              ================================================================ */}
          {sentimentData && sentimentData.topicBreakdown.length > 0 && (
            <div className="db-card" style={{ marginBottom: '1.5rem' }}>
              <h2 className="db-card-title">What customers are saying about specific things</h2>
              <p style={{ fontSize: '0.875rem', color: '#6B6B63', marginBottom: '1.5rem' }}>
                Percentage of mentions from 4-5★ reviews. Higher is better.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {sentimentData.topicBreakdown.map(item => (
                  <div key={item.tag} style={{
                    display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.25rem',
                    borderRadius: '8px', background: '#F2F0EA', border: '1px solid #E3E1D9',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1A1A1A' }}>{item.tag}</span>
                        <span style={{
                          padding: '0.125rem 0.5rem', borderRadius: '99px', fontSize: '0.6875rem', fontWeight: 600,
                          background: item.sentiment === 'negative' ? 'rgba(239,68,68,0.1)' : '#E9F2E7',
                          color: item.sentiment === 'negative' ? '#ef4444' : '#3F7D45',
                        }}>{item.sentiment}</span>
                        {renderTopicDelta(item)}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#6B6B63' }}>
                        {item.count} mention{item.count !== 1 ? 's' : ''} · {item.pctPositive}% positive
                      </span>
                    </div>
                    <div style={{ width: '120px', height: '8px', background: '#FFFFFF', borderRadius: '99px', overflow: 'hidden', flexShrink: 0 }}>
                      <div style={{
                        height: '100%', width: `${item.pctPositive}%`,
                        background: getPctBarColor(item.pctPositive),
                        borderRadius: '99px', transition: 'width 600ms ease',
                      }} />
                    </div>
                    <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1A1A1A', minWidth: '32px', textAlign: 'right' }}>{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================
              Section 3 — Rating Band Breakdown
              ================================================================ */}
          {sentimentData && sentimentData.totalFeedback > 0 && (
            <div className="db-card" style={{ marginBottom: '1.5rem' }}>
              <h2 className="db-card-title">Rating distribution this {period}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: '1rem' }}>
                {BAND_CONFIG.map(({ key, label, stars, color }) => {
                  const band = sentimentData.byRatingBand[key];
                  if (!band) return null;
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1A1A1A', minWidth: '100px' }}>
                        {label} ({stars})
                      </span>
                      <div style={{ flex: 1, height: '10px', background: '#E3E1D9', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${band.pct}%`, background: color,
                          borderRadius: '99px', transition: 'width 600ms ease',
                        }} />
                      </div>
                      <span style={{ fontSize: '0.875rem', color: '#6B6B63', minWidth: '70px', textAlign: 'right' }}>
                        {band.count} ({band.pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
              {sentimentData.byRatingBand.poor && sentimentData.totalFeedback > 0 &&
                sentimentData.byRatingBand.poor.pct > 20 && (
                <div style={{
                  marginTop: '1rem', padding: '0.875rem 1.25rem', borderRadius: '8px',
                  background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)',
                  fontSize: '0.875rem', color: '#ef4444', fontWeight: 500,
                }}>
                  More than 1 in 5 customers had a poor experience this period — check the topic breakdown above for specific issues.
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              Section 4 — Tag Trends (existing)
              ================================================================ */}
          {insightsData && (
            <div className="db-card" style={{ marginBottom: '1.5rem' }}>
              <h2 className="db-card-title">Tag Trends</h2>
              <p style={{ fontSize: '0.875rem', color: '#6B6B63', marginBottom: '1.5rem' }}>
                See which topics customers are mentioning most, and how they're trending compared to the previous {period}.
              </p>

              {insightsData.tagList.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#A3A39A', padding: '2rem' }}>
                  No feedback data for this period yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {insightsData.tagList.map((tagData) => (
                    <div
                      key={tagData.tag}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        padding: '1rem 1.25rem', borderRadius: '8px',
                        background: '#F2F0EA', border: '1px solid #E3E1D9',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1A1A1A' }}>{tagData.tag}</span>
                          <span style={{
                            padding: '0.125rem 0.5rem', borderRadius: '99px', fontSize: '0.6875rem', fontWeight: 600,
                            background: tagData.sentiment === 'negative' ? 'rgba(239,68,68,0.1)' : '#E9F2E7',
                            color: tagData.sentiment === 'negative' ? '#ef4444' : '#3F7D45',
                          }}>{tagData.sentiment}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#6B6B63' }}>
                          {tagData.currentCount} mention{tagData.currentCount !== 1 ? 's' : ''} this {period}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {renderDeltaArrow(tagData.delta, tagData.sentiment)}
                        <div style={{ width: '120px', height: '8px', background: '#FFFFFF', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min((tagData.currentCount / (insightsData.tagList[0]?.currentCount || 1)) * 100, 100)}%`,
                            background: tagData.sentiment === 'negative' ? '#ef4444' : '#3F7D45',
                            borderRadius: '99px', transition: 'width 600ms ease',
                          }} />
                        </div>
                        <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1A1A1A', minWidth: '32px', textAlign: 'right' }}>
                          {tagData.currentCount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              Section 5 — At-Risk Customers (existing)
              ================================================================ */}
          <div className="db-card" style={{ marginTop: '1.5rem' }}>
            <h2 className="db-card-title">Customers Slipping Away</h2>
            <p style={{ fontSize: '0.875rem', color: '#6B6B63', marginBottom: '1.5rem' }}>
              Customers who left low ratings and haven't returned. Reach out to win them back.
            </p>

            {!atRiskData || atRiskData.count === 0 ? (
              <div style={{
                textAlign: 'center', padding: '2rem', background: '#E9F2E7',
                borderRadius: '8px', border: '1px solid rgba(63,125,69,0.2)',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✨</div>
                <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#3F7D45', margin: 0 }}>
                  Great news! No at-risk customers right now.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {atRiskData.atRiskList.map((customer) => (
                  <div
                    key={customer.feedbackId}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '1rem',
                      padding: '1rem 1.25rem', borderRadius: '8px',
                      border: '1px solid #E3E1D9', background: '#FFFFFF',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.9375rem', color: '#f59e0b' }}>
                          {'★'.repeat(customer.rating)}{'☆'.repeat(5 - customer.rating)}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#A3A39A' }}>
                          {customer.daysSince} day{customer.daysSince !== 1 ? 's' : ''} ago
                        </span>
                      </div>
                      {customer.tags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.5rem' }}>
                          {customer.tags.map((tag, i) => (
                            <span key={i} style={{
                              padding: '0.25rem 0.625rem', borderRadius: '99px', fontSize: '0.75rem',
                              background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)',
                            }}>{tag}</span>
                          ))}
                        </div>
                      )}
                      {customer.note && (
                        <p style={{ fontSize: '0.875rem', color: '#6B6B63', margin: 0, lineHeight: 1.5 }}>
                          {customer.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
