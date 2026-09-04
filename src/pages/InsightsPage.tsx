import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AtRiskSection from '../components/AtRiskSection';
import {
  useAtRiskData,
  useReviewVelocity,
  useSentimentCompare,
} from '../hooks/queries/useInsights';
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
    return { label: `Happiness +${delta}pts`, delta, tone: 'good' as const };
  }
  if (delta < 0) {
    return {
      label: `Happiness ${delta}pts`,
      delta,
      tone: 'bad' as const,
    };
  }
  return { label: 'Happiness steady', delta, tone: 'neutral' as const };
}

/** Computes the credible 0–100 Business Health Score */
function getHealthScore(
  sentimentData: SentimentData | undefined,
  atRiskData: AtRiskData | undefined,
  positiveRate: number,
  averageRating: number,
  trendTone: 'good' | 'bad' | 'neutral',
) {
  if (!sentimentData || sentimentData.totalFeedback < 10) {
    return {
      status: 'collecting' as const,
      score: null,
      grade: 'COLLECTING DATA',
      explanation: `10 responses required for a credible score (${sentimentData?.totalFeedback ?? 0}/10 collected so far).`,
      variant: 'collecting' as const,
    };
  }

  // 1. Positive rate (40% weight): 0-100
  const posScore = positiveRate;

  // 2. Avg rating normalized (30% weight): (rating / 5) * 100
  const ratingScore = Math.min(100, Math.max(0, (averageRating / 5) * 100));

  // 3. Trend direction (15% weight): +100 if good, 50 if neutral, 0 if bad
  const trendScore = trendTone === 'good' ? 100 : trendTone === 'neutral' ? 50 : 0;

  // 4. At-risk resolution rate (15% weight)
  const handled = atRiskData?.atRiskList.filter((i) => i.recoveryStatus === 'handled').length ?? 0;
  const unhandled = atRiskData?.atRiskList.filter((i) => i.recoveryStatus === 'unhandled').length ?? 0;
  const totalCases = handled + unhandled;
  const resolutionScore = totalCases > 0 ? (handled / totalCases) * 100 : 100;

  const rawScore = Math.round(
    posScore * 0.40 + ratingScore * 0.30 + trendScore * 0.15 + resolutionScore * 0.15,
  );
  const score = Math.min(100, Math.max(0, rawScore));

  let grade: string;
  let variant: 'excellent' | 'good' | 'needs-work' | 'critical';

  if (score >= 80) {
    grade = 'EXCELLENT';
    variant = 'excellent';
  } else if (score >= 60) {
    grade = 'GOOD';
    variant = 'good';
  } else if (score >= 40) {
    grade = 'NEEDS WORK';
    variant = 'needs-work';
  } else {
    grade = 'CRITICAL';
    variant = 'critical';
  }

  const trendWord = trendTone === 'good' ? 'improving' : trendTone === 'bad' ? 'declining' : 'steady';
  const explanation = `Based on ${sentimentData.totalFeedback} responses, ${positiveRate}% positive feedback rate, and ${trendWord} momentum.`;

  return { status: 'ready' as const, score, grade, explanation, variant };
}

