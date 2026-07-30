import { useMemo, useState } from 'react';
import { useHandleAtRiskCustomer } from '../hooks/queries/useInsights';
import type {
  AtRiskCustomer,
  AtRiskData,
} from '../services/insightsService';

const PAGE_SIZE = 4;

const RECOVERY_TIPS: Record<string, Record<string, string>> = {
  restaurant: {
    'Slow service':
      "Check kitchen-to-table time during peaks. A quick 'your order is being prepared' update reduces perceived wait.",
    'Tasteless food':
      "Have the chef taste-test today's batch and standardize seasoning measurements.",
    'Rude staff':
      'Name the behavior in the next team huddle and role-play a better greeting.',
    'Dirty tables':
      'Assign a visible table-clear rotation during rush hours.',
    Overpriced:
      'Consider a value combination or smaller portion option to improve perceived value.',
    'Small portions':
      'Review portion consistency and presentation before changing pricing.',
  },
  salon: {
    'Bad haircut': 'Offer a correction appointment within seven days.',
    'Long wait':
      "Send a 'running 10 minutes behind' WhatsApp update before the appointment.",
    'Rude staff':
      'Pair the stylist with a senior team member for the next few clients.',
    Overpriced:
      "Show a service breakdown so clients understand what's included.",
  },
  gym: {
    'Dirty equipment': 'Add a visible cleaning log near the equipment area.',
    Overcrowded: 'Share quiet hours and encourage off-peak visits.',
    'Rude staff': 'Reset front-desk greeting and member recognition standards.',
    'Poor maintenance':
      "Tag broken equipment with a repair status and expected return date.",
  },
  generic: {
    default:
      'Acknowledge the issue quickly, explain the corrective action, and record the follow-up.',
  },
};

function getTip(businessType: string, tags: string[]) {
  const typeTips = RECOVERY_TIPS[businessType] || RECOVERY_TIPS.generic;
  for (const tag of tags) {
    const match = Object.keys(typeTips).find((key) =>
      tag.toLowerCase().includes(key.toLowerCase()),
    );
    if (match) return typeTips[match];
  }
  return RECOVERY_TIPS.generic.default;
}

function severity(rating: number) {
  if (rating === 1) return { label: 'Critical', tone: 'critical' };
  if (rating === 2) return { label: 'Attention', tone: 'attention' };
  return { label: 'Watch', tone: 'watch' };
}

