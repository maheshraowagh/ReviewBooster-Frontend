/**
 * LocalSeoPage — Google Business Profile Health Audit dashboard.
 *
 * Displays a health score (0-100), profile completeness checks,
 * review strength metrics, gamified action items with projected uplift,
 * and review intelligence (tone profile, negative patterns, rating distribution).
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useGbpAudit, useRefreshGbpAudit, useToneProfile } from '../hooks/queries/useGbpAudit';
import { useSocket } from '../providers/SocketProvider';
import { queryKeys } from '../lib/queryKeys';
import type { AuditDetails, AuditActionItem, ReviewToneProfileData } from '../services/gbpAuditService';
import './localSeo.css';

// ── Score color helper ──────────────────────────────────────────────────────
function getScoreColor(score: number): string {
  if (score >= 75) return '#3F7D45';
  if (score >= 50) return '#E5A93D';
  return '#DC5A5A';
}

// ── Radial gauge component ──────────────────────────────────────────────────
function ScoreGauge({ score }: { score: number }) {
  const r = 58;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="gbp-score-gauge">
      <svg viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} className="gbp-score-gauge__bg" />
        <circle
          cx="70"
          cy="70"
          r={r}
          className="gbp-score-gauge__fill"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="gbp-score-gauge__label">
        <span className="gbp-score-gauge__number">{score}</span>
        <span className="gbp-score-gauge__of">/ 100</span>
      </div>
    </div>
  );
}

// ── Sparkline chart ─────────────────────────────────────────────────────────
function Sparkline({ data }: { data: { score: number; scrapedAt: string }[] }) {
  if (data.length < 2) return null;

  const w = 200;
  const h = 40;
  const padding = 4;
  const scores = data.map((d) => d.score);
  const min = Math.min(...scores) - 5;
  const max = Math.max(...scores) + 5;
  const range = max - min || 1;

  const points = scores
    .map((s, i) => {
      const x = padding + (i / (scores.length - 1)) * (w - padding * 2);
      const y = h - padding - ((s - min) / range) * (h - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="gbp-sparkline">
      <div className="gbp-sparkline__label">Score trend</div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <polyline
          points={points}
          fill="none"
          stroke="#3F7D45"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {scores.map((s, i) => {
          const x = padding + (i / (scores.length - 1)) * (w - padding * 2);
          const y = h - padding - ((s - min) / range) * (h - padding * 2);
          return <circle key={i} cx={x} cy={y} r="3" fill="#3F7D45" />;
        })}
      </svg>
    </div>
  );
}

// ── Profile health check item ───────────────────────────────────────────────
function HealthItem({
  pass,
  warn,
  label,
  deduction,
}: {
  pass: boolean;
  warn?: boolean;
  label: string;
  deduction?: string;
}) {
  const iconClass = pass
    ? 'gbp-health-item__icon gbp-health-item__icon--pass'
    : warn
      ? 'gbp-health-item__icon gbp-health-item__icon--warn'
      : 'gbp-health-item__icon gbp-health-item__icon--fail';

  return (
    <div className="gbp-health-item">
      <div className={iconClass}>{pass ? '✓' : warn ? '!' : '✗'}</div>
      <span>{label}</span>
      {deduction && <span className="gbp-health-item__deduction">{deduction}</span>}
    </div>
  );
}

// ── Action item component ───────────────────────────────────────────────────
function ActionItem({ item }: { item: AuditActionItem }) {
  const navigate = useNavigate();

  function handleAction() {
    switch (item.actionType) {
      case 'AI_REPLY':
        navigate('/inbox');
        break;
      case 'TRIGGER_CAMPAIGN':
        navigate('/campaigns');
        break;
      default:
        window.open('https://business.google.com/', '_blank');
    }
  }

  const severityLabel =
    item.severity === 'critical'
      ? 'Critical Issue'
      : item.severity === 'warning'
        ? 'Growth Opportunity'
        : 'Profile Tip';

  return (
    <div className="gbp-action-item">
      <div className={`gbp-action-item__severity gbp-action-item__severity--${item.severity}`} />
      <div className="gbp-action-item__content">
        <div className="gbp-action-item__header">
          <p className="gbp-action-item__title">{item.title}</p>
          <span className={`gbp-action-badge gbp-action-badge--${item.severity}`}>
            {severityLabel}
          </span>
        </div>
        <p className="gbp-action-item__desc">{item.description}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <span className="gbp-action-item__uplift">+{item.projectedUplift} pts</span>
        <button className="gbp-btn gbp-btn--secondary" style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600 }} onClick={handleAction}>
          Fix →
        </button>
      </div>
    </div>
  );
}

// ── Helper: format relative time ────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

// ── Profile health section ──────────────────────────────────────────────────
function ProfileHealthSection({ details }: { details: AuditDetails }) {
  return (
    <div className="gbp-health-section">
      <h3>Profile Completeness</h3>
      <HealthItem pass={details.hasWebsite} label="Website" />
      <HealthItem pass={details.hasPhone} label="Phone Number" />
      <HealthItem pass={details.hasHours} label="Business Hours" deduction={!details.hasHours ? '-8 pts' : undefined} />
      <HealthItem pass={details.hasDescription} label="Business Description" deduction={!details.hasDescription ? '-5 pts' : undefined} />
      <HealthItem
        pass={details.photoCount >= 20}
        warn={details.photoCount >= 5 && details.photoCount < 20}
        label={`Photos (${details.photoCount})`}
        deduction={details.photoCount < 20 ? `${details.photoCount < 5 ? '-12' : details.photoCount < 10 ? '-8' : '-5'} pts` : undefined}
      />
    </div>
  );
}

// ── Review strength section ─────────────────────────────────────────────────
function ReviewStrengthSection({ details }: { details: AuditDetails }) {
  return (
    <div className="gbp-health-section">
      <h3>Review Strength</h3>
      <HealthItem
        pass={details.avgRating >= 4.5}
        warn={details.avgRating >= 4.0 && details.avgRating < 4.5}
        label={`Average Rating: ${details.avgRating.toFixed(1)} ⭐`}
        deduction={details.avgRating < 4.5 ? `${details.avgRating < 4.0 ? (details.avgRating < 3.5 ? '-12' : '-9') : (details.avgRating < 4.2 ? '-6' : '-3')} pts` : undefined}
      />
      <HealthItem
        pass={details.totalReviews >= 100}
        warn={details.totalReviews >= 20}
        label={`Total Reviews: ${details.totalReviews}`}
      />
      <HealthItem
        pass={details.recentUnrepliedRatio <= 0.1}
        warn={details.recentUnrepliedRatio <= 0.35}
        label={`Unreplied: ${Math.round(details.recentUnrepliedRatio * 100)}% of ${details.reviewSampleSize} recent`}
        deduction={details.recentUnrepliedRatio > 0.1 ? `${details.recentUnrepliedRatio > 0.5 ? '-20' : details.recentUnrepliedRatio > 0.35 ? '-15' : details.recentUnrepliedRatio > 0.2 ? '-10' : '-5'} pts` : undefined}
      />
      <HealthItem
        pass={(details.estimatedReviewVelocity30d ?? 0) >= 10}
        warn={(details.estimatedReviewVelocity30d ?? 0) >= 2}
        label={`Velocity: ~${details.estimatedReviewVelocity30d} reviews/mo`}
      />
      <HealthItem
        pass={(details.daysSinceLastReview ?? 999) <= 7}
        warn={(details.daysSinceLastReview ?? 999) <= 14}
        label={details.daysSinceLastReview != null ? `Last Review: ${details.daysSinceLastReview} days ago` : 'Last Review: Unknown'}
      />
    </div>
  );
}

// ── Rating Distribution bar chart ───────────────────────────────────────────
function RatingDistribution({ distribution }: { distribution: Record<string, number> }) {
  const total = Object.values(distribution).reduce((sum, v) => sum + (v || 0), 0);
  if (total === 0) return null;

  const stars = [5, 4, 3, 2, 1];
  const maxCount = Math.max(...stars.map((s) => distribution[String(s)] || 0));

  return (
    <div className="gbp-rating-dist">
      <h3>⭐ Rating Distribution</h3>
      <div className="gbp-rating-dist__bars">
        {stars.map((star) => {
          const count = distribution[String(star)] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const width = maxCount > 0 ? Math.max(2, (count / maxCount) * 100) : 2;
          return (
            <div key={star} className="gbp-rating-dist__row">
              <span className="gbp-rating-dist__star">{star}★</span>
              <div className="gbp-rating-dist__track">
                <div
                  className={`gbp-rating-dist__fill gbp-rating-dist__fill--${star}`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className="gbp-rating-dist__pct">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Review Intelligence section ─────────────────────────────────────────────
function ReviewIntelligenceSection({ profile }: { profile: ReviewToneProfileData }) {
  const { toneProfile, negativePatterns, ratingDistribution } = profile;

  const toneLabel: Record<string, string> = {
    'warm-grateful': '🤗 Warm & Grateful',
    'professional': '💼 Professional',
    'emotional': '💖 Emotional',
    'casual-friendly': '😊 Casual & Friendly',
    'brief-factual': '📝 Brief & Factual',
  };

  const styleLabel: Record<string, string> = {
    'casual': 'Casual',
    'formal': 'Formal',
    'emotional': 'Emotional',
    'brief': 'Brief',
  };

  return (
    <div className="gbp-intelligence-section">
      {/* Tone Profile Card */}
      {toneProfile && toneProfile.dominantTone && (
        <div className="gbp-intel-card">
          <h3>📊 Review Intelligence</h3>
          <div className="gbp-intel-card__grid">
            <div className="gbp-intel-item">
              <span className="gbp-intel-item__label">Tone</span>
              <span className="gbp-intel-item__value">
                {toneLabel[toneProfile.dominantTone] || toneProfile.dominantTone}
              </span>
            </div>
            <div className="gbp-intel-item">
              <span className="gbp-intel-item__label">Writing Style</span>
              <span className="gbp-intel-item__value">
                {styleLabel[toneProfile.writingStyle] || toneProfile.writingStyle || '—'}
              </span>
            </div>
            <div className="gbp-intel-item">
              <span className="gbp-intel-item__label">Avg Length</span>
              <span className="gbp-intel-item__value">
                ~{toneProfile.avgReviewLength} words
              </span>
            </div>
          </div>

          {toneProfile.topKeywords && toneProfile.topKeywords.length > 0 && (
            <div className="gbp-intel-tags">
              <span className="gbp-intel-tags__label">Top Keywords</span>
              <div className="gbp-intel-tags__list">
                {toneProfile.topKeywords.slice(0, 8).map((kw) => (
                  <span key={kw} className="gbp-intel-tag gbp-intel-tag--keyword">{kw}</span>
                ))}
              </div>
            </div>
          )}

          {toneProfile.keyEntities && toneProfile.keyEntities.length > 0 && (
            <div className="gbp-intel-tags">
              <span className="gbp-intel-tags__label">Key Entities</span>
              <div className="gbp-intel-tags__list">
                {toneProfile.keyEntities.slice(0, 6).map((ent) => (
                  <span key={ent} className="gbp-intel-tag gbp-intel-tag--entity">{ent}</span>
                ))}
              </div>
            </div>
          )}

          {toneProfile.commonPhrases && toneProfile.commonPhrases.length > 0 && (
            <div className="gbp-intel-tags">
              <span className="gbp-intel-tags__label">Common Phrases</span>
              <div className="gbp-intel-tags__list">
                {toneProfile.commonPhrases.slice(0, 6).map((ph) => (
                  <span key={ph} className="gbp-intel-tag gbp-intel-tag--phrase">"{ph}"</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Negative Patterns Card */}
      {negativePatterns && negativePatterns.recurringComplaints && negativePatterns.recurringComplaints.length > 0 && (
        <div className="gbp-intel-card gbp-intel-card--warning">
          <h3>⚠️ Recurring Complaints</h3>
          <div className="gbp-complaints-list">
            {negativePatterns.recurringComplaints.map((complaint) => (
              <div key={complaint} className="gbp-complaint-item">
                <span className="gbp-complaint-item__text">"{complaint}"</span>
                {negativePatterns.complaintFrequency && negativePatterns.complaintFrequency[complaint] && (
                  <span className="gbp-complaint-item__count">
                    mentioned {negativePatterns.complaintFrequency[complaint]}×
                  </span>
                )}
              </div>
            ))}
          </div>
          {negativePatterns.suggestedFixes && negativePatterns.suggestedFixes.length > 0 && (
            <div className="gbp-complaints-fixes">
              <span className="gbp-complaints-fixes__label">💡 Suggestions</span>
              <ul>
                {negativePatterns.suggestedFixes.map((fix, i) => (
                  <li key={i}>{fix}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Rating Distribution */}
      {ratingDistribution && <RatingDistribution distribution={ratingDistribution} />}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function LocalSeoPage() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useGbpAudit();
  const refreshMutation = useRefreshGbpAudit();
  const { data: toneData } = useToneProfile();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  // Listen for Socket.IO notification when audit completes
  useEffect(() => {
    if (!socket) return;

    const handler = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gbpAudit.all });
    };

    socket.on('gbp-audit:ready', handler);
    return () => { socket.off('gbp-audit:ready', handler); };
  }, [socket, queryClient]);

  // Auto-poll while processing
  useEffect(() => {
    if (data?.status !== 'processing') return;
    const interval = setInterval(() => refetch(), 5000);
    return () => clearInterval(interval);
  }, [data?.status, refetch]);

  const isProcessing = refreshMutation.isPending || data?.status === 'processing';

  // Animated scanner step progression (must stay before early returns)
  const [scanStep, setScanStep] = useState(0);
  useEffect(() => {
    if (!isProcessing) { setScanStep(0); return; }
    const delays = [3000, 8000, 16000, 28000]; // cumulative feel: 3s, 5s, 8s, 12s
    const timers: ReturnType<typeof setTimeout>[] = [];
    delays.forEach((delay, i) => {
      timers.push(setTimeout(() => setScanStep(i + 1), delay));
    });
    return () => timers.forEach(clearTimeout);
  }, [isProcessing]);

  if (isLoading) {
    return (
      <div className="gbp-audit-page">
        <h1>Business Health Audit</h1>
        <p className="page-subtitle">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gbp-audit-page">
        <h1>Business Health Audit</h1>
        <div className="gbp-failed-banner">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <span>Failed to load audit data. Please try again.</span>
        </div>
      </div>
    );
  }

  const audit = data?.audit;
  const status = data?.status;
  const plan = data?.plan || 'free';
  const isFrozen = data?.isFrozen || plan === 'free';
  const entitlements = data?.planEntitlements;

  if (isProcessing) {
    const steps = [
      { label: 'Connecting to Google Maps', desc: 'Locating your business Place ID...' },
      { label: 'Scanning profile information', desc: 'Checking hours, photos, categories & description...' },
      { label: 'Analyzing customer reviews', desc: 'Reading recent reviews & owner response rates...' },
      { label: 'Computing health score', desc: 'Calculating ranking score & priority improvements...' },
    ];

    return (
      <div className="gbp-audit-page">
        <h1>Business Health Audit</h1>
        <p className="page-subtitle">Analyzing your Google Business Profile...</p>
        <div className="gbp-scanner">
          <div className="gbp-scanner__header">
            <div className="gbp-scanner__pulse" />
            <h2>Live Profile Scanner</h2>
          </div>
          <div className="gbp-scanner__steps">
            {steps.map((step, i) => {
              const done = scanStep > i;
              const active = scanStep === i;
              return (
                <div key={i} className={`gbp-scan-step ${done ? 'gbp-scan-step--done' : ''} ${active ? 'gbp-scan-step--active' : ''}`}>
                  <div className="gbp-scan-step__icon">
                    {done ? (
                      <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : active ? (
                      <div className="gbp-scan-step__spinner" />
                    ) : (
                      <div className="gbp-scan-step__pending" />
                    )}
                  </div>
                  <div className="gbp-scan-step__text">
                    <span className="gbp-scan-step__label">{step.label}</span>
                    {(done || active) && <span className="gbp-scan-step__desc">{step.desc}</span>}
                  </div>
                  {done && <span className="gbp-scan-step__check">✓</span>}
                </div>
              );
            })}
          </div>
          <div className="gbp-scanner__footer">
            <p>Results will appear automatically when ready — you can also explore your dashboard while you wait.</p>
            <button className="gbp-btn gbp-btn--secondary" onClick={() => navigate('/dashboard')}>
              Continue to Dashboard →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── No audit exists yet ─────────────────────────────────────────────────
  if (status === 'none' || !audit) {
    return (
      <div className="gbp-audit-page">
        <h1>Business Health Audit</h1>
        <p className="page-subtitle">Analyze your Google Business Profile and get actionable improvement tips.</p>
        <div className="gbp-empty-state">
          <div className="gbp-empty-state__icon">
            <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h2>No Audit Yet</h2>
          <p>Run your initial Google Business Profile health analysis to discover what's helping — and hurting — your local search ranking.</p>
          <button
            className="gbp-btn gbp-btn--primary"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            {refreshMutation.isPending ? 'Starting...' : 'Analyze My Profile'}
          </button>
          {refreshMutation.isError && (
            <p style={{ color: '#DC5A5A', marginTop: 16, fontSize: 13, fontWeight: 500 }}>
              {(refreshMutation.error as Error)?.message || 'Failed to start audit.'}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Audit ready ─────────────────────────────────────────────────────────
  if (!audit) return null;

  const { healthScore, projectedScore, auditDetails, actionItems, scoreHistory } = audit;
  const toneProfile = toneData?.profile ?? null;

  const criticalCount = actionItems.filter((a) => a.severity === 'critical').length;
  const warningCount = actionItems.filter((a) => a.severity === 'warning').length;
  const infoCount = actionItems.filter((a) => a.severity === 'info').length;

  return (
    <div className="gbp-audit-page">
      <div className="gbp-page-header">
        <div>
          <h1>Business Health Audit</h1>
          <p className="page-subtitle">Your Google Business Profile optimization score and action plan.</p>
        </div>
        {isFrozen && (
          <span className="gbp-plan-badge gbp-plan-badge--free">
            Free Plan Snapshot
          </span>
        )}
        {!isFrozen && (
          <span className="gbp-plan-badge gbp-plan-badge--paid">
            {plan.toUpperCase()} Plan
          </span>
        )}
      </div>

      {/* Free Plan Frozen Snapshot Notice */}
      {isFrozen && (
        <div className="gbp-frozen-banner">
          <div className="gbp-frozen-banner__icon">
            <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </div>
          <div className="gbp-frozen-banner__text">
            <strong>One-Time Onboarding Audit</strong>
            <p>
              This is a snapshot from your initial setup ({audit.lastScrapedAt ? timeAgo(audit.lastScrapedAt) : 'onboarding'}).
              Upgrade to track ongoing score improvements and perform recurring refreshes.
            </p>
          </div>
          <button className="gbp-btn gbp-btn--upgrade-sm" onClick={() => navigate('/billing')}>
            Upgrade Plan →
          </button>
        </div>
      )}

      {/* Stale data warning for paid accounts */}
      {!isFrozen && data?.stale && (
        <div className="gbp-stale-banner">
          <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          <span>This audit data is older than 14 days. Click "Refresh Audit" to get updated results.</span>
        </div>
      )}

      {/* Failed with stale data */}
      {status === 'failed' && audit.lastError && (
        <div className="gbp-failed-banner">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <span>Last refresh failed: {audit.lastError}. Showing previous audit data.</span>
        </div>
      )}

      {/* Score hero */}
      <div className="gbp-score-hero">
        <ScoreGauge score={healthScore} />
        <div className="gbp-score-info">
          <h2>Business Health Score</h2>
          {projectedScore > healthScore && (
            <p className="gbp-score-info__projected">
              → Get to ~{projectedScore} by completing {actionItems.length} action{actionItems.length !== 1 ? 's' : ''} below
            </p>
          )}
          <p className="gbp-score-info__meta">
            <span>Based on {auditDetails.reviewSampleSize} most recent reviews</span>
            {audit.lastScrapedAt && <span>· Last updated {timeAgo(audit.lastScrapedAt)}</span>}
          </p>
          {scoreHistory && scoreHistory.length >= 2 && <Sparkline data={scoreHistory} />}
        </div>
      </div>

      {/* Priority Action Plan (Placed right after score for immediate clarity) */}
      {actionItems.length > 0 && (
        <div className="gbp-actions-card">
          <div className="gbp-actions-card__header">
            <div>
              <h3>🎯 Priority Action Plan ({actionItems.length} items to fix)</h3>
              <p className="gbp-actions-card__subtitle">
                Resolve these issues in order of priority to boost your Google Maps ranking and customer conversion.
              </p>
            </div>
            {/* Findings Summary Pills inside Actions header */}
            <div className="gbp-findings-strip" style={{ marginBottom: 0 }}>
              {criticalCount > 0 && (
                <div className="gbp-finding-pill gbp-finding-pill--critical">
                  <span className="gbp-finding-dot" />
                  <span>{criticalCount} Critical Issue{criticalCount !== 1 ? 's' : ''}</span>
                </div>
              )}
              {warningCount > 0 && (
                <div className="gbp-finding-pill gbp-finding-pill--warning">
                  <span className="gbp-finding-dot" />
                  <span>{warningCount} Growth Opportunit{warningCount !== 1 ? 'ies' : 'y'}</span>
                </div>
              )}
              {infoCount > 0 && (
                <div className="gbp-finding-pill gbp-finding-pill--info">
                  <span className="gbp-finding-dot" />
                  <span>{infoCount} Profile Tip{infoCount !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>
          <div className="gbp-actions-list">
            {actionItems.map((item, i) => (
              <ActionItem key={i} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Health Breakdown & Diagnostics Grid */}
      <div className="gbp-health-section-wrapper">
        <h3 className="gbp-section-heading">🔍 Detailed Health Diagnostics</h3>
        <div className="gbp-health-grid">
          <ProfileHealthSection details={auditDetails} />
          <ReviewStrengthSection details={auditDetails} />
        </div>
      </div>

      {/* Review Intelligence */}
      {toneProfile && (
        <div className="gbp-intel-wrapper">
          <ReviewIntelligenceSection profile={toneProfile} />
        </div>
      )}

      {/* Free User Upgrade Banner */}
      {isFrozen && (
        <div className="gbp-upgrade-card">
          <div className="gbp-upgrade-card__content">
            <div className="gbp-upgrade-badge">PRO GROWTH</div>
            <h3>Keep Your Reputation Health Optimized</h3>
            <p>
              Unlock recurring audit refreshes, score trajectory charts, and AI review intelligence to continuously outrank local competitors.
            </p>
            <ul className="gbp-upgrade-features">
              <li>✓ Monthly or weekly automated profile audits</li>
              <li>✓ Track score uplift & review velocity over time</li>
              <li>✓ AI Tone & Sentiment theme extraction</li>
              <li>✓ Priority customer engagement workflows</li>
            </ul>
            <button className="gbp-btn gbp-btn--upgrade" onClick={() => navigate('/billing')}>
              Explore Plans & Upgrade →
            </button>
          </div>
        </div>
      )}

      {/* Refresh footer */}
      <div className="gbp-refresh-footer">
        {isFrozen ? (
          <div className="gbp-refresh-gated">
            <button
              className="gbp-btn gbp-btn--secondary"
              onClick={() => navigate('/billing')}
            >
              <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              Upgrade to Refresh Audit
            </button>
            <p>Free plan accounts have 1 one-time onboarding audit. Upgrade to refresh.</p>
          </div>
        ) : (
          <>
            <button
              className="gbp-btn gbp-btn--secondary"
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
            >
              <svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
              {refreshMutation.isPending ? 'Refreshing...' : 'Refresh Audit'}
            </button>
            {refreshMutation.isError && (
              <p style={{ color: '#DC5A5A' }}>
                {(refreshMutation.error as Error)?.message || 'Failed to start refresh.'}
              </p>
            )}
            {!refreshMutation.isError && audit.lastScrapedAt && entitlements && (
              <p>
                Refresh interval: Every {entitlements.refreshCooldownDays} day{entitlements.refreshCooldownDays !== 1 ? 's' : ''} ({plan} plan)
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