/** Extracts plain-language "what this means" insights with brutalist tags. */
function getWhatThisMeans(
  sentimentData: SentimentData | undefined,
  atRiskData: AtRiskData | undefined,
  positiveRate: number,
  trendSummary: ReturnType<typeof getTrendSummary>,
) {
  const insights: { type: 'good' | 'attention'; title: string; text: string }[] = [];

  if (!sentimentData || sentimentData.totalFeedback === 0) return insights;

  // Overall experience
  if (positiveRate >= 75) {
    insights.push({
      type: 'good',
      title: 'Customer Satisfaction High',
      text: 'Customers are overwhelmingly pleased with their visit and service quality.',
    });
  } else if (positiveRate >= 50) {
    insights.push({
      type: 'attention',
      title: 'Mixed Sentiment',
      text: 'Customer experiences are split. A noticeable group is experiencing friction.',
    });
  } else {
    insights.push({
      type: 'attention',
      title: 'Action Needed',
      text: 'Over half of recent feedback indicates dissatisfaction. Immediate attention recommended.',
    });
  }

  // Trend
  if (trendSummary.tone === 'good') {
    insights.push({
      type: 'good',
      title: 'Positive Momentum',
      text: `Customer happiness improved by ${trendSummary.delta} percentage points vs earlier in this window.`,
    });
  } else if (trendSummary.tone === 'bad') {
    insights.push({
      type: 'attention',
      title: 'Slipping Trend',
      text: `Customer happiness dipped by ${Math.abs(trendSummary.delta)} points compared to the earlier part of this window.`,
    });
  }

  // Top positive topic
  const positiveTopics = sentimentData.topicBreakdown.filter((t) => t.sentiment === 'positive');
  if (positiveTopics.length > 0) {
    const top = positiveTopics[0];
    insights.push({
      type: 'good',
      title: `Strength: ${top.tag}`,
      text: `Customers frequently highlight "${top.tag}" (${top.count} mentions) as a key highlight.`,
    });
  }

  // Top negative topic
  const negativeTopics = sentimentData.topicBreakdown.filter((t) => t.sentiment === 'negative');
  if (negativeTopics.length > 0) {
    const top = negativeTopics[0];
    insights.push({
      type: 'attention',
      title: `Concern: ${top.tag}`,
      text: `"${top.tag}" is a recurring pain point with ${top.count} complaints logged this period.`,
    });
  }

  // At-risk
  const openCount = atRiskData?.atRiskList.filter((i) => i.recoveryStatus === 'unhandled').length ?? 0;
  if (openCount > 0) {
    insights.push({
      type: 'attention',
      title: `${openCount} Unresolved ${openCount === 1 ? 'Case' : 'Cases'}`,
      text: `You have ${openCount} unhappy ${openCount === 1 ? 'customer' : 'customers'} in the recovery queue awaiting follow-up.`,
    });
  }

  return insights;
}

