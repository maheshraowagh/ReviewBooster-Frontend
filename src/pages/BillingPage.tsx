import { useState } from 'react';
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

// ─── Plan feature lists for display ────────────────────────────────────────
const PLAN_FEATURES: Record<string, string[]> = {
  free: ['1 Location', 'Unlimited QR scans', 'AI review generation', 'Basic analytics', 'Email support'],
  starter: [
    '1 Location',
    'Unlimited QR scans',
    'AI review generation',
    '500 WhatsApp msgs/mo',
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

// ─── Status badge ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: '#E9F2E7', color: '#3F7D45', label: 'Active' },
    trialing: { bg: '#EEF2FF', color: '#4F46E5', label: 'Trial' },
    pending: { bg: '#FEF3C7', color: '#D97706', label: 'Pending Payment' },
    authenticated: { bg: '#EEF2FF', color: '#4F46E5', label: 'Authorised' },
    past_due: { bg: '#FEF3C7', color: '#D97706', label: 'Past Due' },
    cancel_at_period_end: { bg: '#FEF3C7', color: '#B45309', label: 'Cancels at Period End' },
    cancelled: { bg: '#FEE2E2', color: '#DC2626', label: 'Cancelled' },
    expired: { bg: '#F3F4F6', color: '#6B7280', label: 'Expired' },
  };
  const s = map[status] || map.active;
  return (
    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '99px', background: s.bg, color: s.color, fontSize: '0.75rem', fontWeight: 600 }}>
      {s.label}
    </span>
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  } catch (err: any) {
    setCheckoutError(err.message || 'Checkout failed. Please try again.');
    setCheckoutLoading(false);
  }
}