export default function AtRiskSection({
  atRiskData,
}: {
  atRiskData: AtRiskData | undefined;
}) {
  const [activeTab, setActiveTab] = useState<'unhandled' | 'handled'>('unhandled');
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [handlingId, setHandlingId] = useState<string | null>(null);
  const [recoveryNote, setRecoveryNote] = useState('');
  const handleMutation = useHandleAtRiskCustomer();

  const sorted = useMemo(
    () =>
      [...(atRiskData?.atRiskList ?? [])].sort((a, b) => {
        if (a.rating !== b.rating) return a.rating - b.rating;
        return a.daysSince - b.daysSince;
      }),
    [atRiskData],
  );

  const unhandled = sorted.filter((item) => item.recoveryStatus === 'unhandled');
  const handled = sorted.filter((item) => item.recoveryStatus === 'handled');
  const activeList = activeTab === 'unhandled' ? unhandled : handled;
  const pageCount = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visibleItems = activeList.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE,
  );

  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    unhandled.forEach((customer) => {
      customer.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [unhandled]);

  const switchTab = (tab: 'unhandled' | 'handled') => {
    setActiveTab(tab);
    setPage(0);
    setExpandedId(null);
    setHandlingId(null);
    setRecoveryNote('');
  };

  const startHandling = (customer: AtRiskCustomer) => {
    setExpandedId(customer.feedbackId);
    setHandlingId(customer.feedbackId);
    setRecoveryNote('');
  };

  const submitHandled = (event: React.FormEvent, customer: AtRiskCustomer) => {
    event.preventDefault();
    handleMutation.mutate(
      {
        id: customer.feedbackId,
        recoveryNote: recoveryNote.trim() || undefined,
        recoveryStatus: 'handled',
      },
      {
        onSuccess: () => {
          setExpandedId(null);
          setHandlingId(null);
          setRecoveryNote('');
        },
      },
    );
  };

  const undoHandled = (customer: AtRiskCustomer) => {
    handleMutation.mutate({
      id: customer.feedbackId,
      recoveryStatus: 'unhandled',
    });
  };

  return (
    <article className="insights-card risk-card">
      <div className="insights-card-header risk-card-header">
        <div>
          <h2>Recovery queue</h2>
          <p>Low-rating customers requiring a follow-up</p>
        </div>
        {unhandled.length > 0 && (
          <span className="risk-open-count">{unhandled.length} open</span>
        )}
      </div>

      <div className="risk-toolbar">
        <div className="risk-tabs" role="tablist" aria-label="Recovery queue status">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'unhandled'}
            className={activeTab === 'unhandled' ? 'active' : ''}
            onClick={() => switchTab('unhandled')}
          >
            Open <span>{unhandled.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'handled'}
            className={activeTab === 'handled' ? 'active' : ''}
            onClick={() => switchTab('handled')}
          >
            Handled <span>{handled.length}</span>
          </button>
        </div>

        {activeTab === 'unhandled' && topTags.length > 0 && (
          <div className="risk-top-issues" aria-label="Most common open issues">
            {topTags.map(([tag, count]) => (
              <span key={tag}>
                {tag} <b>{count}</b>
              </span>
            ))}
          </div>
        )}
      </div>

      {activeList.length === 0 ? (
        <div className="risk-empty">
          <span>✓</span>
          <div>
            <strong>
              {activeTab === 'unhandled'
                ? 'Your recovery queue is clear'
                : 'No handled cases yet'}
            </strong>
            <p>
              {activeTab === 'unhandled'
                ? 'There are no low-rating customers waiting for follow-up.'
                : 'Completed follow-ups will be available here.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="risk-list">
          {visibleItems.map((customer) => {
            const tier = severity(customer.rating);
            const isExpanded = expandedId === customer.feedbackId;
            const isHandling = handlingId === customer.feedbackId;
            const isHandled = customer.recoveryStatus === 'handled';

            return (
              <div
                className={`risk-item risk-item--${tier.tone}${
                  isExpanded ? ' risk-item--expanded' : ''
                }`}
                key={customer.feedbackId}
              >
                <div className="risk-item-row">
                  <span className={`risk-severity risk-severity--${tier.tone}`}>
                    {tier.label}
                  </span>
                  <div className="risk-item-content">
                    <div className="risk-item-title">
                      <strong>
                        {customer.tags[0] || `${customer.rating}-star feedback`}
                      </strong>
                      <span className="risk-stars" aria-label={`${customer.rating} stars`}>
                        {'★'.repeat(customer.rating)}
                        <i>{'★'.repeat(5 - customer.rating)}</i>
                      </span>
                    </div>
                    <p>
                      {customer.note ||
                        customer.tags.slice(1).join(', ') ||
                        'No written note provided.'}
                    </p>
                  </div>
                  <span className="risk-age">
                    {customer.daysSince === 0
                      ? 'Today'
                      : `${customer.daysSince}d ago`}
                  </span>
                  <div className="risk-actions">
                    <button
                      type="button"
                      className="risk-details-btn"
                      aria-expanded={isExpanded}
                      onClick={() => {
                        setExpandedId(isExpanded ? null : customer.feedbackId);
                        if (isExpanded) {
                          setHandlingId(null);
                          setRecoveryNote('');
                        }
                      }}
                    >
                      {isExpanded ? 'Close' : 'View'}
                    </button>
                    {isHandled ? (
                      <button
                        type="button"
                        className="risk-action-btn risk-action-btn--secondary"
                        onClick={() => undoHandled(customer)}
                        disabled={handleMutation.isPending}
                      >
                        Reopen
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="risk-action-btn"
                        onClick={() => startHandling(customer)}
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="risk-detail">
                    <div className="risk-detail-grid">
                      <div>
                        <span className="risk-detail-label">Customer feedback</span>
                        <p>{customer.note || 'No written note was submitted.'}</p>
                        {customer.tags.length > 0 && (
                          <div className="risk-tag-list">
                            {customer.tags.map((tag) => (
                              <span key={tag}>{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="risk-recommendation">
                        <span className="risk-detail-label">Recommended next step</span>
                        <p>{getTip(atRiskData?.businessType ?? 'generic', customer.tags)}</p>
                      </div>
                    </div>

                    {isHandled && customer.recoveryNote && (
                      <div className="risk-resolution-note">
                        <span className="risk-detail-label">Resolution note</span>
                        <p>{customer.recoveryNote}</p>
                      </div>
                    )}

                    {!isHandled && isHandling && (
                      <form
                        className="risk-resolution-form"
                        onSubmit={(event) => submitHandled(event, customer)}
                      >
                        <label htmlFor={`resolution-${customer.feedbackId}`}>
                          Resolution note <span>Optional</span>
                        </label>
                        <div>
                          <input
                            id={`resolution-${customer.feedbackId}`}
                            value={recoveryNote}
                            onChange={(event) => setRecoveryNote(event.target.value)}
                            placeholder="Example: Called customer and offered a correction"
                            maxLength={200}
                            autoFocus
                          />
                          <button type="submit" disabled={handleMutation.isPending}>
                            {handleMutation.isPending ? 'Saving…' : 'Mark handled'}
                          </button>
                        </div>
                      </form>
                    )}

                    {handleMutation.isError && isHandling && (
                      <p className="risk-mutation-error" role="alert">
                        {handleMutation.error instanceof Error
                          ? handleMutation.error.message
                          : 'Could not update this case.'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pageCount > 1 && (
        <div className="insights-pagination risk-pagination">
          <span>
            {safePage + 1} of {pageCount}
          </span>
          <div>
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={safePage === 0}
              aria-label="Previous recovery cases"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(pageCount - 1, current + 1))
              }
              disabled={safePage === pageCount - 1}
              aria-label="Next recovery cases"
            >
              →
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
