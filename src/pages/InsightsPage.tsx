import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AtRiskSection from '../components/AtRiskSection';
import { useAtRiskData, useSentimentData } from '../hooks/queries/useInsights';
import type {
  AtRiskData,
  Period,
  SentimentData,
  TopicItem,
} from '../services/insightsService';

import { DateFilterControl } from '../components/dashboard/DateFilterControl';

/* ── Constants ─────────────────────────────────────────────── */

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: '7 days' },
  { key: 'month', label: '30 days' },
  { key: 'year', label: '12 months' },
  { key: 'custom', label: 'Custom' },
];

/* ── Pure helper functions ─────────────────────────────────── */

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

function getPositiveRate(data?: SentimentData) {
  if (!data || !data.totalFeedback) return 0;
  const excellent = data.byRatingBand['excellent']?.count ?? 0;
  const good = data.byRatingBand['good']?.count ?? 0;
  return Math.round(((excellent + good) / data.totalFeedback) * 100);
}

function getTrendSummary(data: SentimentData | undefined) {
  if (!data || data.overallTrend.length < 2) {
    return { label: 'Collecting data', delta: 0, tone: 'neutral' as const };
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
    return { label: `Customer happiness improved`, delta, tone: 'good' as const };
  }
  if (delta < 0) {
    return {
      label: `Customer happiness declined`,
      delta,
      tone: 'bad' as const,
    };
  }
  return { label: 'Customer happiness is steady', delta, tone: 'neutral' as const };
}

/** Generates the dynamic headline and explanation for the summary section. */
function getBusinessSummary(
  sentimentData: SentimentData | undefined,
  positiveRate: number,
  averageRating: number,
  trendTone: string,
) {
  if (!sentimentData || sentimentData.totalFeedback === 0) {
    return {
      headline: 'Not enough data yet',
      explanation:
        "Once you receive a few customer reviews, we'll show you how your business is doing.",
      tone: 'neutral' as const,
    };
  }

  let headline: string;
  let tone: 'good' | 'mixed' | 'attention' | 'neutral';

  if (positiveRate >= 80 && averageRating >= 4.0) {
    headline = 'Your customers are responding well 👍';
    tone = 'good';
  } else if (positiveRate >= 60) {
    headline = 'Your business is doing okay, with room to improve';
    tone = 'mixed';
  } else if (positiveRate >= 40) {
    headline = 'Customer experience needs some attention ⚠️';
    tone = 'attention';
  } else {
    headline = 'Your customers are reporting issues that need action';
    tone = 'attention';
  }

  // Add trend context
  if (trendTone === 'good') {
    headline += " — and it's improving";
  } else if (trendTone === 'bad') {
    headline = headline.replace(' 👍', '') + ' \u2014 but things are slipping';
  }

  const total = sentimentData.totalFeedback;
  const ratingStr = averageRating > 0 ? averageRating.toFixed(1) : '—';
  const explanation = `You received ${total} ${total === 1 ? 'response' : 'responses'} this period. Your average rating is ${ratingStr} ⭐ and ${positiveRate}% of customers rated you positively.`;

  return { headline, explanation, tone };
}

