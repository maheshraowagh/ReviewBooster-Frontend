import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useFeatureRequests,
  useCreateFeatureRequest,
  useUpvoteFeatureRequest,
} from '../hooks/queries/useFeatureRequests';
import './help.css';

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Feature request modal state
  const [showModal, setShowModal] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqCategory, setReqCategory] = useState('new-feature');
  const [reqDescription, setReqDescription] = useState('');
  const [submitMsg, setSubmitMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Feature requests data via TanStack Query
  const { data: myRequests = [], isLoading: loadingRequests } = useFeatureRequests();
  const createMutation = useCreateFeatureRequest();
  const upvoteMutation = useUpvoteFeatureRequest();

  const handleUpvote = async (id: string) => {
    try {
      await upvoteMutation.mutateAsync(id);
    } catch (err) {
      console.error('Failed to upvote', err);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle.trim() || !reqDescription.trim()) return;

    setSubmitMsg(null);
    try {
      await createMutation.mutateAsync({
        title: reqTitle,
        category: reqCategory,
        description: reqDescription,
      });

      setSubmitMsg({ type: 'success', text: 'Feature request submitted successfully!' });
      setReqTitle('');
      setReqDescription('');
      setReqCategory('new-feature');
      setTimeout(() => {
        setShowModal(false);
        setSubmitMsg(null);
      }, 1500);
    } catch {
      setSubmitMsg({ type: 'error', text: 'Failed to submit request. Please try again.' });
    }
  };

  const categories = ['All', 'Getting Started', 'QR Codes', 'AI Features', 'Account'];

  const faqs = [
    {
      category: 'Getting Started',
      question: 'How do I find my Google Review link?',
      answer: (
        <div>
          <p style={{ margin: '0 0 0.5rem' }}>Follow these simple steps to link your Google Business profile:</p>
          <ol style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.7 }}>
            <li>Search for your business on <strong>Google Maps</strong></li>
            <li>Click your business listing</li>
            <li>Click <strong>"Share"</strong> and copy the link</li>
            <li>Paste it under <strong>Settings → Google Review Link</strong></li>
          </ol>
          <p style={{ marginTop: '0.5rem', color: '#6b7280', fontSize: '0.85rem' }}>
            Tip: Link usually starts with <code>g.page/r/...</code> or <code>maps.app.goo.gl/...</code>
          </p>
        </div>
      ),
    },
    {
      category: 'QR Codes',
      question: 'Where should I place my QR code for best results?',
      answer: (
        <div>
          <p style={{ margin: '0 0 0.5rem' }}>Place your QR code where customers naturally pause:</p>
          <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.7 }}>
            <li>On table tents, counter displays, or receipts</li>
            <li>Near checkout registers or exit doors</li>
            <li>On takeaway boxes, bags, or menus</li>
            <li>In digital receipts and thank-you WhatsApp messages</li>
          </ul>
        </div>
      ),
    },
    {
      category: 'AI Features',
      question: 'How does the AI review draft generator work?',
      answer: (
        <div>
          <p style={{ margin: 0 }}>
            When a customer rates their experience and picks service tags (e.g. "Great Coffee", "Fast Service"), 
            our AI crafts a personalized, authentic review draft. The customer can copy or edit it with a single tap 
            before leaving their review on Google.
          </p>
        </div>
      ),
    },
    {
      category: 'AI Features',
      question: 'Does ReviewBoost comply with Google Review policies?',
      answer: (
        <div>
          <p style={{ margin: 0 }}>
            Yes! ReviewBoost strictly complies with Google's policies. All customers—regardless of star rating—have full access to post their review directly to Google. Low ratings additionally notify your 
            <strong> Feedback Inbox</strong> so your team can privately resolve customer issues while staying 100% policy-compliant.
          </p>
        </div>
      ),
    },
    {
      category: 'Account',
      question: 'Can I customize customer feedback tags for my business type?',
      answer: (
        <div>
          <p style={{ margin: 0 }}>
            Yes! Go to <strong>Settings → Business Services</strong> to pick from preset industry templates (Restaurant, Salon, Dental Clinic, etc.) or add your own custom service tags.
          </p>
        </div>
      ),
    },
    {
      category: 'Getting Started',
      question: 'What is the Business Health feature?',
      answer: (
        <div>
          <p style={{ margin: 0 }}>
            Our <strong>Business Health Audit</strong> analyzes your Google listing completeness, review response speed, profile optimization, and local SEO health, giving you actionable recommendations to improve your local search rank.
          </p>
        </div>
      ),
    },
    {
      category: 'Getting Started',
      question: 'How long does it take for Google Reviews to update?',
      answer: (
        <div>
          <p style={{ margin: 0 }}>
            Reviews posted by customers usually appear instantly on your Google Business Profile. In rare cases, Google's automated spam filters may review posts for up to 24-48 hours.
          </p>
        </div>
      ),
    },
  ];

  // Filter FAQs by search & category
  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = activeCategory === 'All' || faq.category === activeCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (typeof faq.answer === 'string' ? (faq.answer as string).toLowerCase().includes(searchQuery.toLowerCase()) : false);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="db-page animate-fade-in help-page-container">
      {/* Top Header Bar */}
      <div className="db-topbar" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="db-title">Help & Support</h1>
          <p className="db-subtitle">Get instant answers, submit feature requests, or reach support</p>
        </div>
      </div>

      {/* Hero Banner with Search */}
      <div className="help-hero">
        <h2 className="help-hero-title">How can we help you today?</h2>
        <p className="help-hero-subtitle">
          Search our knowledge base or explore popular questions below
        </p>
        <div className="help-search-wrapper">
          <svg
            className="help-search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="20"
            height="20"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="help-search-input"
            placeholder="Search questions, setup guides, or AI features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Quick Action Cards Grid */}
      <div className="help-actions-grid">
        <a href="mailto:support@reviewboost.app" className="help-action-card">
          <div className="help-card-icon-badge icon-badge-email">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div className="help-card-heading">Email Support</div>
          <div className="help-card-desc">Reach out to our customer success team for detailed inquiries.</div>
          <span className="help-card-cta">
            Contact Support &rarr;
          </span>
        </a>

        <a
          href="https://wa.me/1234567890?text=Hi%2C%20I%20need%20help%20with%20ReviewBoost"
          target="_blank"
          rel="noopener noreferrer"
          className="help-action-card"
        >
          <div className="help-card-icon-badge icon-badge-whatsapp">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div className="help-card-heading">WhatsApp Support</div>
          <div className="help-card-desc">Chat directly with a support agent for quick troubleshooting.</div>
          <span className="help-card-cta" style={{ color: '#16a34a' }}>
            Open Chat &rarr;
          </span>
        </a>

        <div onClick={() => setShowModal(true)} className="help-action-card">
          <div className="help-card-icon-badge icon-badge-feature">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="help-card-heading">Request a Feature</div>
          <div className="help-card-desc">Suggest a new tool or improvement to shape our product roadmap.</div>
          <span className="help-card-cta" style={{ color: '#0284c7' }}>
            Submit Request &rarr;
          </span>
        </div>
      </div>

      {/* FAQ Section with Category Filter */}
      <div className="help-faq-card">
        <div className="help-faq-header">
          <h2 className="help-faq-title">Frequently Asked Questions</h2>
          <div className="help-category-pills">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => {
                  setActiveCategory(cat);
                  setExpandedFaq(null);
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filteredFaqs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            No FAQs matching "{searchQuery}" in category "{activeCategory}".
          </div>
        ) : (
          <div className="faq-accordion-list">
            {filteredFaqs.map((faq, index) => {
              const isExpanded = expandedFaq === index;
              return (
                <div key={index} className={`faq-item ${isExpanded ? 'expanded' : ''}`}>
                  <button
                    className="faq-question-btn"
                    onClick={() => setExpandedFaq(isExpanded ? null : index)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="faq-index-badge">0{index + 1}</span>
                      <span className="faq-question-text">{faq.question}</span>
                    </div>
                    <svg
                      className="faq-chevron"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      width="18"
                      height="18"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {isExpanded && <div className="faq-answer-body">{faq.answer}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feature Request Tracker Section */}
      <div className="feature-req-section">
        <div className="feature-req-topbar">
          <div>
            <h2 className="help-faq-title">Feature Requests & Roadmap</h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '2px 0 0' }}>
              Vote on ideas or submit your own request to help us build what you need.
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary-green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Submit Request
          </button>
        </div>

        {loadingRequests ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: '#9ca3af' }}>Loading requests...</div>
        ) : myRequests.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', background: '#fafafa', borderRadius: '12px', border: '1px dashed #e5e7eb' }}>
            <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>💡 Have an idea for ReviewBoost?</div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 1rem' }}>
              Submit a feature request and our engineering team will review it for upcoming updates!
            </p>
            <button onClick={() => setShowModal(true)} className="btn-primary-green">
              Request a Feature
            </button>
          </div>
        ) : (
          myRequests.map((req) => {
            const upvoted = req.upvotes.includes('user_current');
            return (
              <div key={req._id} className="request-card-item">
                <button
                  className={`upvote-button ${upvoted ? 'upvoted' : ''}`}
                  onClick={() => handleUpvote(req._id)}
                  title="Upvote feature"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                  <span className="upvote-count">{req.upvotes.length}</span>
                </button>
                <div className="request-content">
                  <div className="request-title">{req.title}</div>
                  <div className="request-desc">{req.description}</div>
                  <div className="request-meta">
                    <span>Category: {req.category}</span>
                    <span>&bull;</span>
                    <span className={`status-badge ${req.status}`}>{req.status}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Tips Cards Grid */}
      <div className="help-faq-card">
        <h2 className="help-faq-title" style={{ marginBottom: '1.25rem' }}>Pro Tips for Maximum Reviews</h2>
        <div className="tips-grid">
          <div className="tip-card">
            <div className="tip-icon-box">📱</div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827', margin: '0 0 0.375rem' }}>
              Test Your QR Code
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
              Always scan your QR code yourself on your mobile phone before printing table tents to ensure links function smoothly.
            </p>
          </div>
          <div className="tip-card">
            <div className="tip-icon-box">⭐</div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827', margin: '0 0 0.375rem' }}>
              Ask at Peak Engagement
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
              Request reviews right after a great interaction or successful checkout while their positive experience is fresh.
            </p>
          </div>
          <div className="tip-card">
            <div className="tip-icon-box">📊</div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827', margin: '0 0 0.375rem' }}>
              Check Feedback Daily
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
              Monitor your Feedback Inbox regularly to reply to customer concerns before they post public negative reviews.
            </p>
          </div>
        </div>
      </div>

      {/* Legal & Compliance Section */}
      <div className="help-faq-card" style={{ marginTop: '1.5rem' }}>
        <h2 className="help-faq-title" style={{ marginBottom: '0.75rem' }}>Legal, Policies & Terms</h2>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.25rem' }}>
          Review our service agreements, data protection policies, and refund guidelines.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <Link
            to="/privacy"
            style={{
              display: 'block', padding: '1rem', background: '#f9fafb', border: '1px solid #e5e7eb',
              borderRadius: '8px', textDecoration: 'none', color: '#111827', transition: 'border-color 0.15s'
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>🔒 Privacy Policy</div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>DPDP Act & Data Protection terms</div>
          </Link>
          <Link
            to="/terms"
            style={{
              display: 'block', padding: '1rem', background: '#f9fafb', border: '1px solid #e5e7eb',
              borderRadius: '8px', textDecoration: 'none', color: '#111827', transition: 'border-color 0.15s'
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>📜 Terms of Service</div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>SaaS usage & acceptable use</div>
          </Link>
          <Link
            to="/refund"
            style={{
              display: 'block', padding: '1rem', background: '#f9fafb', border: '1px solid #e5e7eb',
              borderRadius: '8px', textDecoration: 'none', color: '#111827', transition: 'border-color 0.15s'
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>💳 Refund Policy</div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>7-day guarantee & cancellation</div>
          </Link>
          <Link
            to="/contact"
            style={{
              display: 'block', padding: '1rem', background: '#f9fafb', border: '1px solid #e5e7eb',
              borderRadius: '8px', textDecoration: 'none', color: '#111827', transition: 'border-color 0.15s'
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>💬 Contact & Support</div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Direct support desk & SLAs</div>
          </Link>
        </div>
      </div>

      {/* Feature Request Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3 className="modal-title-text">Request a Feature</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {submitMsg && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  marginBottom: '1rem',
                  background: submitMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  color: submitMsg.type === 'success' ? '#065f46' : '#991b1b',
                  border: `1px solid ${submitMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                }}
              >
                {submitMsg.text}
              </div>
            )}

            <form onSubmit={handleSubmitRequest}>
              <div>
                <label className="form-group-label">Feature Title *</label>
                <input
                  type="text"
                  className="form-input-field"
                  placeholder="e.g. Custom SMS sender ID configuration"
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                  maxLength={120}
                  required
                />
              </div>

              <div>
                <label className="form-group-label">Category</label>
                <select
                  className="form-input-field"
                  value={reqCategory}
                  onChange={(e) => setReqCategory(e.target.value)}
                >
                  <option value="new-feature">New Feature</option>
                  <option value="ui-ux">UI / UX Improvement</option>
                  <option value="integration">Integration (Google, WhatsApp, Email)</option>
                  <option value="performance">Performance & Speed</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="form-group-label">Description *</label>
                <textarea
                  className="form-input-field"
                  style={{ minHeight: '110px', resize: 'vertical' }}
                  placeholder="Explain what problem this feature solves for your business..."
                  value={reqDescription}
                  onChange={(e) => setReqDescription(e.target.value)}
                  maxLength={1000}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '0.625rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-green" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
