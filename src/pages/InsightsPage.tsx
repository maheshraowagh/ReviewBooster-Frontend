import { useMemo, useState } from 'react';
import AtRiskSection from '../components/AtRiskSection';
import { useAtRiskData, useSentimentData } from '../hooks/queries/useInsights';
import type {
  Period,
  RatingBand,
  SentimentData,
  TopicItem,
} from '../services/insightsService';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: '7 days' },
  { key: 'month', label: '30 days' },
  { key: 'year', label: '12 months' },
];

const TOPICS_PER_PAGE = 6;

const BAND_CONFIG: {
  key: string;
  label: string;
  stars: string;
  color: string;
}[] = [
  { key: 'excellent', label: 'Excellent', stars: '5 star', color: '#3f7d45' },
  { key: 'good', label: 'Good', stars: '4 star', color: '#68a05d' },
  { key: 'average', label: 'Average', stars: '3 star', color: '#e5a93d' },
  { key: 'poor', label: 'Poor', stars: '1–2 star', color: '#dc5a5a' },
];

type MetricIcon = 'responses' | 'rating' | 'positive' | 'risk';

function MetricIcon({ name }: { name: MetricIcon }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'rating') {
    return (
      <svg {...common}>
        <path d="m12 3 2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 17.03l-5.5 2.89 1.05-6.12L3.1 9.47l6.15-.9L12 3Z" />
      </svg>
    );
  }

  if (name === 'positive') {
    return (
      <svg {...common}>
        <path d="M4 15.5 9 10l4 4 7-8" />
        <path d="M15 6h5v5" />
      </svg>
    );
  }

  if (name === 'risk') {
    return (
      <svg {...common}>
        <path d="M10.3 4.2 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4m0 3h.01" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M6 3h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4V5a2 2 0 0 1 2-2Z" />
      <path d="M8 8h8M8 12h5" />
    </svg>
  );
}

function getAverageRating(data?: SentimentData) {
  if (!data) return 0;
  const totals = data.overallTrend.reduce(
    (acc, point) => ({
      weighted: acc.weighted + point.avgRating * point.feedbackCount,
      count: acc.count + point.feedbackCount,
    }),
    { weighted: 0, count: 0 },
  );

  return totals.count > 0 ? totals.weighted / totals.count : 0;
}

function getBand(data: SentimentData | undefined, key: string): RatingBand {
  return data?.byRatingBand[key] ?? { min: 0, max: 0, count: 0, pct: 0 };
}

function getTrendSummary(data: SentimentData | undefined) {
  if (!data || data.overallTrend.length < 2) {
    return { label: 'Collecting trend data', delta: 0, tone: 'neutral' };
  }

  const half = Math.max(1, Math.floor(data.overallTrend.length / 2));
  const older = data.overallTrend.slice(0, half);
  const recent = data.overallTrend.slice(half);
  const rate = (points: typeof older) => {
    const totals = points.reduce(
      (acc, point) => ({
        positive: acc.positive + point.positiveCount,
        all: acc.all + point.positiveCount + point.negativeCount,
      }),
      { positive: 0, all: 0 },
    );
    return totals.all > 0 ? (totals.positive / totals.all) * 100 : 0;
  };

  const delta = Math.round(rate(recent) - rate(older));
  if (delta > 0) {
    return { label: `Positive sentiment up ${delta} pts`, delta, tone: 'good' };
  }
  if (delta < 0) {
    return {
      label: `Positive sentiment down ${Math.abs(delta)} pts`,
      delta,
      tone: 'bad',
    };
  }
  return { label: 'Sentiment is holding steady', delta, tone: 'neutral' };
}

function topicDelta(item: TopicItem) {
  const delta = item.count - item.prevCount;
  const improving =
    (item.sentiment === 'positive' && delta >= 0) ||
    (item.sentiment === 'negative' && delta <= 0);

  return {
    delta,
    improving,
    label: delta === 0 ? 'No change' : `${delta > 0 ? '+' : ''}${delta}`,
  };
}

