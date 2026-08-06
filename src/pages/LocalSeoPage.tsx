/**
 * LocalSeoPage — Google Business Profile Health Audit dashboard.
 *
 * Displays a health score (0-100), profile completeness checks,
 * review strength metrics, and gamified action items with projected uplift.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useGbpAudit, useRefreshGbpAudit } from '../hooks/queries/useGbpAudit';
import { useSocket } from '../providers/SocketProvider';
import { queryKeys } from '../lib/queryKeys';
import type { AuditDetails, AuditActionItem } from '../services/gbpAuditService';
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

  return (
    <div className="gbp-action-item">
      <div className={`gbp-action-item__severity gbp-action-item__severity--${item.severity}`} />
      <div className="gbp-action-item__content">
        <p className="gbp-action-item__title">{item.title}</p>
        <p className="gbp-action-item__desc">{item.description}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <span className="gbp-action-item__uplift">+{item.projectedUplift} pts</span>
        <button className="gbp-btn gbp-btn--secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={handleAction}>
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

// ── Main page ───────────────────────────────────────────────────────────────
export default function LocalSeoPage() {
  const { data, isLoading, error, refetch } = useGbpAudit();
  const refreshMutation = useRefreshGbpAudit();
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

  if (isLoading) {
    return (
      <div className="gbp-audit-page">
        <h1>GBP Health Audit</h1>
        <p className="page-subtitle">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gbp-audit-page">
        <h1>GBP Health Audit</h1>
        <div className="gbp-failed-banner">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <span>Failed to load audit data. Please try again.</span>
        </div>
      </div>
    );
  }

  const audit = data?.audit;
  const status = data?.status;

  // ── Processing state (either mutation inflight or DB status processing) ──────
  const isProcessing = refreshMutation.isPending || status === 'processing';

  if (isProcessing) {
    return (
      <div className="gbp-audit-page">
        <h1>GBP Health Audit</h1>
        <p className="page-subtitle">Analyzing your Google Business Profile...</p>
        <div className="gbp-processing">
          <div className="gbp-processing__spinner" />
          <h2>Analyzing Your Profile</h2>
          <p>Scraping your Google Business data and computing health score. This takes about 20 seconds.</p>
        </div>
      </div>
    );
  }

  // ── No audit exists yet ─────────────────────────────────────────────────
  if (status === 'none' || !audit) {
    return (
      <div className="gbp-audit-page">
        <h1>GBP Health Audit</h1>
        <p className="page-subtitle">Analyze your Google Business Profile and get actionable improvement tips.</p>
        <div className="gbp-empty-state">
          <div className="gbp-empty-state__icon">
            <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h2>No Audit Yet</h2>
          <p>Run your first Google Business Profile health analysis to discover what's helping — and hurting — your local search ranking.</p>
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

  return (
    <div className="gbp-audit-page">
      <h1>GBP Health Audit</h1>
      <p className="page-subtitle">Your Google Business Profile optimization score and action plan.</p>

      {/* Stale data warning */}
      {data?.stale && (
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
          <h2>GBP Health Score</h2>
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

      {/* Health grid */}
      <div className="gbp-health-grid">
        <ProfileHealthSection details={auditDetails} />
        <ReviewStrengthSection details={auditDetails} />
      </div>

      {/* Action items */}
      {actionItems.length > 0 && (
        <div className="gbp-actions-card">
          <h3>🎯 Actions to Improve</h3>
          {actionItems.map((item, i) => (
            <ActionItem key={i} item={item} />
          ))}
        </div>
      )}

      {/* Refresh button */}
      <div className="gbp-refresh-footer">
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
        {!refreshMutation.isError && audit.lastScrapedAt && (
          <p>Next refresh available in 7 days</p>
        )}
      </div>
    </div>
  );
}
