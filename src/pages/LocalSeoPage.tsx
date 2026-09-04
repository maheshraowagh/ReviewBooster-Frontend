/**
 * LocalSeoPage — Google Business Profile Health Audit dashboard.
 * Neo-brutalist redesign matching Dashboard, Feedback Inbox, and Insights.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useGbpAudit, useRefreshGbpAudit, useToneProfile } from '../hooks/queries/useGbpAudit';
import { useSocket } from '../providers/SocketProvider';
import { queryKeys } from '../lib/queryKeys';
import type { AuditDetails, AuditActionItem, ReviewToneProfileData } from '../services/gbpAuditService';
import './localSeo.css';

// ── Score helpers ───────────────────────────────────────────────────────────
type HealthGrade = 'EXCELLENT' | 'GOOD' | 'NEEDS WORK' | 'CRITICAL';

function getHealthGrade(score: number): { grade: HealthGrade; variant: 'excellent' | 'good' | 'needs-work' | 'critical' } {
  if (score >= 80) return { grade: 'EXCELLENT', variant: 'excellent' };
  if (score >= 60) return { grade: 'GOOD', variant: 'good' };
  if (score >= 40) return { grade: 'NEEDS WORK', variant: 'needs-work' };
  return { grade: 'CRITICAL', variant: 'critical' };
}

// ── Score counter helper ───────────────────────────────────────────────────
function AnimatedScore({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 25));
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        setDisplay(target);
        clearInterval(timer);
      } else {
        setDisplay(current);
      }
    }, 24);
    return () => clearInterval(timer);
  }, [target]);

  return <span className="gbp-score-box__number">{display}</span>;
}

// ── Sparkline chart ─────────────────────────────────────────────────────────
function Sparkline({ data }: { data: { score: number; scrapedAt: string }[] }) {
  if (!data || data.length < 2) return null;

  const w = 140;
  const h = 34;
  const padding = 4;
  const scores = data.map((d) => d.score);
  const min = Math.min(...scores) - 4;
  const max = Math.max(...scores) + 4;
  const range = max - min || 1;

  const points = scores
    .map((s, i) => {
      const x = padding + (i / (scores.length - 1)) * (w - padding * 2);
      const y = h - padding - ((s - min) / range) * (h - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="gbp-sparkline-box">
      <span className="gbp-sparkline-label">Trajectory ({data.length} pts)</span>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <polyline
          points={points}
          fill="none"
          stroke="#1A1A1A"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {scores.map((s, i) => {
          const x = padding + (i / (scores.length - 1)) * (w - padding * 2);
          const y = h - padding - ((s - min) / range) * (h - padding * 2);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3.5"
              fill="#D0F0C0"
              stroke="#1A1A1A"
              strokeWidth="1.5"
            />
          );
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
      <div className="gbp-health-item__left">
        <div className={iconClass}>{pass ? '✓' : warn ? '!' : '✗'}</div>
        <span className="gbp-health-item__label">{label}</span>
      </div>
      {deduction && <span className="gbp-health-item__deduction">{deduction}</span>}
    </div>
  );
}

// ── Action item component ───────────────────────────────────────────────────
function ActionItem({ item, index }: { item: AuditActionItem; index: number }) {
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
    <div className="gbp-action-item" style={{ animationDelay: `${index * 70}ms` }}>
      <div className="gbp-action-item__left">
        <div className={`gbp-action-item__severity-bar gbp-action-item__severity-bar--${item.severity}`} />
        <div className="gbp-action-item__content">
          <div className="gbp-action-item__header">
            <h4 className="gbp-action-item__title">{item.title}</h4>
            <span className={`gbp-action-badge gbp-action-badge--${item.severity}`}>
              {severityLabel}
            </span>
          </div>
          <p className="gbp-action-item__desc">{item.description}</p>
        </div>
      </div>
      <div className="gbp-action-item__right">
        <span className="gbp-uplift-badge">+{item.projectedUplift} PTS</span>
        <button
          className="gbp-btn gbp-btn--secondary"
          style={{ padding: '6px 14px', fontSize: 12, fontWeight: 800 }}
          onClick={handleAction}
        >
          {item.actionType === 'AI_REPLY' ? 'AI Reply →' : item.actionType === 'TRIGGER_CAMPAIGN' ? 'Boost →' : 'Fix →'}
        </button>
      </div>
    </div>
  );
}

// ── Helper: format relative time ────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

// ── Profile health section ──────────────────────────────────────────────────
function ProfileHealthSection({ details }: { details: AuditDetails }) {
  return (
    <div className="gbp-health-section">
      <h3>Profile Completeness</h3>
      <HealthItem pass={Boolean(details.hasWebsite)} label="Official Website Connected" deduction={!details.hasWebsite ? '-10 pts' : undefined} />
      <HealthItem pass={Boolean(details.hasPhone)} label="Direct Phone Number Listed" deduction={!details.hasPhone ? '-10 pts' : undefined} />
      <HealthItem pass={Boolean(details.hasHours)} label="Verified Business Hours" deduction={!details.hasHours ? '-8 pts' : undefined} />
      <HealthItem pass={Boolean(details.hasDescription)} label="Business Description" deduction={!details.hasDescription ? '-5 pts' : undefined} />
      <HealthItem
        pass={(details.photoCount ?? 0) >= 20}
        warn={(details.photoCount ?? 0) >= 5 && (details.photoCount ?? 0) < 20}
        label={`High-Res Photos (${details.photoCount ?? 0} uploaded, target: 20+)`}
        deduction={(details.photoCount ?? 0) < 20 ? `${(details.photoCount ?? 0) < 5 ? '-12' : (details.photoCount ?? 0) < 10 ? '-8' : '-5'} pts` : undefined}
      />
    </div>
  );
}

// ── Review strength section ─────────────────────────────────────────────────
function ReviewStrengthSection({ details }: { details: AuditDetails }) {
  const avg = details.avgRating ?? 0;
  const total = details.totalReviews ?? 0;
  const unrepliedRatio = details.recentUnrepliedRatio ?? 0;
  const velocity = details.estimatedReviewVelocity30d ?? 0;
  const daysSince = details.daysSinceLastReview;

  return (
    <div className="gbp-health-section">
      <h3>Review Strength & Velocity</h3>
      <HealthItem
        pass={avg >= 4.5}
        warn={avg >= 4.0 && avg < 4.5}
        label={`Average Rating: ${avg.toFixed(1)} ⭐ (target 4.5+)`}
        deduction={avg < 4.5 ? `${avg < 4.0 ? (avg < 3.5 ? '-12' : '-9') : (avg < 4.2 ? '-6' : '-3')} pts` : undefined}
      />
      <HealthItem
        pass={total >= 100}
        warn={total >= 20}
        label={`Total Reviews: ${total} (benchmark: 100+)`}
        deduction={total < 20 ? '-10 pts' : undefined}
      />
      <HealthItem
        pass={unrepliedRatio <= 0.1}
        warn={unrepliedRatio <= 0.35}
        label={`Unreplied: ${Math.round(unrepliedRatio * 100)}% of recent ${details.reviewSampleSize ?? 20} reviews`}
        deduction={unrepliedRatio > 0.1 ? `${unrepliedRatio > 0.5 ? '-20' : unrepliedRatio > 0.35 ? '-15' : unrepliedRatio > 0.2 ? '-10' : '-5'} pts` : undefined}
      />
      <HealthItem
        pass={velocity >= 10}
        warn={velocity >= 2}
        label={`Monthly Velocity: ~${velocity} reviews/mo`}
        deduction={velocity < 2 ? '-6 pts' : undefined}
      />
      <HealthItem
        pass={(daysSince ?? 999) <= 7}
        warn={(daysSince ?? 999) <= 14}
        label={daysSince != null ? `Last Review: ${daysSince} days ago` : 'Last Review: Unknown'}
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
              <span className="gbp-rating-dist__pct">{pct}% ({count})</span>
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
          <h3>📊 Review Intelligence & Customer Voice</h3>
          <div className="gbp-intel-card__grid">
            <div className="gbp-intel-item">
              <span className="gbp-intel-item__label">Dominant Tone</span>
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
              <span className="gbp-intel-item__label">Average Review Length</span>
              <span className="gbp-intel-item__value">
                ~{toneProfile.avgReviewLength ?? 0} words
              </span>
            </div>
          </div>

          {toneProfile.topKeywords && toneProfile.topKeywords.length > 0 && (
            <div className="gbp-intel-tags">
              <span className="gbp-intel-tags__label">Top Mentioned Keywords</span>
              <div className="gbp-intel-tags__list">
                {toneProfile.topKeywords.slice(0, 10).map((kw) => (
                  <span key={kw} className="gbp-intel-tag gbp-intel-tag--keyword">{kw}</span>
                ))}
              </div>
            </div>
          )}

          {toneProfile.keyEntities && toneProfile.keyEntities.length > 0 && (
            <div className="gbp-intel-tags">
              <span className="gbp-intel-tags__label">Key Entities & Topics</span>
              <div className="gbp-intel-tags__list">
                {toneProfile.keyEntities.slice(0, 8).map((ent) => (
                  <span key={ent} className="gbp-intel-tag gbp-intel-tag--entity">{ent}</span>
                ))}
              </div>
            </div>
          )}

          {toneProfile.commonPhrases && toneProfile.commonPhrases.length > 0 && (
            <div className="gbp-intel-tags">
              <span className="gbp-intel-tags__label">Common Customer Phrases</span>
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
          <h3>⚠️ Recurring Complaints & Operational Gaps</h3>
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
              <span className="gbp-complaints-fixes__label">💡 Recommended Operational Fixes</span>
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

  // Animated scanner step progression
  const [scanStep, setScanStep] = useState(0);
  useEffect(() => {
    if (!isProcessing) { setScanStep(0); return; }
    const delays = [2500, 7000, 14000, 24000];
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
        <p className="page-subtitle">Connecting to Reputational Engine...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gbp-audit-page">
        <h1>Business Health Audit</h1>
        <div className="gbp-failed-banner">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <span>Failed to load audit data. Please try refreshing.</span>
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
      { label: 'Connecting to Google Maps Engine', desc: 'Locating verified Place ID and geo-coordinates...' },
      { label: 'Scanning profile metadata', desc: 'Validating hours, photos, primary categories & NAP integrity...' },
      { label: 'Analyzing customer sentiment & tone', desc: 'Auditing recent review velocity and owner reply coverage...' },
      { label: 'Computing ranking potential', desc: 'Calculating final 0–100 score & prioritized uplift plan...' },
    ];

    return (
      <div className="gbp-audit-page">
        <div className="gbp-page-header">
          <div>
            <h1>Business Health Audit</h1>
            <p className="page-subtitle">Real-time local ranking and profile audit engine.</p>
          </div>
        </div>
        <div className="gbp-scanner">
          <div className="gbp-scanner__header">
            <div className="gbp-scanner__pulse" />
            <h2>Live Profile Scanner Active</h2>
          </div>
          <div className="gbp-scanner__steps">
            {steps.map((step, i) => {
              const done = scanStep > i;
              const active = scanStep === i;
              return (
                <div key={i} className={`gbp-scan-step ${done ? 'gbp-scan-step--done' : ''} ${active ? 'gbp-scan-step--active' : ''}`}>
                  <div className="gbp-scan-step__icon">
                    {done ? (
                      <span className="gbp-scan-step__check">✓</span>
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
            <p>Auditing Google Business Profile data in real-time. Results will appear automatically.</p>
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
        <div className="gbp-page-header">
          <div>
            <h1>Business Health Audit</h1>
            <p className="page-subtitle">Discover what helps and hurts your local search ranking.</p>
          </div>
        </div>
        <div className="gbp-empty-state">
          <div className="gbp-empty-state__icon">
            <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h2>No Profile Audit Yet</h2>
          <p>Run your automated Google Business Profile health check to discover ranking bottlenecks, review response gaps, and actionable point uplifts.</p>
          <button
            className="gbp-btn gbp-btn--primary"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            {refreshMutation.isPending ? 'Starting Audit...' : 'Analyze My Profile Now'}
          </button>
          {refreshMutation.isError && (
            <p style={{ color: '#DC5A5A', marginTop: 16, fontSize: 13, fontWeight: 700 }}>
              {(refreshMutation.error as Error)?.message || 'Failed to start audit.'}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Audit ready ─────────────────────────────────────────────────────────
  const { healthScore, projectedScore, auditDetails, actionItems, scoreHistory } = audit;
  const toneProfile = toneData?.profile ?? null;
  const { grade, variant } = getHealthGrade(healthScore);

  const criticalCount = actionItems.filter((a) => a.severity === 'critical').length;
  const warningCount = actionItems.filter((a) => a.severity === 'warning').length;
  const infoCount = actionItems.filter((a) => a.severity === 'info').length;

  // Derived Profile Completeness KPI
  const completenessChecks = [
    Boolean(auditDetails.hasWebsite),
    Boolean(auditDetails.hasPhone),
    Boolean(auditDetails.hasHours),
    Boolean(auditDetails.hasDescription),
    (auditDetails.photoCount ?? 0) >= 20,
  ];
  const passedChecksCount = completenessChecks.filter(Boolean).length;
  const completenessPct = Math.round((passedChecksCount / 5) * 100);

  // Unreplied Burden calculation
  const unrepliedCount = auditDetails.recentUnrepliedCount ?? 0;
  const unrepliedPct = Math.round((auditDetails.recentUnrepliedRatio ?? 0) * 100);

  return (
    <div className="gbp-audit-page">
      {/* Top Header */}
      <div className="gbp-page-header">
        <div>
          <h1>Business Health Audit</h1>
          <p className="page-subtitle">Your Google Business Profile optimization score, ranking metrics, and action plan.</p>
        </div>
        {isFrozen ? (
          <span className="gbp-plan-badge gbp-plan-badge--free">
            🔒 Free Plan Snapshot
          </span>
        ) : (
          <span className="gbp-plan-badge gbp-plan-badge--paid">
            ⚡ {plan.toUpperCase()} Plan
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
            <strong>One-Time Onboarding Audit Snapshot</strong>
            <p>
              This snapshot reflects your setup from {audit.lastScrapedAt ? timeAgo(audit.lastScrapedAt) : 'onboarding'}.
              Upgrade to track continuous health improvements, historical trajectory, and recurring auto-refreshes.
            </p>
          </div>
          <button className="gbp-btn gbp-btn--upgrade-sm" onClick={() => navigate('/billing')}>
            Upgrade Plan →
          </button>
        </div>
      )}

      {/* Stale data notice for paid accounts */}
      {!isFrozen && data?.stale && (
        <div className="gbp-stale-banner">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <span>Audit data is older than 14 days. Click "Refresh Audit" below to re-scan your Google listing.</span>
        </div>
      )}

      {/* Failed refresh notice with previous data */}
      {status === 'failed' && audit.lastError && (
        <div className="gbp-failed-banner">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <span>Last audit attempt failed: {audit.lastError}. Displaying previous verified audit.</span>
        </div>
      )}

      {/* Component 1: Score Hero Banner */}
      <div className={`gbp-score-hero gbp-score-hero--${variant}`}>
        <div className="gbp-score-hero__left">
          <div className="gbp-score-box">
            <AnimatedScore target={healthScore} />
            <span className="gbp-score-box__of">/ 100</span>
          </div>
          <div className="gbp-score-info">
            <div className="gbp-score-info__header">
              <h2>Reputation Health Score</h2>
              <span className="gbp-grade-badge">{grade}</span>
            </div>
            {projectedScore > healthScore && (
              <p className="gbp-score-info__projected">
                🎯 Target: ~{projectedScore}/100 (+{projectedScore - healthScore} pts uplift available below)
              </p>
            )}
            <p className="gbp-score-info__meta">
              Based on {auditDetails.reviewSampleSize ?? 20} recent reviews
              {audit.lastScrapedAt && ` · Scanned ${timeAgo(audit.lastScrapedAt)}`}
            </p>
          </div>
        </div>
        <div className="gbp-score-hero__right">
          {scoreHistory && scoreHistory.length >= 2 && <Sparkline data={scoreHistory} />}
        </div>
      </div>

      {/* Component 2: 4 Executive KPI Metric Cards */}
      <div className="gbp-kpi-grid">
        {/* KPI 1: Overall Health */}
        <div className="gbp-kpi-card gbp-kpi-card--mint" style={{ animationDelay: '50ms' }}>
          <div className="gbp-kpi-header">
            <span className="gbp-kpi-title">Health Score</span>
            <span className="gbp-kpi-badge">{grade}</span>
          </div>
          <div className="gbp-kpi-value-row">
            <span className="gbp-kpi-value">{healthScore}</span>
            <span className="gbp-kpi-subvalue">/ 100</span>
          </div>
          <p className="gbp-kpi-footer">
            {projectedScore > healthScore ? `+${projectedScore - healthScore} pts potential uplift` : 'Top-tier profile state'}
          </p>
        </div>

        {/* KPI 2: Profile Completeness */}
        <div className="gbp-kpi-card gbp-kpi-card--butter" style={{ animationDelay: '120ms' }}>
          <div className="gbp-kpi-header">
            <span className="gbp-kpi-title">Completeness</span>
            <span className="gbp-kpi-badge">{passedChecksCount}/5 Checks</span>
          </div>
          <div className="gbp-kpi-value-row">
            <span className="gbp-kpi-value">{completenessPct}%</span>
            <span className="gbp-kpi-subvalue">score</span>
          </div>
          <p className="gbp-kpi-footer">
            {passedChecksCount === 5 ? 'All profile assets complete' : `${5 - passedChecksCount} item(s) need attention`}
          </p>
        </div>

        {/* KPI 3: Review Strength */}
        <div className="gbp-kpi-card gbp-kpi-card--sky" style={{ animationDelay: '190ms' }}>
          <div className="gbp-kpi-header">
            <span className="gbp-kpi-title">Review Strength</span>
            <span className="gbp-kpi-badge">{auditDetails.avgRating >= 4.5 ? 'STRONG' : 'IMPROVE'}</span>
          </div>
          <div className="gbp-kpi-value-row">
            <span className="gbp-kpi-value">{auditDetails.avgRating ? auditDetails.avgRating.toFixed(1) : '—'}</span>
            <span className="gbp-kpi-subvalue">⭐ ({auditDetails.totalReviews ?? 0} reviews)</span>
          </div>
          <p className="gbp-kpi-footer">
            ~{auditDetails.estimatedReviewVelocity30d ?? 0} new reviews/month
          </p>
        </div>

        {/* KPI 4: Unreplied Burden */}
        <div className="gbp-kpi-card gbp-kpi-card--coral" style={{ animationDelay: '260ms' }}>
          <div className="gbp-kpi-header">
            <span className="gbp-kpi-title">Unreplied Gap</span>
            <span className="gbp-kpi-badge">{unrepliedCount === 0 ? 'CAUGHT UP' : 'ATTENTION'}</span>
          </div>
          <div className="gbp-kpi-value-row">
            <span className="gbp-kpi-value">{unrepliedCount}</span>
            <span className="gbp-kpi-subvalue">unreplied ({unrepliedPct}%)</span>
          </div>
          <p className="gbp-kpi-footer">
            {unrepliedCount === 0 ? 'Zero unaddressed feedback' : 'Impacts local search ranking'}
          </p>
        </div>
      </div>

      {/* Component 3: Priority Action Punch-List */}
      <div className="gbp-actions-card">
        <div className="gbp-actions-card__header">
          <div>
            <h3>🎯 Priority Action Punch-List ({actionItems.length} items to fix)</h3>
            <p className="gbp-actions-card__subtitle">
              Resolve these issues in order of urgency to boost your Google Maps ranking and customer conversion.
            </p>
          </div>
          <div className="gbp-findings-strip">
            {criticalCount > 0 && (
              <div className="gbp-finding-pill gbp-finding-pill--critical">
                <span className="gbp-finding-dot" />
                <span>{criticalCount} Critical</span>
              </div>
            )}
            {warningCount > 0 && (
              <div className="gbp-finding-pill gbp-finding-pill--warning">
                <span className="gbp-finding-dot" />
                <span>{warningCount} Growth Opps</span>
              </div>
            )}
            {infoCount > 0 && (
              <div className="gbp-finding-pill gbp-finding-pill--info">
                <span className="gbp-finding-dot" />
                <span>{infoCount} Tips</span>
              </div>
            )}
          </div>
        </div>

        {actionItems.length === 0 ? (
          <div className="gbp-actions-empty">
            <h4>🎉 All Clear! Your Google Business Profile is in Peak Health</h4>
            <p>No critical action items detected. Keep accumulating positive reviews and replying actively.</p>
          </div>
        ) : (
          <div className="gbp-actions-list">
            {actionItems.map((item, i) => (
              <ActionItem key={i} item={item} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Component 4: Detailed Health Diagnostics (2-Column Grid) */}
      <div className="gbp-health-section-wrapper">
        <h3 className="gbp-section-heading">🔍 Detailed Health Diagnostics</h3>
        <div className="gbp-health-grid">
          <ProfileHealthSection details={auditDetails} />
          <ReviewStrengthSection details={auditDetails} />
        </div>
      </div>

      {/* Component 5: Review Intelligence & Customer Voice */}
      {toneProfile && (
        <div className="gbp-intel-wrapper">
          <ReviewIntelligenceSection profile={toneProfile} />
        </div>
      )}

      {/* Free Tier Upgrade Banner */}
      {isFrozen && (
        <div className="gbp-upgrade-card">
          <span className="gbp-upgrade-badge">PRO REPUTATION ACCELERATOR</span>
          <h3>Keep Your Google Ranking Optimized 24/7</h3>
          <p>
            Unlock recurring automated audit refreshes, score trajectory charts, and AI review intelligence to continuously outrank local competitors.
          </p>
          <ul className="gbp-upgrade-features">
            <li>✓ Automated weekly & monthly profile health audits</li>
            <li>✓ Full historical score trajectory & ranking tracking</li>
            <li>✓ AI Customer Tone, keyword & entity extraction</li>
            <li>✓ Direct AI reply generation inside Inbox</li>
          </ul>
          <button className="gbp-btn gbp-btn--upgrade" onClick={() => navigate('/billing')}>
            Explore Plans & Upgrade →
          </button>
        </div>
      )}

      {/* Footer Refresh Action */}
      <div className="gbp-refresh-footer">
        {isFrozen ? (
          <div>
            <button
              className="gbp-btn gbp-btn--secondary"
              onClick={() => navigate('/billing')}
            >
              <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              Upgrade to Re-Scan Audit
            </button>
            <p>Free plan accounts receive 1 initial audit snapshot. Upgrade to enable on-demand refreshes.</p>
          </div>
        ) : (
          <div>
            <button
              className="gbp-btn gbp-btn--secondary"
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
            >
              <svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
              {refreshMutation.isPending ? 'Analyzing Profile...' : 'Refresh Audit Now'}
            </button>
            {refreshMutation.isError && (
              <p style={{ color: '#DC5A5A', fontWeight: 700 }}>
                {(refreshMutation.error as Error)?.message || 'Failed to start refresh.'}
              </p>
            )}
            {!refreshMutation.isError && audit.lastScrapedAt && entitlements && (
              <p>
                Refresh interval: Every {entitlements.refreshCooldownDays} day{entitlements.refreshCooldownDays !== 1 ? 's' : ''} ({plan} plan)
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
