import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  useBilling,
  loadRazorpayScript,
  type PlanDefinition,
  type RazorpaySubscriptionCheckoutResponse,
  useCreateSubscription,
  useCancelSubscription,
  useChangePlan,
  useReconcileSubscription,
  useVerifySubscription,
} from '../lib/useBilling';

// ─── Constants ───────────────────────────────────────────────────────────────
const PLAN_FEATURES: Record<string, string[]> = {
  free: ['1 Location', 'Unlimited QR scans', 'AI review generation', 'Basic analytics', 'Email support'],
  starter: [
    '1 Location',
    'Unlimited QR scans',
    'AI review generation',
    '1,000 WhatsApp msgs/mo',
    'Campaign management',
    'Advanced analytics',
    'Priority support',
  ],
  professional: [
    'Up to 5 Locations',
    'Unlimited QR scans',
    'AI review generation',
    '2,000 WhatsApp msgs/mo',
    'Campaign management',
    'Advanced analytics & insights',
    'Priority email & chat support',
    'Custom branding',
  ],
  enterprise: [
    'Unlimited locations',
    'Unlimited QR scans',
    'AI review generation',
    'Unlimited WhatsApp msgs',
    'Campaign management',
    'Custom analytics & reporting',
    'Dedicated account manager',
    'White-label options',
    'API access',
  ],
};

const PLAN_ORDER = ['free', 'starter', 'professional', 'enterprise'];

