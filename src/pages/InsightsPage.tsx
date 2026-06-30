import { useState, useEffect, useCallback } from 'react';
import api, { type ApiResponse } from '../lib/api';

type Period = 'week' | 'month' | 'year';

interface TagData {
  tag: string;
  currentCount: number;
  previousPeriodCount: number;
  delta: number;
  sentiment: 'positive' | 'negative';
}

interface AtRiskCustomer {
  feedbackId: string;
  rating: number;
  tags: string[];
  note: string;
  createdAt: string;
  daysSince: number;
}

interface InsightsData {
  period: string;
  tagList: TagData[];
}

interface AtRiskData {
  atRiskList: AtRiskCustomer[];
  count: number;
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

export default function InsightsPage() {
  const [period, setPeriod] = useState<Period>('week');
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null);
  const [atRiskData, setAtRiskData] = useState<AtRiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (p: Period) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch insights
      const insightsRes = await api.get<ApiResponse<InsightsData>>(`/dashboard/insights?period=${p}`);
      if (insightsRes.data.success && insightsRes.data.data) {
        setInsightsData(insightsRes.data.data);
      }

      // Fetch at-risk customers
      const atRiskRes = await api.get<ApiResponse<AtRiskData>>('/dashboard/at-risk');
      if (atRiskRes.data.success && atRiskRes.data.data) {
        setAtRiskData(atRiskRes.data.data);
      }
    } catch {
      setError('Could not connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  const renderDeltaArrow = (delta: number, sentiment: 'positive' | 'negative') => {
    if (delta === 0) return null;
    
    // For negative tags: increase is bad (red up), decrease is good (green down)
    // For positive tags: increase is good (green up), decrease is bad (red down)
    const isIncrease = delta > 0;
    const isBad = (sentiment === 'negative' && isIncrease) || (sentiment === 'positive' && !isIncrease);
    
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: isBad ? '#ef4444' : '#3F7D45',
      }}>
        {isIncrease ? '↑' : '↓'} {Math.abs(delta)}
      </div>
    );
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
          <button className="db-error-retry" onClick={() => fetchData(period)}>Retry</button>
        </div>
      )}

      {/* ---- Loading state ---- */}
      {loading && (
        <div className="db-loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}

      {/* ---- Content ---- */}
      {!loading && insightsData && (
        <>
          {/* ---- Tag Analysis ---- */}
          <div className="db-card">
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem 1.25rem',
                      borderRadius: '8px',
                      background: '#F2F0EA',
                      border: '1px solid #E3E1D9',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1A1A1A' }}>
                          {tagData.tag}
                        </span>
                        <span style={{
                          padding: '0.125rem 0.5rem',
                          borderRadius: '99px',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          background: tagData.sentiment === 'negative' ? 'rgba(239,68,68,0.1)' : '#E9F2E7',
                          color: tagData.sentiment === 'negative' ? '#ef4444' : '#3F7D45',
                        }}>
                          {tagData.sentiment}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#6B6B63' }}>
                        {tagData.currentCount} mention{tagData.currentCount !== 1 ? 's' : ''} this {period}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {renderDeltaArrow(tagData.delta, tagData.sentiment)}
                      <div style={{
                        width: '120px',
                        height: '8px',
                        background: '#FFFFFF',
                        borderRadius: '99px',
                        overflow: 'hidden',
                      }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min((tagData.currentCount / (insightsData.tagList[0]?.currentCount || 1)) * 100, 100)}%`,
                            background: tagData.sentiment === 'negative' ? '#ef4444' : '#3F7D45',
                            borderRadius: '99px',
                            transition: 'width 600ms ease',
                          }}
                        />
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

          {/* ---- At-Risk Customers ---- */}
          <div className="db-card" style={{ marginTop: '1.5rem' }}>
            <h2 className="db-card-title">Customers Slipping Away</h2>
            <p style={{ fontSize: '0.875rem', color: '#6B6B63', marginBottom: '1.5rem' }}>
              Customers who left low ratings and haven't returned. Reach out to win them back.
            </p>

            {!atRiskData || atRiskData.count === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                background: '#E9F2E7',
                borderRadius: '8px',
                border: '1px solid rgba(63,125,69,0.2)',
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
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      padding: '1rem 1.25rem',
                      borderRadius: '8px',
                      border: '1px solid #E3E1D9',
                      background: '#FFFFFF',
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
                            <span
                              key={i}
                              style={{
                                padding: '0.25rem 0.625rem',
                                borderRadius: '99px',
                                fontSize: '0.75rem',
                                background: 'rgba(239,68,68,0.1)',
                                color: '#ef4444',
                                border: '1px solid rgba(239,68,68,0.2)',
                              }}
                            >
                              {tag}
                            </span>
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