/** Extracts plain-language "what this means" insights from the data. */
function getWhatThisMeans(
  sentimentData: SentimentData | undefined,
  atRiskData: AtRiskData | undefined,
  positiveRate: number,
  trendSummary: ReturnType<typeof getTrendSummary>,
) {
  const insights: { type: 'good' | 'attention'; text: string }[] = [];

  if (!sentimentData || sentimentData.totalFeedback === 0) return insights;

  // Overall experience
  if (positiveRate >= 75) {
    insights.push({ type: 'good', text: 'Customers are generally happy with your business.' });
  } else if (positiveRate >= 50) {
    insights.push({ type: 'attention', text: "Customer experience is mixed \u2014 some are happy, some aren't." });
  } else {
    insights.push({ type: 'attention', text: 'Most customers are reporting a below-average experience.' });
  }

  // Trend
  if (trendSummary.tone === 'good') {
    insights.push({ type: 'good', text: `Customer happiness improved by ${trendSummary.delta} points compared to the earlier part of this period.` });
  } else if (trendSummary.tone === 'bad') {
    insights.push({ type: 'attention', text: `Customer happiness dropped by ${Math.abs(trendSummary.delta)} points compared to the earlier part of this period.` });
  }

  // Top positive topic
  const positiveTopics = sentimentData.topicBreakdown.filter((t) => t.sentiment === 'positive');
  if (positiveTopics.length > 0) {
    const top = positiveTopics[0];
    insights.push({ type: 'good', text: `Customers are consistently mentioning "${top.tag}" positively.` });
  }

  // Top negative topic
  const negativeTopics = sentimentData.topicBreakdown.filter((t) => t.sentiment === 'negative');
  if (negativeTopics.length > 0) {
    const top = negativeTopics[0];
    insights.push({ type: 'attention', text: `"${top.tag}" is a recurring concern — mentioned ${top.count} ${top.count === 1 ? 'time' : 'times'}.` });
  }

  // At-risk
  const openCount = atRiskData?.atRiskList.filter((i) => i.recoveryStatus === 'unhandled').length ?? 0;
  if (openCount > 0) {
    insights.push({ type: 'attention', text: `You have ${openCount} unhappy ${openCount === 1 ? 'customer' : 'customers'} waiting for a follow-up.` });
  }

  return insights;
}

/** Generates 2–3 actionable recommendations from actual data. */
function getRecommendations(
  sentimentData: SentimentData | undefined,
  atRiskData: AtRiskData | undefined,
) {
  const recs: { title: string; description: string; cta: string; href: string }[] = [];

  const openCount = atRiskData?.atRiskList.filter((i) => i.recoveryStatus === 'unhandled').length ?? 0;
  if (openCount > 0) {
    recs.push({
      title: `Respond to ${openCount} customer ${openCount === 1 ? 'issue' : 'issues'}`,
      description: `You have ${openCount} low-rating ${openCount === 1 ? 'review' : 'reviews'} without a follow-up.`,
      cta: 'View below',
      href: '#recovery-queue',
    });
  }

  if (sentimentData) {
    const negativeTopics = sentimentData.topicBreakdown.filter((t) => t.sentiment === 'negative');
    if (negativeTopics.length > 0) {
      const top = negativeTopics[0];
      recs.push({
        title: `Address "${top.tag}" complaints`,
        description: `${top.count} ${top.count === 1 ? 'customer' : 'customers'} mentioned this issue.`,
        cta: 'View feedback',
        href: '/inbox',
      });
    }

    const positiveRate = getPositiveRate(sentimentData);
    if (positiveRate >= 70) {
      recs.push({
        title: 'Encourage happy customers to leave Google reviews',
        description: 'Your recent customers are satisfied — this is a great time to ask for reviews.',
        cta: 'Go to dashboard',
        href: '/',
      });
    }
  }

  // Always have at least one recommendation
  if (recs.length === 0) {
    recs.push({
      title: 'Keep collecting feedback',
      description: 'The more responses you gather, the better insights we can provide.',
      cta: 'Go to dashboard',
      href: '/',
    });
  }

  return recs.slice(0, 3);
}

/* ── Main Component ────────────────────────────────────────── */