// ─── Quota progress bar ────────────────────────────────────────────────────
function QuotaBar({ used, quota }: { used: number; quota: number }) {
  if (!quota) return null;
  const pct = Math.min((used / quota) * 100, 100);
  const color = pct > 85 ? '#DC2626' : pct > 60 ? '#D97706' : '#3F7D45';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem', fontSize: '0.8125rem', color: '#6B6B63' }}>
        <span>WhatsApp messages</span>
        <span style={{ fontWeight: 600, color: '#1A1A1A' }}>{used.toLocaleString()} / {quota.toLocaleString()}</span>
      </div>
      <div style={{ height: '6px', borderRadius: '99px', background: '#E3E1D9', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: '99px', background: color, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
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
    <div style={{
      padding: '1.5rem',
      borderRadius: '12px',
      border: isPopular ? '2px solid #3F7D45' : '1px solid #E3E1D9',
      background: isCurrent ? '#F8FFF8' : '#FFFFFF',
      position: 'relative',
      transition: 'box-shadow 0.2s',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {isPopular && (
        <div style={{
          position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
          padding: '0.25rem 0.75rem', borderRadius: '99px', background: '#3F7D45',
          color: '#FFFFFF', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
        }}>Most Popular</div>
      )}
      {isCurrent && (
        <div style={{
          position: 'absolute', top: '-12px', right: '1rem',
          padding: '0.25rem 0.75rem', borderRadius: '99px', background: '#1A1A1A',
          color: '#FFFFFF', fontSize: '0.6875rem', fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>Current Plan</div>
      )}

      <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1A1A1A', marginBottom: '0.375rem' }}>
        {plan.displayName}
      </h3>

      <div style={{ marginBottom: '1.25rem' }}>
        {isEnterprise ? (
          <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1A1A1A' }}>Custom</span>
        ) : (
          <>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1A1A1A' }}>
              {plan.priceInr === 0 ? 'Free' : `₹${plan.priceInr?.toLocaleString('en-IN')}`}
            </span>
            {plan.priceInr !== 0 && <span style={{ fontSize: '0.875rem', color: '#6B6B63' }}>/month</span>}
          </>
        )}
      </div>

      <ul style={{ fontSize: '0.875rem', color: '#1A1A1A', lineHeight: 2, paddingLeft: '0', listStyle: 'none', margin: '0 0 1.5rem', flex: 1 }}>
        {features.map((f) => (
          <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#3F7D45', fontWeight: 700, flexShrink: 0 }}>✓</span>
            {f}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <button disabled style={{
          padding: '0.625rem 1rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600,
          background: '#E3E1D9', color: '#6B6B63', border: 'none', cursor: 'not-allowed',
        }}>
          Current Plan
        </button>
      ) : isFree ? null : isEnterprise ? (
        <a
          href="mailto:support@reviewboost.app?subject=Enterprise%20Plan%20Inquiry"
          style={{
            display: 'block', textAlign: 'center', padding: '0.625rem 1rem', borderRadius: '8px',
            fontSize: '0.875rem', fontWeight: 600, background: '#1A1A1A', color: '#FFFFFF',
            textDecoration: 'none',
          }}
        >
          Contact Sales
        </a>
      ) : (
        <button
          onClick={() => onUpgrade(plan.id)}
          disabled={checkoutLoading === plan.id || !plan.checkoutAvailable}
          style={{
            padding: '0.625rem 1rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600,
            background: isPopular ? '#3F7D45' : '#1A1A1A', color: '#FFFFFF', border: 'none',
            cursor: checkoutLoading === plan.id || !plan.checkoutAvailable ? 'not-allowed' : 'pointer',
            opacity: checkoutLoading === plan.id || !plan.checkoutAvailable ? 0.7 : 1, transition: 'opacity 0.2s',
          }}
        >
          {!plan.checkoutAvailable
            ? 'Payment setup pending'
            : checkoutLoading === plan.id
              ? 'Opening checkout…'
              : `Choose ${plan.name}`}
        </button>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function BillingPage() {
  const { subscription, plans, isLoading, refetch } = useBilling();
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
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel');
    } finally {
      setCancelLoading(false);
    }
  };

  const sortedPlans = [...plans].sort(
    (a, b) => PLAN_ORDER.indexOf(a.id) - PLAN_ORDER.indexOf(b.id)
  );

  if (isLoading) {
    return (
      <div className="db-page animate-fade-in">
        <div className="db-topbar">
          <div>
            <h1 className="db-title">Plan &amp; Billing</h1>
            <p className="db-subtitle">Manage your subscription and billing</p>
          </div>
        </div>
        <div className="db-card" style={{ textAlign: 'center', padding: '3rem', color: '#6B6B63' }}>
          Loading subscription details…
        </div>
      </div>
    );
  }

  const currentPlan = subscription?.plan || 'free';
  const planStatus = subscription?.planStatus || 'active';
  const invoices = subscription?.invoices || [];

  return (
    <div className="db-page animate-fade-in">
      {/* ── Topbar ── */}
      <div className="db-topbar">
        <div>
          <h1 className="db-title">Plan &amp; Billing</h1>
          <p className="db-subtitle">Manage your subscription and billing</p>
        </div>
      </div>

      {/* ── Toast messages ── */}
      {successMsg && (
        <div style={{
          marginBottom: '1.25rem', padding: '0.875rem 1.25rem', borderRadius: '8px',
          background: '#E9F2E7', border: '1px solid rgba(63,125,69,0.2)', color: '#3F7D45',
          fontWeight: 600, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3F7D45', fontSize: '1.125rem', lineHeight: 1 }}>✕</button>
        </div>
      )}

      {checkoutError && (
        <div style={{
          marginBottom: '1.25rem', padding: '0.875rem 1.25rem', borderRadius: '8px',
          background: '#FEE2E2', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626',
          fontWeight: 500, fontSize: '0.9375rem',
        }}>
          {checkoutError}
        </div>
      )}

      {/* ── Current Plan Banner ── */}
      <div className="db-card" style={{ background: 'linear-gradient(135deg, #E9F2E7 0%, #F2F0EA 100%)', border: '1px solid rgba(63,125,69,0.2)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
                {sortedPlans.find(p => p.id === currentPlan)?.displayName || 'Free'}
              </h2>
              <StatusBadge status={planStatus} />
            </div>

            {subscription?.planCurrentPeriodEnd && (
              <p style={{ fontSize: '0.875rem', color: '#6B6B63', margin: '0 0 1rem' }}>
                {subscription.cancelAtPeriodEnd ? 'Access until' : 'Renews on'}{' '}
                <strong style={{ color: '#1A1A1A' }}>{formatDate(subscription.planCurrentPeriodEnd)}</strong>
              </p>
            )}

            {subscription?.pendingPlan &&
              subscription.pendingPlan !== currentPlan && (
                <p style={{ fontSize: '0.82rem', color: '#B45309', margin: '0 0 1rem' }}>
                  Scheduled change to{' '}
                  <strong style={{ textTransform: 'capitalize' }}>
                    {subscription.pendingPlan}
                  </strong>{' '}
                  at the next billing cycle.
                </p>
              )}

            {currentPlan === 'free' && (
              <p style={{ fontSize: '0.9rem', color: '#6B6B63', margin: '0 0 1rem', lineHeight: 1.6 }}>
                You're on the free pilot plan. Upgrade to unlock WhatsApp campaigns and advanced analytics.
              </p>
            )}

            {/* Quota bar */}
            {subscription && currentPlan !== 'free' && (
              <div style={{ maxWidth: '400px' }}>
                <QuotaBar used={subscription.whatsappMsgUsed} quota={subscription.whatsappMsgQuota} />
              </div>
            )}
          </div>

          {/* Stat grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.75rem', padding: '1rem', borderRadius: '8px',
            background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(63,125,69,0.1)',
            flex: '0 0 auto', minWidth: '280px',
          }}>
            {[
              { label: 'Plan', value: sortedPlans.find(p => p.id === currentPlan)?.name || 'Free' },
              { label: 'Campaigns', value: sortedPlans.find(p => p.id === currentPlan)?.entitlements.campaigns ? '✓ Included' : '✗ Locked' },
              { label: 'WA Messages', value: currentPlan === 'free' ? '—' : (subscription?.whatsappMsgQuota || 0).toLocaleString() + '/mo' },
              { label: 'Locations', value: sortedPlans.find(p => p.id === currentPlan)?.entitlements.maxLocations === Infinity ? 'Unlimited' : (sortedPlans.find(p => p.id === currentPlan)?.entitlements.maxLocations ?? 1).toString() },
            ].map(stat => (
              <div key={stat.label}>
                <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#6B6B63', margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#1A1A1A', margin: 0 }}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription actions */}
        {subscription?.razorpaySubscriptionId && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(63,125,69,0.1)' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => reconcileSubMut.mutate()}
                disabled={reconcileSubMut.isPending}
                style={{
                  background: 'none', border: '1px solid #6B6B63', color: '#4B4B45',
                  padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.8125rem',
                  fontWeight: 600, cursor: reconcileSubMut.isPending ? 'wait' : 'pointer',
                }}
              >
                {reconcileSubMut.isPending ? 'Refreshing…' : 'Refresh payment status'}
              </button>
              {currentPlan !== 'free' && planStatus === 'active' && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  style={{
                    background: 'none', border: '1px solid #DC2626', color: '#DC2626',
                    padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.8125rem',
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Plan Cards ── */}
      <div className="db-card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="db-card-title">Upgrade Your Plan</h2>
        <p style={{ fontSize: '0.875rem', color: '#6B6B63', marginBottom: '1.5rem' }}>
          All plans include unlimited QR scans and AI review generation. WhatsApp campaign quotas reset on your monthly renewal date.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', alignItems: 'stretch' }}>
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

      {/* ── Payment History ── */}
      {invoices.length > 0 && (
        <div className="db-card" style={{ marginBottom: '1.5rem' }}>
          <h2 className="db-card-title">Payment History</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E3E1D9' }}>
                  {['Date', 'Plan', 'Amount', 'Period End', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.625rem 0.75rem', fontWeight: 600, color: '#6B6B63', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv._id} style={{ borderBottom: '1px solid #F2F0EA' }}>
                    <td style={{ padding: '0.75rem', color: '#1A1A1A', whiteSpace: 'nowrap' }}>{formatDate(inv.paidAt || inv.createdAt)}</td>
                    <td style={{ padding: '0.75rem', color: '#1A1A1A', textTransform: 'capitalize' }}>{inv.plan}</td>
                    <td style={{ padding: '0.75rem', color: '#1A1A1A', fontWeight: 600 }}>{formatAmount(inv.amountPaidPaise)}</td>
                    <td style={{ padding: '0.75rem', color: '#6B6B63', whiteSpace: 'nowrap' }}>{formatDate(inv.currentPeriodEnd)}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <StatusBadge status={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Contact ── */}
      <div className="db-card" style={{ textAlign: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1A1A1A', marginBottom: '0.5rem' }}>
          Questions about billing?
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#6B6B63', marginBottom: '1rem', maxWidth: '420px', margin: '0 auto 1rem' }}>
          Need a custom plan, GST invoice, or help with your subscription? We're here.
        </p>
        <a
          href="mailto:support@reviewboost.app?subject=Billing%20Inquiry"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 1.25rem', borderRadius: '8px', fontSize: '0.875rem',
            fontWeight: 600, color: '#FFFFFF', background: '#1A1A1A', textDecoration: 'none',
          }}
        >
          Contact Support
        </a>
      </div>

      {/* ── Cancel modal ── */}
      {showCancelModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '12px', padding: '2rem', maxWidth: '420px',
            width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1A1A1A', marginBottom: '0.75rem' }}>
              Cancel Subscription?
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#6B6B63', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Your plan will remain active until the current billing period ends. After that, your account will revert to the Free plan and WhatsApp campaigns will be disabled.
            </p>
            {cancelError && (
              <p style={{ fontSize: '0.875rem', color: '#DC2626', marginBottom: '1rem' }}>{cancelError}</p>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowCancelModal(false); setCancelError(null); }}
                disabled={cancelLoading}
                style={{ padding: '0.625rem 1.25rem', borderRadius: '8px', border: '1px solid #E3E1D9', background: '#FFFFFF', color: '#1A1A1A', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Keep Plan
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelLoading}
                style={{ padding: '0.625rem 1.25rem', borderRadius: '8px', border: 'none', background: '#DC2626', color: '#FFFFFF', fontWeight: 600, fontSize: '0.875rem', cursor: cancelLoading ? 'not-allowed' : 'pointer', opacity: cancelLoading ? 0.7 : 1 }}
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