const PLAN_POSITIONING: Record<string, string> = {
  free: 'For businesses trying out ReviewBoost.',
  starter: 'For small businesses collecting reviews regularly.',
  professional: 'For growing multi-location businesses.',
  enterprise: 'For organizations requiring scale, customization and dedicated support.',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatAmount(paise: number) {
  if (!paise) return '—';
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SubscriptionStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  let badgeClass = 'rb-badge';
  let label = status;

  if (normalized === 'active') {
    badgeClass += ' rb-badge--active';
    label = 'Active';
  } else if (normalized === 'trialing') {
    badgeClass += ' rb-badge--trialing';
    label = 'Trial';
  } else if (normalized === 'pending') {
    badgeClass += ' rb-badge--pending';
    label = 'Payment pending';
  } else if (normalized === 'authenticated') {
    badgeClass += ' rb-badge--trialing';
    label = 'Authorised';
  } else if (normalized === 'past_due') {
    badgeClass += ' rb-badge--past_due';
    label = 'Payment issue';
  } else if (normalized === 'cancel_at_period_end') {
    badgeClass += ' rb-badge--cancel_at_period_end';
    label = 'Cancels at Period End';
  } else if (normalized === 'cancelled') {
    badgeClass += ' rb-badge--cancelled';
    label = 'Cancelled';
  } else if (normalized === 'expired') {
    badgeClass += ' rb-badge--expired';
    label = 'Expired';
  }

  return (
    <span className={badgeClass}>
      {label}
    </span>
  );
}

function UsageMeter({ used, quota, planId }: { used: number; quota: number; planId: string }) {
  const isUnlimited = planId === 'enterprise' || quota === Infinity || !quota;
  
  if (isUnlimited) {
    return (
      <div className="rb-usage-meter">
        <div className="rb-usage-meter__header">
          <span className="rb-usage-meter__label">WhatsApp messages</span>
          <span className="rb-usage-meter__values">Unlimited</span>
        </div>
        <div className="rb-usage-meter__track">
          <div className="rb-usage-meter__fill rb-usage--normal" style={{ width: '100%' }} />
        </div>
        <p className="rb-usage-meter__footer">No message limits apply to your plan</p>
      </div>
    );
  }

  const pct = Math.min((used / quota) * 100, 100);
  const remaining = Math.max(quota - used, 0);

  let stateClass = 'rb-usage--normal';
  let warningMessage = '';

  if (pct >= 100) {
    stateClass = 'rb-usage--danger';
    warningMessage = 'Limit reached. Upgrade your plan to send more WhatsApp review requests.';
  } else if (pct >= 90) {
    stateClass = 'rb-usage--warning';
    warningMessage = 'Almost exhausted. Consider upgrading to Professional to avoid interruption.';
  } else if (pct >= 70) {
    stateClass = 'rb-usage--approaching';
    warningMessage = "You're approaching your monthly message limit.";
  }

  return (
    <div className="rb-usage-meter">
      <div className="rb-usage-meter__header">
        <span className="rb-usage-meter__label">WhatsApp messages</span>
        <span className="rb-usage-meter__values">{used.toLocaleString()} / {quota.toLocaleString()}</span>
      </div>
      <div className="rb-usage-meter__track">
        <div className={`rb-usage-meter__fill ${stateClass}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="rb-usage-meter__footer" style={{ color: pct >= 90 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
        {pct >= 70 ? warningMessage : `${remaining.toLocaleString()} messages remaining`}
      </p>
    </div>
  );
}

// ─── Upgrade modal / checkout ──────────────────────────────────────────────
async function initiateCheckout(
  planId: string, 
  onSuccess: (response: RazorpaySubscriptionCheckoutResponse) => Promise<void>,
  setCheckoutLoading: (v: boolean) => void, 
  setCheckoutError: (v: string | null) => void,
  createSubscription: (planId: string) => Promise<any>
) {
  setCheckoutLoading(true);
  setCheckoutError(null);
  try {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setCheckoutError('Failed to load Razorpay. Check your internet connection.');
      setCheckoutLoading(false);
      return;
    }

    const { subscriptionId, razorpayKeyId, planName } = await createSubscription(planId);

    const options = {
      key: razorpayKeyId,
      subscription_id: subscriptionId,
      name: 'ReviewBooster',
      description: `${planName} Plan — Monthly`,
      image: '/favicon.ico',
      handler: async (response: RazorpaySubscriptionCheckoutResponse) => {
        try {
          await onSuccess(response);
        } catch (error) {
          setCheckoutError(
            error instanceof Error
              ? error.message
              : 'Payment verification failed.',
          );
        } finally {
          setCheckoutLoading(false);
        }
      },
      prefill: {},
      theme: { color: '#3F7D45' },
      modal: {
        ondismiss: () => {
          setCheckoutLoading(false);
        },
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  } catch (err: any) {
    setCheckoutError(err.message || 'Checkout failed. Please try again.');
    setCheckoutLoading(false);
  }
}

// ─── Plan card ─────────────────────────────────────────────────────────────
function PlanCard({
  plan,
  isCurrent,
  onUpgrade,
  checkoutLoading,
}: {
  plan: PlanDefinition;
  isCurrent: boolean;
  onUpgrade: (planId: string) => void;
  checkoutLoading: string | null;
}) {
  const isPopular = plan.id === 'professional';
  const isEnterprise = plan.id === 'enterprise';
  const isFree = plan.id === 'free';
  const features = PLAN_FEATURES[plan.id] || [];

  return (
    <div className={`rb-plan-card${isPopular ? ' rb-plan-card--recommended' : ''}${isCurrent ? ' rb-plan-card--current' : ''}`}>
      {isPopular && (
        <div className="rb-plan-card__badge rb-plan-card__badge--recommended">
          Recommended
        </div>
      )}
      {isCurrent && (
        <div className="rb-plan-card__badge rb-plan-card__badge--current">
          Current Plan
        </div>
      )}

      <h3 className="rb-plan-card__name">
        {plan.displayName}
      </h3>
      
      <p className="rb-plan-card__desc">
        {PLAN_POSITIONING[plan.id] || ''}
      </p>

      <div className="rb-plan-card__price-box">
        {isEnterprise ? (
          <span className="rb-plan-card__price">Custom</span>
        ) : (
          <>
            <span className="rb-plan-card__price">
              {plan.priceInr === 0 ? 'Free' : `₹${plan.priceInr?.toLocaleString('en-IN')}`}
            </span>
            {plan.priceInr !== 0 && <span className="rb-plan-card__interval">/month</span>}
          </>
        )}
      </div>

      <ul className="rb-plan-card__features">
        {features.map((f) => (
          <li key={f} className="rb-plan-card__feature">
            <span className="rb-plan-card__feature-check">✓</span>
            {f}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <button disabled className="rb-btn rb-btn--secondary" style={{ width: '100%' }}>
          Current Plan
        </button>
      ) : isFree ? null : isEnterprise ? (
        <a
          href="mailto:support@reviewboost.app?subject=Enterprise%20Plan%20Inquiry"
          className="rb-btn rb-btn--primary"
          style={{ width: '100%', textDecoration: 'none', color: '#ffffff' }}
        >
          Contact Sales
        </a>
      ) : !plan.checkoutAvailable ? (
        <button
          disabled
          className="rb-btn rb-btn--secondary"
          style={{ width: '100%' }}
        >
          Coming Soon
        </button>
      ) : (
        <button
          onClick={() => onUpgrade(plan.id)}
          disabled={checkoutLoading === plan.id}
          className="rb-btn rb-btn--primary"
          style={{ width: '100%' }}
        >
          {checkoutLoading === plan.id
            ? 'Opening checkout…'
            : `Upgrade to ${plan.displayName}`}
        </button>
      )}
    </div>
  );
}

// ─── Loading Skeletons ───────────────────────────────────────────────────────
function BillingSkeleton() {
  return (
    <div className="rb-billing-page">
      <div className="rb-billing-header">
        <div>
          <div className="rb-skeleton" style={{ width: '150px', height: '28px', marginBottom: '8px', borderRadius: '4px' }} />
          <div className="rb-skeleton" style={{ width: '280px', height: '16px', borderRadius: '4px' }} />
        </div>
      </div>

      {/* Subscription Card Skeleton */}
      <div className="rb-sub-card">
        <div className="rb-sub-card__top">
          <div className="rb-sub-card__main" style={{ flex: '1 1 300px' }}>
            <div className="rb-skeleton" style={{ width: '90px', height: '14px', marginBottom: '8px', borderRadius: '4px' }} />
            <div className="rb-skeleton" style={{ width: '180px', height: '24px', marginBottom: '12px', borderRadius: '4px' }} />
            <div className="rb-skeleton" style={{ width: '250px', height: '16px', marginBottom: '24px', borderRadius: '4px' }} />
            
            <div className="rb-skeleton" style={{ width: '120px', height: '14px', marginBottom: '8px', borderRadius: '4px' }} />
            <div className="rb-skeleton" style={{ width: '100%', height: '8px', marginBottom: '8px', borderRadius: '4px' }} />
            <div className="rb-skeleton" style={{ width: '150px', height: '12px', borderRadius: '4px' }} />
          </div>
          <div className="rb-skeleton" style={{ width: '320px', height: '100px', borderRadius: '8px' }} />
        </div>
      </div>

      {/* Plans Skeleton */}
      <div className="rb-plans-section">
        <div className="rb-skeleton" style={{ width: '120px', height: '20px', marginBottom: '8px', borderRadius: '4px' }} />
        <div className="rb-skeleton" style={{ width: '340px', height: '14px', marginBottom: '24px', borderRadius: '4px' }} />
        <div className="rb-plans-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="rb-plan-card">
              <div className="rb-skeleton" style={{ width: '100px', height: '22px', marginBottom: '8px', borderRadius: '4px' }} />
              <div className="rb-skeleton" style={{ width: '100%', height: '40px', marginBottom: '16px', borderRadius: '4px' }} />
              <div className="rb-skeleton" style={{ width: '80px', height: '32px', marginBottom: '24px', borderRadius: '4px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {[1, 2, 3, 4].map(j => (
                  <div key={j} className="rb-skeleton" style={{ width: '100%', height: '14px', borderRadius: '4px' }} />
                ))}
              </div>
              <div className="rb-skeleton" style={{ width: '100%', height: '38px', borderRadius: '8px' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function BillingPage() {
  const { subscription, plans, isLoading, error: subError, refetch } = useBilling();
  const createSubMut = useCreateSubscription();
  const verifySubMut = useVerifySubscription();
  const reconcileSubMut = useReconcileSubscription();
  const changePlanMut = useChangePlan();
  const cancelSubMut = useCancelSubscription();
  
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);

  // Click outside to close actions menu dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        dropdownButtonRef.current && 
        !dropdownButtonRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard Escape listener to close popovers/modals
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowDropdown(false);
        setShowCancelModal(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleUpgrade = async (planId: string) => {
    setCheckoutLoading(planId);
    setCheckoutError(null);

    if (
      subscription?.plan !== 'free' &&
      subscription?.razorpaySubscriptionId
    ) {
      try {
        const result = await changePlanMut.mutateAsync(planId);
        setSuccessMsg(result.message);
        await refetch();
      } catch (error) {
        setCheckoutError(
          error instanceof Error ? error.message : 'Failed to change plan.',
        );
      } finally {
        setCheckoutLoading(null);
      }
      return;
    }

    await initiateCheckout(
      planId,
      async (response) => {
        const verification = await verifySubMut.mutateAsync(response);
        setSuccessMsg(
          verification.status === 'pending'
            ? 'Payment received. Razorpay is still activating the subscription.'
            : 'Subscription payment verified and plan activated.',
        );
        await refetch();
        if (verification.status === 'pending') {
          setTimeout(async () => {
            try {
              await reconcileSubMut.mutateAsync();
              await refetch();
            } catch {
              // The scheduled server reconciliation will repair delayed state.
            }
          }, 2500);
        }
      },
      (v) => { if (!v) setCheckoutLoading(null); },
      setCheckoutError,
      (id) => createSubMut.mutateAsync(id)
    );
  };

  const handleCancel = async () => {
    setCancelLoading(true);
    setCancelError(null);
    try {
      await cancelSubMut.mutateAsync();
      setShowCancelModal(false);
      setSuccessMsg('Subscription cancelled. Access continues until the current period ends.');
      await refetch();
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleReconcile = async () => {
    setShowDropdown(false);
    try {
      await reconcileSubMut.mutateAsync();
      setSuccessMsg('Payment status updated successfully.');
      await refetch();
    } catch (err: any) {
      setCheckoutError(err.message || 'Verification check failed.');
    }
  };

  const sortedPlans = useMemo(() => {
    return [...plans].sort(
      (a, b) => PLAN_ORDER.indexOf(a.id) - PLAN_ORDER.indexOf(b.id)
    );
  }, [plans]);

  if (isLoading) {
    return <BillingSkeleton />;
  }

  if (subError) {
    return (
      <div className="rb-billing-page">
        <div className="rb-billing-header">
          <div>
            <h1 className="rb-billing-header__title">Plan &amp; Billing</h1>
            <p className="rb-billing-header__subtitle">Manage your subscription and billing</p>
          </div>
        </div>
        <div className="rb-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <h3 className="rb-dialog__title" style={{ marginBottom: '0.5rem' }}>Unable to load billing information</h3>
          <p className="rb-billing-header__subtitle" style={{ marginBottom: '1.5rem' }}>We couldn't retrieve your subscription details right now.</p>
          <button className="rb-btn rb-btn--primary" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const currentPlan = subscription?.plan || 'free';
  const planStatus = subscription?.planStatus || 'active';
  const invoices = subscription?.invoices || [];
  const currentPlanDef = sortedPlans.find(p => p.id === currentPlan);

  return (
    <div className="rb-billing-page animate-fade-in">
      {/* ─── Header ─── */}
      <div className="rb-billing-header">
        <div>
          <h1 className="rb-billing-header__title">Plan &amp; Billing</h1>
          <p className="rb-billing-header__subtitle">Manage your subscription, usage and billing.</p>
        </div>
      </div>

      {/* ─── Toast messages ─── */}
      {successMsg && (
        <div style={{
          marginBottom: '1.5rem', padding: '0.75rem 1rem', borderRadius: '8px',
          background: '#E9F2E7', border: '1px solid rgba(63,125,69,0.2)', color: '#3F7D45',
          fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3F7D45', fontSize: '1rem', fontWeight: 600 }}>✕</button>
        </div>
      )}

      {checkoutError && (
        <div style={{
          marginBottom: '1.5rem', padding: '0.75rem 1rem', borderRadius: '8px',
          background: '#FEE2E2', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626',
          fontWeight: 500, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>{checkoutError}</span>
          <button onClick={() => setCheckoutError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: '1rem', fontWeight: 600 }}>✕</button>
        </div>
      )}

      {/* ─── Current Plan Card ─── */}
      <div className="rb-sub-card">
        <div className="rb-sub-card__top">
          <div className="rb-sub-card__main">
            <div className="rb-sub-card__eyebrow">Current Plan</div>
            <div className="rb-sub-card__title-row">
              <h2 className="rb-sub-card__title">
                {currentPlanDef?.displayName || 'Free'}
              </h2>
              <SubscriptionStatusBadge status={planStatus} />
            </div>

            <div className="rb-sub-card__price">
              {currentPlanDef?.priceInr === 0 ? 'Free' : `₹${currentPlanDef?.priceInr?.toLocaleString('en-IN')}`}
              {currentPlanDef?.priceInr !== 0 && <span> / month</span>}
            </div>

            {subscription?.planCurrentPeriodEnd && (
              <p className="rb-sub-card__date">
                {subscription.cancelAtPeriodEnd ? 'Access until' : 'Renews on'}{' '}
                <strong>{formatDate(subscription.planCurrentPeriodEnd)}</strong>
              </p>
            )}

            {subscription?.pendingPlan && subscription.pendingPlan !== currentPlan && (
              <p style={{ fontSize: '0.8125rem', color: '#B45309', margin: '0.5rem 0 0', fontWeight: 500 }}>
                Scheduled change to <span style={{ textTransform: 'capitalize' }}>{subscription.pendingPlan}</span> at the next billing cycle.
              </p>
            )}

            {currentPlan === 'free' && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0.5rem 0 0', lineHeight: 1.5 }}>
                You're on the free pilot plan. Upgrade to unlock automated WhatsApp campaigns, priority support, and advanced reviews insights.
              </p>
            )}
          </div>

          {/* Inline action button */}
          {subscription?.razorpaySubscriptionId && (
            <div className="rb-sub-actions">
              <div className="rb-dropdown-container">
                <button
                  ref={dropdownButtonRef}
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="rb-btn rb-btn--secondary"
                  aria-haspopup="true"
                  aria-expanded={showDropdown}
                  aria-label="Subscription Settings"
                >
                  <span>Manage</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>

                {showDropdown && (
                  <div ref={dropdownRef} className="rb-dropdown-menu" role="menu">
                    <button
                      onClick={handleReconcile}
                      disabled={reconcileSubMut.isPending}
                      className="rb-dropdown-item"
                      role="menuitem"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                      </svg>
                      <span>{reconcileSubMut.isPending ? 'Refreshing…' : 'Refresh payment status'}</span>
                    </button>
                    {currentPlan !== 'free' && planStatus === 'active' && (
                      <>
                        <div className="rb-dropdown-divider" />
                        <button
                          onClick={() => { setShowDropdown(false); setShowCancelModal(true); }}
                          className="rb-dropdown-item rb-dropdown-item--danger"
                          role="menuitem"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>
                          </svg>
                          <span>Cancel Subscription</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom section: stat tiles + usage meter */}
        <div className="rb-sub-card__bottom">
          <div className="rb-stat-tiles">
            <div className="rb-stat-tile">
              <div className="rb-stat-tile__icon rb-stat-tile__icon--locations">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div className="rb-stat-tile__text">
                <span className="rb-stat-tile__label">Locations</span>
                <span className="rb-stat-tile__value">
                  {currentPlanDef?.entitlements.maxLocations === Infinity ? '∞' : (currentPlanDef?.entitlements.maxLocations ?? 1)}
                </span>
              </div>
            </div>

            <div className="rb-stat-tile">
              <div className="rb-stat-tile__icon rb-stat-tile__icon--campaigns">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7z"/>
                </svg>
              </div>
              <div className="rb-stat-tile__text">
                <span className="rb-stat-tile__label">Campaigns</span>
                <span className="rb-stat-tile__value">
                  {currentPlanDef?.entitlements.campaigns ? 'Included' : 'Locked'}
                </span>
              </div>
            </div>

            <div className="rb-stat-tile">
              <div className="rb-stat-tile__icon rb-stat-tile__icon--quota">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div className="rb-stat-tile__text">
                <span className="rb-stat-tile__label">WhatsApp Quota</span>
                <span className="rb-stat-tile__value">
                  {currentPlan === 'free' ? '—' : (subscription?.whatsappMsgQuota || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="rb-stat-tile">
              <div className="rb-stat-tile__icon rb-stat-tile__icon--billing">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </div>
              <div className="rb-stat-tile__text">
                <span className="rb-stat-tile__label">Billing</span>
                <span className="rb-stat-tile__value">
                  {currentPlanDef?.billing || 'Monthly'}
                </span>
              </div>
            </div>
          </div>

          {/* Usage meter — full width */}
          {subscription && currentPlan !== 'free' && (
            <UsageMeter used={subscription.whatsappMsgUsed} quota={subscription.whatsappMsgQuota} planId={currentPlan} />
          )}
        </div>
      </div>

      {/* ─── Available Plans ─── */}
      <div className="rb-plans-section">
        <div className="rb-plans-section__header">
          <h2 className="rb-plans-section__title">Available plans</h2>
          <p className="rb-plans-section__subtitle">
            Choose the plan that fits your review volume and business needs.
          </p>
        </div>

        <div className="rb-plans-grid">
          {sortedPlans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={plan.id === currentPlan}
              onUpgrade={handleUpgrade}
              checkoutLoading={checkoutLoading}
            />
          ))}
        </div>
      </div>

      {/* ─── Expandable Comparison Matrix ─── */}
      <div className="rb-compare-toggle-box">
        <button className="rb-compare-btn" onClick={() => setShowComparison(!showComparison)}>
          <span>{showComparison ? 'Hide detailed comparison' : 'Compare all features'}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showComparison ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>
      </div>

      {showComparison && (
        <div className="rb-comparison-section">
          <h3 className="rb-dialog__title" style={{ marginBottom: '1.25rem' }}>Plan feature matrix</h3>
          <div className="rb-comparison-table-wrap">
            <table className="rb-comparison-table">
              <thead>
                <tr>
                  <th>Features</th>
                  <th>Free</th>
                  <th>Starter</th>
                  <th>Professional</th>
                  <th>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="rb-comparison-table__feature-name">Locations</td>
                  <td>1</td>
                  <td>1</td>
                  <td>Up to 5</td>
                  <td>Unlimited</td>
                </tr>
                <tr>
                  <td className="rb-comparison-table__feature-name">WhatsApp messages</td>
                  <td>—</td>
                  <td>1,000 / month</td>
                  <td>2,000 / month</td>
                  <td>Unlimited</td>
                </tr>
                <tr>
                  <td className="rb-comparison-table__feature-name">QR scans</td>
                  <td>Unlimited</td>
                  <td>Unlimited</td>
                  <td>Unlimited</td>
                  <td>Unlimited</td>
                </tr>
                <tr>
                  <td className="rb-comparison-table__feature-name">Campaign management</td>
                  <td>—</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td className="rb-comparison-table__feature-name">Advanced analytics</td>
                  <td>—</td>
                  <td>✓</td>
                  <td>✓ (With Insights)</td>
                  <td>Custom &amp; API</td>
                </tr>
                <tr>
                  <td className="rb-comparison-table__feature-name">Branding</td>
                  <td>ReviewBoost Logo</td>
                  <td>ReviewBoost Logo</td>
                  <td>Custom Branding</td>
                  <td>White-label option</td>
                </tr>
                <tr>
                  <td className="rb-comparison-table__feature-name">Support</td>
                  <td>Email support</td>
                  <td>Priority support</td>
                  <td>Priority email &amp; chat</td>
                  <td>Dedicated account manager</td>
                </tr>
                <tr>
                  <td className="rb-comparison-table__feature-name">API access</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                  <td>✓ Included</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Billing management & Invoices block ─── */}
      <div className="rb-billing-management">
        {/* Payment History */}
        {invoices.length > 0 && (
          <div className="rb-invoices-section">
            <h3 className="rb-dialog__title" style={{ marginBottom: '1.25rem' }}>Payment History</h3>
            <div className="rb-invoices-table-wrap">
              <table className="rb-invoices-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Period End</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv._id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(inv.paidAt || inv.createdAt)}</td>
                      <td style={{ textTransform: 'capitalize' }}>{inv.plan}</td>
                      <td style={{ fontWeight: 600 }}>{formatAmount(inv.amountPaidPaise)}</td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>{formatDate(inv.currentPeriodEnd)}</td>
                      <td>
                        <SubscriptionStatusBadge status={inv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Support Section */}
        <div className="rb-support-card" style={{ gridColumn: invoices.length > 0 ? 'span 1' : 'span 2' }}>
          <div className="rb-support-card__content">
            <h4 className="rb-support-card__title">Need help with billing?</h4>
            <p className="rb-support-card__desc">Questions about your subscription, invoices, or custom plan?</p>
          </div>
          <a
            href="mailto:billing@reviewbooster.in?subject=Billing%20Inquiry"
            className="rb-btn rb-btn--primary"
            style={{ textDecoration: 'none', color: '#ffffff', flexShrink: 0 }}
          >
            Contact Support
          </a>
        </div>
      </div>

      {/* ─── Legal & Compliance Terms Notice ─── */}
      <div style={{ textAlign: 'center', margin: '2rem 0 1rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
        All subscriptions are processed securely by Razorpay and protected by our 7-day money-back guarantee.
        <br />
        By subscribing, you agree to our{' '}
        <Link to="/terms" style={{ color: 'var(--color-brand)', textDecoration: 'underline' }}>Terms of Service</Link>
        {', '}
        <Link to="/refund" style={{ color: 'var(--color-brand)', textDecoration: 'underline' }}>Refund Policy</Link>
        {', and '}
        <Link to="/privacy" style={{ color: 'var(--color-brand)', textDecoration: 'underline' }}>Privacy Policy</Link>.
      </div>

      {/* ─── Cancel confirmation modal ─── */}
      {showCancelModal && (
        <div className="rb-dialog-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="rb-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="cancel-dialog-title">
            <h3 id="cancel-dialog-title" className="rb-dialog__title">
              Cancel Subscription?
            </h3>
            <p className="rb-dialog__desc">
              Your subscription will remain active until the current billing period ends (<strong>{subscription?.planCurrentPeriodEnd ? formatDate(subscription.planCurrentPeriodEnd) : ''}</strong>). After that, your campaigns will pause and the account will revert to the free plan.
            </p>
            {cancelError && (
              <p style={{ fontSize: '0.8125rem', color: '#DC2626', marginBottom: '1rem', fontWeight: 500 }}>{cancelError}</p>
            )}
            <div className="rb-dialog__actions">
              <button
                onClick={() => { setShowCancelModal(false); setCancelError(null); }}
                disabled={cancelLoading}
                className="rb-btn rb-btn--secondary"
              >
                Keep Plan
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelLoading}
                className="rb-btn rb-btn--danger"
              >
                {cancelLoading ? 'Cancelling…' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