export default function InsightsPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [period, setPeriod] = useState<Period>('week');
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [appliedStart, setAppliedStart] = useState<string>(todayStr);
  const [appliedEnd, setAppliedEnd] = useState<string>(todayStr);
  const [recoveryExpanded, setRecoveryExpanded] = useState(false);
  const [ratingDetailOpen, setRatingDetailOpen] = useState(false);

  const activeStart = period === 'custom' ? appliedStart : undefined;
  const activeEnd = period === 'custom' ? appliedEnd : undefined;

  const sentiment = useSentimentData(period, activeStart, activeEnd);
  const atRisk = useAtRiskData();

  const sentimentData = sentiment.data;
  const atRiskData = atRisk.data;
  const isInitialLoading =
    (sentiment.isLoading && !sentimentData) || (atRisk.isLoading && !atRiskData);
  const error = sentiment.error?.message || atRisk.error?.message || null;

  // Computed values
  const averageRating = getAverageRating(sentimentData);
  const positiveRate = getPositiveRate(sentimentData);
  const trendSummary = getTrendSummary(sentimentData);
  const openAtRisk =
    atRiskData?.atRiskList.filter((item) => item.recoveryStatus === 'unhandled') ?? [];

  const summary = getBusinessSummary(sentimentData, positiveRate, averageRating, trendSummary.tone);
  const whatThisMeans = getWhatThisMeans(sentimentData, atRiskData, positiveRate, trendSummary);
  const recommendations = getRecommendations(sentimentData, atRiskData);

  const positiveTopics = useMemo(
    () => sentimentData?.topicBreakdown.filter((t) => t.sentiment === 'positive').slice(0, 3) ?? [],
    [sentimentData],
  );
  const negativeTopics = useMemo(
    () => sentimentData?.topicBreakdown.filter((t) => t.sentiment === 'negative').slice(0, 3) ?? [],
    [sentimentData],
  );

  const retry = () => {
    void sentiment.refetch();
    void atRisk.refetch();
  };

  const changePeriod = (nextPeriod: Period) => {
    setPeriod(nextPeriod);
  };

  const handleApplyCustom = (start: string, end: string) => {
    setAppliedStart(start);
    setAppliedEnd(end);
  };

  return (
    <div className="db-page insights-page animate-fade-in">
      {/* ── Header ──────────────────────────────────────── */}
      <header className="insights-header">
        <div>
          <h1 className="db-title">Insights</h1>
          <p className="db-subtitle">
            How your business is doing, and what to focus on next.
          </p>
        </div>

        <div className="insights-controls">
          {(sentiment.isFetching || atRisk.isFetching) && !isInitialLoading && (
            <span className="insights-sync-status" role="status">
              <span className="insights-sync-dot" />
              Updating
            </span>
          )}
          <DateFilterControl
            periods={PERIODS}
            activePeriod={period}
            onPeriodChange={(p) => changePeriod(p as Period)}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onApplyCustom={handleApplyCustom}
          />
        </div>
      </header>

      {/* ── Error state ─────────────────────────────────── */}
      {error && (
        <div className="db-error insights-error" role="alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4m0 4h.01" />
          </svg>
          <span>We couldn't load your insights. Please try again.</span>
          <button className="db-error-retry" onClick={retry}>Try again</button>
        </div>
      )}

      {/* ── Loading state ───────────────────────────────── */}
      {isInitialLoading ? (
        <div className="insights-loading" aria-label="Loading insights">
          <div className="insights-skeleton insights-skeleton--summary" />
          <div className="insights-skeleton-row">
            {[0, 1, 2].map((item) => (
              <div className="insights-skeleton insights-skeleton--metric" key={item} />
            ))}
          </div>
          <div className="insights-skeleton insights-skeleton--chart" />
        </div>
      ) : (
        <>
          {/* ── Section 1: Business Summary ──────────────── */}
          <section className={`insights-summary insights-summary--${summary.tone}`} aria-label="Business summary">
            <h2 className="insights-summary-headline">{summary.headline}</h2>
            <p className="insights-summary-explanation">{summary.explanation}</p>
          </section>

          {/* ── Section 2: Key Numbers (3 metrics) ──────── */}
          <section className="insights-metrics" aria-label="Key metrics">
            <article className="insights-metric">
              <span className="insights-metric-emoji">💬</span>
              <div>
                <strong>{sentimentData?.totalFeedback.toLocaleString() ?? 0}</strong>
                <span className="insights-metric-label">Responses this period</span>
              </div>
            </article>

            <article className="insights-metric">
              <span className="insights-metric-emoji">⭐</span>
              <div>
                <strong>{averageRating > 0 ? averageRating.toFixed(1) : '—'}</strong>
                <span className="insights-metric-label">
                  {averageRating > 0 ? 'Average rating out of 5' : 'No ratings yet'}
                </span>
              </div>
            </article>

            <article className="insights-metric">
              <span className="insights-metric-emoji">
                {positiveRate >= 70 ? '😊' : positiveRate >= 40 ? '😐' : '😟'}
              </span>
              <div>
                <strong>{positiveRate}%</strong>
                <span className="insights-metric-label">Happy customers</span>
                <small className={`insights-metric-trend insights-metric-trend--${trendSummary.tone}`}>
                  {trendSummary.label}
                </small>
              </div>
            </article>
          </section>

          {/* ── Section 3: What This Means ───────────────── */}
          {whatThisMeans.length > 0 && (
            <section className="insights-what-means" aria-label="What this means">
              <h2>What this means</h2>
              <div className="insights-what-means-list">
                {whatThisMeans.map((insight, idx) => (
                  <div className={`insights-insight insights-insight--${insight.type}`} key={idx}>
                    <span className="insights-insight-icon">
                      {insight.type === 'good' ? '✅' : '⚠️'}
                    </span>
                    <p>{insight.text}</p>
                  </div>
                ))}
              </div>

              {/* Rating breakdown — expandable detail */}
              {sentimentData && sentimentData.totalFeedback > 0 && (
                <div className="insights-rating-detail-wrapper">
                  <button
                    type="button"
                    className="insights-rating-detail-toggle"
                    onClick={() => setRatingDetailOpen(!ratingDetailOpen)}
                    aria-expanded={ratingDetailOpen}
                  >
                    {ratingDetailOpen ? 'Hide' : 'View'} rating breakdown
                    <span className="insights-toggle-arrow">{ratingDetailOpen ? '▲' : '▼'}</span>
                  </button>
                  {ratingDetailOpen && (
                    <div className="insights-rating-detail animate-fade-in">
                      {(['excellent', 'good', 'average', 'poor'] as const).map((key) => {
                        const band = sentimentData.byRatingBand[key] ?? { count: 0, pct: 0 };
                        const labels: Record<string, { name: string; stars: string; color: string }> = {
                          excellent: { name: 'Excellent', stars: '5 ★', color: '#3f7d45' },
                          good: { name: 'Good', stars: '4 ★', color: '#68a05d' },
                          average: { name: 'Average', stars: '3 ★', color: '#e5a93d' },
                          poor: { name: 'Poor', stars: '1–2 ★', color: '#dc5a5a' },
                        };
                        const info = labels[key];
                        return (
                          <div className="insights-rating-row" key={key}>
                            <div>
                              <strong>{info.name}</strong>
                              <span>{info.stars}</span>
                            </div>
                            <div className="insights-progress">
                              <span style={{ width: `${band.pct}%`, backgroundColor: info.color }} />
                            </div>
                            <b>{band.pct}%</b>
                            <small>{band.count}</small>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ── Sections 4 & 5: Customer Feedback + Trend ── */}
          <section className="insights-content-grid">
            {/* Customer Feedback */}
            <article className="insights-card insights-card--feedback">
              <div className="insights-card-header">
                <h2>What your customers are saying</h2>
              </div>

              {positiveTopics.length === 0 && negativeTopics.length === 0 ? (
                <div className="insights-empty insights-empty--compact">
                  <strong>No topic data yet</strong>
                  <p>Topics appear after customers submit feedback.</p>
                </div>
              ) : (
                <div className="insights-feedback-lists">
                  {positiveTopics.length > 0 && (
                    <div className="insights-feedback-group">
                      <h3>👍 What customers like</h3>
                      {positiveTopics.map((topic) => (
                        <FeedbackItem key={topic.tag} topic={topic} />
                      ))}
                    </div>
                  )}
                  {negativeTopics.length > 0 && (
                    <div className="insights-feedback-group">
                      <h3>⚠️ What needs attention</h3>
                      {negativeTopics.map((topic) => (
                        <FeedbackItem key={topic.tag} topic={topic} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </article>

            {/* Trend Chart — simplified */}
            <article className="insights-card insights-card--trend">
              <div className="insights-card-header">
                <div>
                  <h2>Your reviews over time</h2>
                  <p className={`insights-trend-sentence insights-trend-sentence--${trendSummary.tone}`}>
                    {trendSummary.tone === 'good'
                      ? 'Reviews are trending positively 📈'
                      : trendSummary.tone === 'bad'
                        ? 'Reviews need attention 📉'
                        : 'Reviews are holding steady →'}
                  </p>
                </div>
              </div>

              {!sentimentData || sentimentData.totalFeedback < 5 ? (
                <div className="insights-empty">
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
                    aria-label="Bar chart of positive and negative feedback"
                  >
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
                  </div>
                </>
              )}
            </article>
          </section>

          {/* ── Section 6: Recommendations ───────────────── */}
          <section className="insights-recommendations" aria-label="Recommended actions">
            <h2>What you should do next</h2>
            <div className="insights-rec-list">
              {recommendations.map((rec, idx) => (
                <div className="insights-rec-item" key={idx}>
                  <span className="insights-rec-number">{idx + 1}</span>
                  <div className="insights-rec-content">
                    <strong>{rec.title}</strong>
                    <p>{rec.description}</p>
                  </div>
                  {rec.href.startsWith('#') ? (
                    <button
                      type="button"
                      className="insights-rec-cta"
                      onClick={() => {
                        setRecoveryExpanded(true);
                        setTimeout(() => {
                          document.getElementById('recovery-queue')?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                    >
                      {rec.cta} →
                    </button>
                  ) : (
                    <Link to={rec.href} className="insights-rec-cta">
                      {rec.cta} →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ── Section 7: Recovery Queue (collapsible) ──── */}
          <section className="insights-recovery-wrapper" id="recovery-queue" aria-label="Recovery queue">
            <button
              type="button"
              className="insights-recovery-toggle"
              onClick={() => setRecoveryExpanded(!recoveryExpanded)}
              aria-expanded={recoveryExpanded}
            >
              <div>
                <h2>Customers needing attention</h2>
                <p>
                  {openAtRisk.length > 0
                    ? `${openAtRisk.length} ${openAtRisk.length === 1 ? 'case' : 'cases'} waiting for follow-up`
                    : 'No cases needing attention right now'}
                </p>
              </div>
              <div className="insights-recovery-toggle-right">
                {openAtRisk.length > 0 && (
                  <span className="insights-recovery-badge">{openAtRisk.length}</span>
                )}
                <span className="insights-toggle-arrow">{recoveryExpanded ? '▲' : '▼'}</span>
              </div>
            </button>
            {recoveryExpanded && (
              <div className="insights-recovery-body animate-fade-in">
                <AtRiskSection atRiskData={atRiskData} />
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────── */

function FeedbackItem({ topic }: { topic: TopicItem }) {
  const delta = topic.count - topic.prevCount;
  const deltaLabel = delta === 0 ? '' : delta > 0 ? `↑ ${delta}` : `↓ ${Math.abs(delta)}`;

  return (
    <div className="insights-feedback-item">
      <div>
        <strong>{topic.tag}</strong>
        <span className="insights-feedback-count">
          Mentioned by {topic.count} {topic.count === 1 ? 'customer' : 'customers'}
        </span>
      </div>
      {deltaLabel && (
        <span
          className={`insights-feedback-delta insights-feedback-delta--${
            (topic.sentiment === 'positive' && delta >= 0) ||
            (topic.sentiment === 'negative' && delta <= 0)
              ? 'good'
              : 'bad'
          }`}
        >
          {deltaLabel}
        </span>
      )}
    </div>
  );
}