/** Generates actionable recommendations from actual business data. */
function getRecommendations(
  sentimentData: SentimentData | undefined,
  atRiskData: AtRiskData | undefined,
) {
  const recs: { title: string; description: string; cta: string; href: string }[] = [];

  const openCount = atRiskData?.atRiskList.filter((i) => i.recoveryStatus === 'unhandled').length ?? 0;
  if (openCount > 0) {
    recs.push({
      title: `Follow up with ${openCount} unhappy ${openCount === 1 ? 'customer' : 'customers'}`,
      description: `${openCount} low-rating customers left reviews without recorded recovery resolution.`,
      cta: 'Open Recovery Queue',
      href: '#recovery-queue',
    });
  }

  if (sentimentData) {
    const negativeTopics = sentimentData.topicBreakdown.filter((t) => t.sentiment === 'negative');
    if (negativeTopics.length > 0) {
      const top = negativeTopics[0];
      recs.push({
        title: `Address complaints regarding "${top.tag}"`,
        description: `${top.count} customers specifically reported issues with ${top.tag.toLowerCase()}.`,
        cta: 'View Feedback Inbox',
        href: '/inbox',
      });
    }

    const positiveRate = getPositiveRate(sentimentData);
    if (positiveRate >= 70) {
      recs.push({
        title: 'Capitalize on high sentiment for Google Reviews',
        description: 'Over 70% of responses are positive. Maximize QR placements to route to Google.',
        cta: 'Review Booster QR',
        href: '/',
      });
    }
  }

  if (recs.length === 0) {
    recs.push({
      title: 'Continue collecting QR feedback',
      description: 'More verified customer responses unlock deeper predictive business insights.',
      cta: 'Go to Dashboard',
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

  const activeStart = period === 'custom' ? appliedStart : undefined;
  const activeEnd = period === 'custom' ? appliedEnd : undefined;

  const sentimentCompare = useSentimentCompare(period, activeStart, activeEnd);
  const velocityQuery = useReviewVelocity();
  const atRisk = useAtRiskData();

  const sentimentData = sentimentCompare.data?.current;
  const previousData = sentimentCompare.data?.previous;
  const velocity = velocityQuery.data;
  const atRiskData = atRisk.data;

  const isInitialLoading =
    (sentimentCompare.isLoading && !sentimentData) ||
    (atRisk.isLoading && !atRiskData);
  const error = sentimentCompare.error?.message || atRisk.error?.message || null;

  // Computed metrics
  const averageRating = getAverageRating(sentimentData);
  const positiveRate = getPositiveRate(sentimentData);
  const trendSummary = getTrendSummary(sentimentData);
  const healthScore = getHealthScore(
    sentimentData,
    atRiskData,
    positiveRate,
    averageRating,
    trendSummary.tone,
  );
  const openAtRisk =
    atRiskData?.atRiskList.filter((item) => item.recoveryStatus === 'unhandled') ?? [];

  const whatThisMeans = getWhatThisMeans(sentimentData, atRiskData, positiveRate, trendSummary);
  const recommendations = getRecommendations(sentimentData, atRiskData);

  // Topics: up to 5 per column
  const positiveTopics = useMemo(
    () => sentimentData?.topicBreakdown.filter((t) => t.sentiment === 'positive').slice(0, 5) ?? [],
    [sentimentData],
  );
  const negativeTopics = useMemo(
    () => sentimentData?.topicBreakdown.filter((t) => t.sentiment === 'negative').slice(0, 5) ?? [],
    [sentimentData],
  );

  // Period-over-period deltas for 4 stat cards
  const totalDelta = previousData && previousData.totalFeedback !== undefined
    ? sentimentData
      ? sentimentData.totalFeedback - previousData.totalFeedback
      : null
    : null;

  const ratingDelta = previousData && previousData.averageRating !== undefined && averageRating > 0 && previousData.averageRating > 0
    ? +(averageRating - previousData.averageRating).toFixed(1)
    : null;

  const posRateDelta = previousData && previousData.positiveRate !== undefined && sentimentData && sentimentData.totalFeedback > 0 && previousData.totalFeedback > 0
    ? positiveRate - previousData.positiveRate
    : null;

  const retry = () => {
    void sentimentCompare.refetch();
    void velocityQuery.refetch();
    void atRisk.refetch();
  };

  const changePeriod = (nextPeriod: Period) => {
    setPeriod(nextPeriod);
  };

  const handleApplyCustom = (start: string, end: string) => {
    setAppliedStart(start);
    setAppliedEnd(end);
  };

  // Rating bands data for always-visible distribution bar
  const ratingBands = useMemo(() => {
    if (!sentimentData) return [];
    return [
      {
        key: 'excellent',
        label: 'Excellent',
        stars: '5★',
        count: sentimentData.byRatingBand['excellent']?.count ?? 0,
        pct: sentimentData.byRatingBand['excellent']?.pct ?? 0,
      },
      {
        key: 'good',
        label: 'Good',
        stars: '4★',
        count: sentimentData.byRatingBand['good']?.count ?? 0,
        pct: sentimentData.byRatingBand['good']?.pct ?? 0,
      },
      {
        key: 'average',
        label: 'Average',
        stars: '3★',
        count: sentimentData.byRatingBand['average']?.count ?? 0,
        pct: sentimentData.byRatingBand['average']?.pct ?? 0,
      },
      {
        key: 'poor',
        label: 'Poor',
        stars: '1–2★',
        count: sentimentData.byRatingBand['poor']?.count ?? 0,
        pct: sentimentData.byRatingBand['poor']?.pct ?? 0,
      },
    ];
  }, [sentimentData]);

  return (
    <div className="db-page insights-page animate-fade-in">
      {/* ── Top Header ───────────────────────────────────── */}
      <header className="insights-header">
        <div>
          <h1 className="db-title">BUSINESS INSIGHTS</h1>
          <p className="db-subtitle">
            Performance analytics, customer sentiment breakdown, and actionable next steps.
          </p>
        </div>

        <div className="insights-controls">
          {(sentimentCompare.isFetching || atRisk.isFetching) && !isInitialLoading && (
            <span className="insights-sync-status" role="status">
              <span className="insights-sync-dot" />
              UPDATING
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4m0 4h.01" />
          </svg>
          <span className="insights-error-msg">Failed to load insights data. Check your connection or retry.</span>
          <button className="db-error-retry" onClick={retry}>RETRY</button>
        </div>
      )}

      {/* ── Loading state ───────────────────────────────── */}
      {isInitialLoading ? (
        <div className="insights-loading" aria-label="Loading insights">
          <div className="insights-skeleton insights-skeleton--health" />
          <div className="insights-skeleton-grid">
            {[0, 1, 2, 3].map((item) => (
              <div className="insights-skeleton insights-skeleton--metric" key={item} />
            ))}
          </div>
          <div className="insights-skeleton insights-skeleton--bar" />
          <div className="insights-skeleton insights-skeleton--content" />
        </div>
      ) : (
        <>
          {/* ── Section 1: Business Health Score Banner ───── */}
          <section
            className={`insights-health-banner insights-health-banner--${healthScore.variant}`}
            aria-label="Business Health Score"
          >
            <div className="insights-health-main">
              <div className="insights-health-score-box">
                {healthScore.status === 'ready' ? (
                  <>
                    <span className="insights-health-number">{healthScore.score}</span>
                    <span className="insights-health-max">/100</span>
                  </>
                ) : (
                  <span className="insights-health-collecting-icon">⏳</span>
                )}
              </div>
              <div className="insights-health-info">
                <div className="insights-health-badge-row">
                  <span className={`insights-health-grade-tag insights-health-grade-tag--${healthScore.variant}`}>
                    {healthScore.grade}
                  </span>
                  <span className="insights-health-kicker">BUSINESS HEALTH SCORE</span>
                </div>
                <p className="insights-health-explanation">{healthScore.explanation}</p>
              </div>
            </div>

            <div className="insights-health-factors">
              <div className="insights-factor-chip">
                <span className="factor-label">Positive Rate</span>
                <strong className="factor-val">{positiveRate}%</strong>
              </div>
              <div className="insights-factor-chip">
                <span className="factor-label">Avg Rating</span>
                <strong className="factor-val">{averageRating > 0 ? averageRating.toFixed(1) : '—'} ⭐</strong>
              </div>
              <div className="insights-factor-chip">
                <span className="factor-label">Trend Momentum</span>
                <strong className={`factor-val factor-val--${trendSummary.tone}`}>
                  {trendSummary.tone === 'good' ? '↑ Improving' : trendSummary.tone === 'bad' ? '↓ Slipping' : '→ Steady'}
                </strong>
              </div>
            </div>
          </section>

          {/* ── Section 2: 4 Metric Cards with Period Deltas ── */}
          <section className="insights-metrics-grid" aria-label="Key Performance Indicators">
            {/* Card 1: Total Responses */}
            <article className="stat-card stat-card--brand insights-metric-card">
              <div className="stat-card-body">
                <span className="stat-card-label">TOTAL RESPONSES</span>
                <span className="stat-card-value">{sentimentData?.totalFeedback.toLocaleString() ?? 0}</span>
                <div className="insights-delta-row">
                  {totalDelta !== null ? (
                    <span className={`brutal-delta-badge brutal-delta-badge--${totalDelta > 0 ? 'good' : totalDelta < 0 ? 'bad' : 'neutral'}`}>
                      {totalDelta > 0 ? `↑ +${totalDelta}` : totalDelta < 0 ? `↓ ${totalDelta}` : '= Same'}
                    </span>
                  ) : (
                    <span className="brutal-delta-badge brutal-delta-badge--neutral">—</span>
                  )}
                  <span className="insights-delta-context">vs previous period</span>
                </div>
              </div>
            </article>

            {/* Card 2: Average Rating */}
            <article className="stat-card stat-card--cyan insights-metric-card">
              <div className="stat-card-body">
                <span className="stat-card-label">AVERAGE RATING</span>
                <span className="stat-card-value">
                  {averageRating > 0 ? averageRating.toFixed(1) : '—'} <span className="stat-star">⭐</span>
                </span>
                <div className="insights-delta-row">
                  {ratingDelta !== null ? (
                    <span className={`brutal-delta-badge brutal-delta-badge--${ratingDelta > 0 ? 'good' : ratingDelta < 0 ? 'bad' : 'neutral'}`}>
                      {ratingDelta > 0 ? `↑ +${ratingDelta}` : ratingDelta < 0 ? `↓ ${ratingDelta}` : '= Same'}
                    </span>
                  ) : (
                    <span className="brutal-delta-badge brutal-delta-badge--neutral">—</span>
                  )}
                  <span className="insights-delta-context">vs previous period</span>
                </div>
              </div>
            </article>

            {/* Card 3: Happy Customers */}
            <article className="stat-card stat-card--amber insights-metric-card">
              <div className="stat-card-body">
                <span className="stat-card-label">HAPPY CUSTOMERS</span>
                <span className="stat-card-value">{positiveRate}%</span>
                <div className="insights-delta-row">
                  {posRateDelta !== null ? (
                    <span className={`brutal-delta-badge brutal-delta-badge--${posRateDelta > 0 ? 'good' : posRateDelta < 0 ? 'bad' : 'neutral'}`}>
                      {posRateDelta > 0 ? `↑ +${posRateDelta}%` : posRateDelta < 0 ? `↓ ${posRateDelta}%` : '= Same'}
                    </span>
                  ) : (
                    <span className="brutal-delta-badge brutal-delta-badge--neutral">—</span>
                  )}
                  <span className="insights-delta-context">vs previous period</span>
                </div>
              </div>
            </article>

            {/* Card 4: Review Velocity */}
            <article className="stat-card stat-card--rose insights-metric-card">
              <div className="stat-card-body">
                <span className="stat-card-label">REVIEW VELOCITY</span>
                <span className="stat-card-value">
                  {velocity?.weeklyAvgLast30Days ?? 0}<small className="stat-unit">/wk</small>
                </span>
                <div className="insights-delta-row">
                  <span className={`brutal-delta-badge brutal-delta-badge--${velocity?.trend === 'up' ? 'good' : velocity?.trend === 'down' ? 'bad' : 'neutral'}`}>
                    {velocity?.trend === 'up' ? '↑ Trending Up' : velocity?.trend === 'down' ? '↓ Slowing' : '→ Steady'}
                  </span>
                  <span className="insights-delta-context">{velocity?.thisWeek ?? 0} this wk</span>
                </div>
              </div>
            </article>
          </section>

          {/* ── Section 3: Always-Visible Sentiment Distribution Bar ── */}
          <section className="insights-sentiment-bar-card" aria-label="Rating breakdown distribution">
            <div className="insights-sentiment-bar-header">
              <div>
                <h3 className="insights-bar-title">SENTIMENT DISTRIBUTION</h3>
                <span className="insights-bar-subtitle">
                  Visual rating proportion across {sentimentData?.totalFeedback ?? 0} reviews
                </span>
              </div>
              <span className="insights-bar-counter">
                {positiveRate}% POSITIVE RATINGS (4–5★)
              </span>
            </div>

            {/* Stacked Brutalist Bar */}
            <div className="insights-sentiment-bar-track">
              {ratingBands.map((band) =>
                band.pct > 0 ? (
                  <div
                    key={band.key}
                    className={`insights-sentiment-bar-segment insights-sentiment-bar-segment--${band.key}`}
                    style={{ width: `${band.pct}%` }}
                    title={`${band.label} (${band.stars}): ${band.count} reviews (${band.pct}%)`}
                  >
                    {band.pct >= 10 && (
                      <span className="insights-sentiment-bar-pct">{band.pct}%</span>
                    )}
                  </div>
                ) : null,
              )}
            </div>

            {/* Legend with direct stats */}
            <div className="insights-sentiment-legend">
              {ratingBands.map((band) => (
                <div className="insights-legend-item" key={band.key}>
                  <span className={`insights-legend-swatch insights-legend-swatch--${band.key}`} />
                  <span className="insights-legend-name">{band.label}</span>
                  <span className="insights-legend-stars">{band.stars}</span>
                  <strong className="insights-legend-pct">{band.pct}%</strong>
                  <span className="insights-legend-count">({band.count})</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Sections 4 & 5: Topics + Trend Chart Grid ── */}
          <section className="insights-content-grid">
            {/* Customer Topics Breakdown (Up to 5 each) */}
            <article className="insights-card insights-card--feedback">
              <div className="insights-card-header">
                <h2>VOICE OF CUSTOMER: TOPICS</h2>
                <p>Specific operational factors mentioned by customers this period</p>
              </div>

              {positiveTopics.length === 0 && negativeTopics.length === 0 ? (
                <div className="insights-empty insights-empty--compact">
                  <strong>NO TOPIC TAGS YET</strong>
                  <p>Customer feedback tags will automatically appear here once reviews arrive.</p>
                </div>
              ) : (
                <div className="insights-topic-columns">
                  {/* Strengths Column */}
                  <div className="insights-topic-col">
                    <div className="insights-topic-col-header insights-topic-col-header--positive">
                      <span>👍 WHAT CUSTOMERS PRAISE</span>
                      <span className="col-count">{positiveTopics.length}</span>
                    </div>
                    {positiveTopics.length === 0 ? (
                      <div className="insights-col-empty">No positive tags logged</div>
                    ) : (
                      <div className="insights-topic-list">
                        {positiveTopics.map((topic) => (
                          <FeedbackItem key={topic.tag} topic={topic} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Issues Column */}
                  <div className="insights-topic-col">
                    <div className="insights-topic-col-header insights-topic-col-header--negative">
                      <span>⚠️ WHAT NEEDS ATTENTION</span>
                      <span className="col-count">{negativeTopics.length}</span>
                    </div>
                    {negativeTopics.length === 0 ? (
                      <div className="insights-col-empty">No critical issues logged</div>
                    ) : (
                      <div className="insights-topic-list">
                        {negativeTopics.map((topic) => (
                          <FeedbackItem key={topic.tag} topic={topic} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </article>

            {/* Trend Chart with Grid Lines */}
            <article className="insights-card insights-card--trend">
              <div className="insights-card-header">
                <div>
                  <h2>CUSTOMER VOLUME OVER TIME</h2>
                  <p className={`insights-trend-sentence insights-trend-sentence--${trendSummary.tone}`}>
                    {trendSummary.tone === 'good'
                      ? '📈 Positive sentiment trend — Ratings are rising'
                      : trendSummary.tone === 'bad'
                        ? '📉 Negative sentiment trend — Ratings require monitoring'
                        : '→ Stable sentiment momentum'}
                  </p>
                </div>
              </div>

              {!sentimentData || sentimentData.totalFeedback < 3 ? (
                <div className="insights-empty">
                  <strong>TREND CHART REQUIRES MORE DATA</strong>
                  <p>
                    {sentimentData?.totalFeedback ?? 0} of 3 responses collected. Chart bars will populate as volume grows.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className="insights-chart"
                    role="img"
                    aria-label="Bar chart of positive and negative feedback"
                  >
                    {/* Horizontal Grid lines */}
                    <div className="insights-chart-gridline" style={{ bottom: '75%' }}>
                      <span className="gridline-label">75%</span>
                    </div>
                    <div className="insights-chart-gridline" style={{ bottom: '50%' }}>
                      <span className="gridline-label">50%</span>
                    </div>
                    <div className="insights-chart-gridline" style={{ bottom: '25%' }}>
                      <span className="gridline-label">25%</span>
                    </div>

                    {sentimentData.overallTrend.map((point, index) => {
                      const total = point.positiveCount + point.negativeCount;
                      const maxTotal = Math.max(
                        ...sentimentData.overallTrend.map(
                          (item) => item.positiveCount + item.negativeCount,
                        ),
                        1,
                      );
                      const totalHeight = total > 0 ? Math.max(8, (total / maxTotal) * 100) : 4;
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
                          title={`${point.label}: ${point.positiveCount} positive, ${point.negativeCount} negative (${point.feedbackCount} total)`}
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
                      <i className="insights-legend-square insights-legend-square--positive" />
                      Positive (4–5★)
                    </span>
                    <span>
                      <i className="insights-legend-square insights-legend-square--negative" />
                      Critical / Needs Attention (1–3★)
                    </span>
                  </div>
                </>
              )}
            </article>
          </section>

          {/* ── Section 6: Key Takeaways & Recommendations ─ */}
          <section className="insights-bottom-grid">
            {/* Takeaways */}
            <article className="insights-card insights-card--takeaways">
              <div className="insights-card-header">
                <h2>KEY TAKEAWAYS</h2>
                <p>Data-backed executive findings from current customer activity</p>
              </div>
              <div className="insights-takeaways-list">
                {whatThisMeans.length === 0 ? (
                  <div className="insights-empty insights-empty--compact">
                    <p>Takeaways will generate automatically once feedback is logged.</p>
                  </div>
                ) : (
                  whatThisMeans.map((insight, idx) => (
                    <div className={`insights-takeaway-item insights-takeaway-item--${insight.type}`} key={idx}>
                      <span className="insights-takeaway-icon">
                        {insight.type === 'good' ? '✓' : '!'}
                      </span>
                      <div className="insights-takeaway-body">
                        <strong>{insight.title}</strong>
                        <p>{insight.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>

            {/* Recommendations */}
            <article className="insights-card insights-card--recommendations">
              <div className="insights-card-header">
                <h2>RECOMMENDED ACTIONS</h2>
                <p>Highest-leverage operational adjustments based on customer patterns</p>
              </div>
              <div className="insights-rec-list">
                {recommendations.map((rec, idx) => (
                  <div className="insights-rec-item" key={idx}>
                    <span className="insights-rec-badge">{idx + 1}</span>
                    <div className="insights-rec-content">
                      <strong>{rec.title}</strong>
                      <p>{rec.description}</p>
                    </div>
                    {rec.href.startsWith('#') ? (
                      <button
                        type="button"
                        className="insights-rec-btn"
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
                      <Link to={rec.href} className="insights-rec-btn">
                        {rec.cta} →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </article>
          </section>

          {/* ── Section 7: Recovery Queue (Collapsible) ──── */}
          <section className="insights-recovery-wrapper" id="recovery-queue" aria-label="Recovery queue">
            <button
              type="button"
              className="insights-recovery-toggle"
              onClick={() => setRecoveryExpanded(!recoveryExpanded)}
              aria-expanded={recoveryExpanded}
            >
              <div>
                <h2>CUSTOMER RECOVERY QUEUE</h2>
                <p>
                  {openAtRisk.length > 0
                    ? `${openAtRisk.length} ${openAtRisk.length === 1 ? 'case' : 'cases'} requiring proactive follow-up`
                    : 'Zero critical unresolved cases right now.'}
                </p>
              </div>
              <div className="insights-recovery-toggle-right">
                {openAtRisk.length > 0 && (
                  <span className="insights-recovery-badge">{openAtRisk.length} OPEN</span>
                )}
                <span className="insights-toggle-btn">{recoveryExpanded ? 'COLLAPSE ▲' : 'EXPAND ▼'}</span>
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
  const delta = topic.prevCount !== undefined ? topic.count - topic.prevCount : 0;
  const isNew = topic.prevCount === 0 && topic.count > 0;

  return (
    <div className={`insights-feedback-card insights-feedback-card--${topic.sentiment}`}>
      <div className="insights-feedback-main">
        <strong className="insights-feedback-title">{topic.tag}</strong>
        <span className="insights-feedback-count">
          {topic.count} {topic.count === 1 ? 'mention' : 'mentions'}
        </span>
      </div>
      <div className="insights-feedback-meta">
        {isNew ? (
          <span className="topic-delta-badge topic-delta-badge--new">NEW</span>
        ) : delta !== 0 ? (
          <span
            className={`topic-delta-badge topic-delta-badge--${
              (topic.sentiment === 'positive' && delta > 0) ||
              (topic.sentiment === 'negative' && delta < 0)
                ? 'good'
                : 'bad'
            }`}
          >
            {delta > 0 ? `↑ +${delta}` : `↓ ${delta}`}
          </span>
        ) : (
          <span className="topic-delta-badge topic-delta-badge--neutral">=</span>
        )}
      </div>
    </div>
  );
}