export default function InsightsPage() {
  const [period, setPeriod] = useState<Period>('week');
  const [topicPage, setTopicPage] = useState(0);

  const sentiment = useSentimentData(period);
  const atRisk = useAtRiskData();

  const sentimentData = sentiment.data;
  const atRiskData = atRisk.data;
  const isInitialLoading =
    (sentiment.isLoading && !sentimentData) || (atRisk.isLoading && !atRiskData);
  const error = sentiment.error?.message || atRisk.error?.message || null;

  const averageRating = getAverageRating(sentimentData);
  const positiveCount =
    getBand(sentimentData, 'excellent').count + getBand(sentimentData, 'good').count;
  const positiveRate = sentimentData?.totalFeedback
    ? Math.round((positiveCount / sentimentData.totalFeedback) * 100)
    : 0;
  const openAtRisk =
    atRiskData?.atRiskList.filter((item) => item.recoveryStatus === 'unhandled') ??
    [];
  const criticalCount = openAtRisk.filter((item) => item.rating === 1).length;
  const trendSummary = getTrendSummary(sentimentData);

  const topicPages = Math.max(
    1,
    Math.ceil((sentimentData?.topicBreakdown.length ?? 0) / TOPICS_PER_PAGE),
  );
  const safeTopicPage = Math.min(topicPage, topicPages - 1);
  const visibleTopics = useMemo(
    () =>
      sentimentData?.topicBreakdown.slice(
        safeTopicPage * TOPICS_PER_PAGE,
        (safeTopicPage + 1) * TOPICS_PER_PAGE,
      ) ?? [],
    [safeTopicPage, sentimentData],
  );

  const retry = () => {
    void sentiment.refetch();
    void atRisk.refetch();
  };

  const changePeriod = (nextPeriod: Period) => {
    setPeriod(nextPeriod);
    setTopicPage(0);
  };

  return (
    <div className="db-page insights-page animate-fade-in">
      <header className="insights-header">
        <div>
          <div className="insights-eyebrow">Customer intelligence</div>
          <h1 className="db-title">Insights</h1>
          <p className="db-subtitle">
            A focused view of sentiment, recurring issues, and customers needing
            attention.
          </p>
        </div>

        <div className="insights-controls">
          {(sentiment.isFetching || atRisk.isFetching) && !isInitialLoading && (
            <span className="insights-sync-status" role="status">
              <span className="insights-sync-dot" />
              Updating
            </span>
          )}
          <div
            className="db-period-tabs insights-period-tabs"
            role="tablist"
            aria-label="Insights period"
          >
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                role="tab"
                aria-selected={period === key}
                className={`db-period-btn${period === key ? ' active' : ''}`}
                onClick={() => changePeriod(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {error && (
        <div className="db-error insights-error" role="alert">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="18"
            height="18"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4m0 4h.01" />
          </svg>
          <span>{error}</span>
          <button className="db-error-retry" onClick={retry}>
            Retry
          </button>
        </div>
      )}

      {isInitialLoading ? (
        <div className="insights-loading" aria-label="Loading insights">
          <div className="insights-skeleton-row">
            {[0, 1, 2, 3].map((item) => (
              <div className="insights-skeleton insights-skeleton--metric" key={item} />
            ))}
          </div>
          <div className="insights-skeleton insights-skeleton--chart" />
        </div>
      ) : (
        <>
          <section className="insights-metrics" aria-label="Key metrics">
            <article className="insights-metric">
              <span className="insights-metric-icon insights-metric-icon--green">
                <MetricIcon name="responses" />
              </span>
              <div>
                <span className="insights-metric-label">Responses</span>
                <strong>{sentimentData?.totalFeedback.toLocaleString() ?? 0}</strong>
                <small>In the selected period</small>
              </div>
            </article>

            <article className="insights-metric">
              <span className="insights-metric-icon insights-metric-icon--amber">
                <MetricIcon name="rating" />
              </span>
              <div>
                <span className="insights-metric-label">Average rating</span>
                <strong>{averageRating > 0 ? averageRating.toFixed(1) : '—'}</strong>
                <small>{averageRating > 0 ? 'Out of 5 stars' : 'No ratings yet'}</small>
              </div>
            </article>

            <article className="insights-metric">
              <span className="insights-metric-icon insights-metric-icon--blue">
                <MetricIcon name="positive" />
              </span>
              <div>
                <span className="insights-metric-label">Positive sentiment</span>
                <strong>{positiveRate}%</strong>
                <small className={`insights-metric-trend insights-metric-trend--${trendSummary.tone}`}>
                  {trendSummary.label}
                </small>
              </div>
            </article>

            <article className="insights-metric">
              <span className="insights-metric-icon insights-metric-icon--rose">
                <MetricIcon name="risk" />
              </span>
              <div>
                <span className="insights-metric-label">Needs attention</span>
                <strong>{openAtRisk.length}</strong>
                <small>
                  {criticalCount > 0
                    ? `${criticalCount} critical ${criticalCount === 1 ? 'case' : 'cases'}`
                    : 'No critical cases'}
                </small>
              </div>
            </article>
          </section>

          <section className="insights-overview-grid">
            <article className="insights-card insights-card--trend">
              <div className="insights-card-header">
                <div>
                  <h2>Sentiment trend</h2>
                  <p>Positive and negative feedback volume over time</p>
                </div>
                <span className={`insights-trend-badge insights-trend-badge--${trendSummary.tone}`}>
                  {trendSummary.delta > 0 ? '↗' : trendSummary.delta < 0 ? '↘' : '→'}
                  {trendSummary.label}
                </span>
              </div>

              {!sentimentData || sentimentData.totalFeedback < 5 ? (
                <div className="insights-empty">
                  <span className="insights-empty-icon">
                    <MetricIcon name="positive" />
                  </span>
                  <strong>Trend needs a little more data</strong>
                  <p>
                    {sentimentData?.totalFeedback ?? 0} of 5 responses collected for
                    this view.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className="insights-chart"
                    role="img"
                    aria-label="Stacked bar chart of positive and negative sentiment"
                  >
                    <div className="insights-chart-grid" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </div>
                    {sentimentData.overallTrend.map((point, index) => {
                      const total = point.positiveCount + point.negativeCount;
                      const maxTotal = Math.max(
                        ...sentimentData.overallTrend.map(
                          (item) => item.positiveCount + item.negativeCount,
                        ),
                        1,
                      );
                      const totalHeight = total > 0 ? (total / maxTotal) * 100 : 2;
                      const positiveHeight =
                        total > 0 ? (point.positiveCount / total) * 100 : 0;
                      const labelStep =
                        sentimentData.overallTrend.length > 14
                          ? Math.ceil(sentimentData.overallTrend.length / 7)
                          : 1;
                      const showLabel =
                        index % labelStep === 0 ||
                        index === sentimentData.overallTrend.length - 1;

                      return (
                        <div
                          className="insights-chart-column"
                          key={`${point.date}-${index}`}
                          title={`${point.label}: ${point.positiveCount} positive, ${point.negativeCount} negative`}
                        >
                          <span className="insights-chart-value">
                            {total > 0 ? total : ''}
                          </span>
                          <div className="insights-chart-track">
                            <div
                              className="insights-chart-bar"
                              style={{ height: `${totalHeight}%` }}
                            >
                              <span
                                className="insights-chart-positive"
                                style={{ height: `${positiveHeight}%` }}
                              />
                              <span
                                className="insights-chart-negative"
                                style={{ height: `${100 - positiveHeight}%` }}
                              />
                            </div>
                          </div>
                          <span className="insights-chart-label">
                            {showLabel ? point.label : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="insights-legend">
                    <span>
                      <i className="insights-legend-dot insights-legend-dot--positive" />
                      Positive
                    </span>
                    <span>
                      <i className="insights-legend-dot insights-legend-dot--negative" />
                      Negative
                    </span>
                    <span className="insights-legend-note">
                      Hover a bar for exact values
                    </span>
                  </div>
                </>
              )}
            </article>

            <article className="insights-card insights-card--distribution">
              <div className="insights-card-header">
                <div>
                  <h2>Rating mix</h2>
                  <p>How responses are distributed</p>
                </div>
              </div>

              <div className="insights-rating-summary">
                <div
                  className="insights-rating-ring"
                  style={{
                    background: `conic-gradient(#3f7d45 ${positiveRate * 3.6}deg, #ebe9e2 0deg)`,
                  }}
                  aria-label={`${positiveRate}% positive ratings`}
                >
                  <div>
                    <strong>{positiveRate}%</strong>
                    <span>positive</span>
                  </div>
                </div>
                <div className="insights-rating-copy">
                  <strong>
                    {positiveRate >= 75
                      ? 'Strong customer experience'
                      : positiveRate >= 50
                        ? 'Mixed customer experience'
                        : 'Experience needs attention'}
                  </strong>
                  <p>Based on 4 and 5-star responses.</p>
                </div>
              </div>

              <div className="insights-rating-list">
                {BAND_CONFIG.map((bandConfig) => {
                  const band = getBand(sentimentData, bandConfig.key);
                  return (
                    <div className="insights-rating-row" key={bandConfig.key}>
                      <div>
                        <strong>{bandConfig.label}</strong>
                        <span>{bandConfig.stars}</span>
                      </div>
                      <div className="insights-progress">
                        <span
                          style={{
                            width: `${band.pct}%`,
                            backgroundColor: bandConfig.color,
                          }}
                        />
                      </div>
                      <b>{band.pct}%</b>
                      <small>{band.count}</small>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>

          <section className="insights-detail-grid">
            <article className="insights-card insights-card--topics">
              <div className="insights-card-header">
                <div>
                  <h2>What customers mention</h2>
                  <p>Topic health and movement versus the previous period</p>
                </div>
                <span className="insights-card-count">
                  {sentimentData?.topicBreakdown.length ?? 0} topics
                </span>
              </div>

              {visibleTopics.length === 0 ? (
                <div className="insights-empty insights-empty--compact">
                  <strong>No topic data yet</strong>
                  <p>Topics appear after customers submit feedback.</p>
                </div>
              ) : (
                <div className="insights-topic-table">
                  <div className="insights-topic-head" aria-hidden="true">
                    <span>Topic</span>
                    <span>Positive</span>
                    <span>Mentions</span>
                    <span>Change</span>
                  </div>
                  {visibleTopics.map((topic) => {
                    const change = topicDelta(topic);
                    return (
                      <div className="insights-topic-row" key={topic.tag}>
                        <div className="insights-topic-name">
                          <i
                            className={`insights-sentiment-dot insights-sentiment-dot--${topic.sentiment}`}
                          />
                          <div>
                            <strong>{topic.tag}</strong>
                            <span>{topic.sentiment} signal</span>
                          </div>
                        </div>
                        <div className="insights-topic-health">
                          <div className="insights-progress">
                            <span
                              style={{
                                width: `${topic.pctPositive}%`,
                                backgroundColor:
                                  topic.pctPositive >= 70
                                    ? '#3f7d45'
                                    : topic.pctPositive >= 40
                                      ? '#e5a93d'
                                      : '#dc5a5a',
                              }}
                            />
                          </div>
                          <b>{topic.pctPositive}%</b>
                        </div>
                        <strong className="insights-topic-count">{topic.count}</strong>
                        <span
                          className={`insights-topic-delta insights-topic-delta--${
                            change.delta === 0
                              ? 'neutral'
                              : change.improving
                                ? 'good'
                                : 'bad'
                          }`}
                        >
                          {change.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {topicPages > 1 && (
                <div className="insights-pagination">
                  <span>
                    {safeTopicPage + 1} of {topicPages}
                  </span>
                  <div>
                    <button
                      type="button"
                      onClick={() => setTopicPage((page) => Math.max(0, page - 1))}
                      disabled={safeTopicPage === 0}
                      aria-label="Previous topics"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setTopicPage((page) => Math.min(topicPages - 1, page + 1))
                      }
                      disabled={safeTopicPage === topicPages - 1}
                      aria-label="Next topics"
                    >
                      →
                    </button>
                  </div>
                </div>
              )}
            </article>

            <AtRiskSection atRiskData={atRiskData} />
          </section>
        </>
      )}
    </div>
  );
}
