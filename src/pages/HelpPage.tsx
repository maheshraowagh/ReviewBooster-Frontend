import { useState } from 'react';

export default function HelpPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: 'How do I find my Google Review link?',
      answer: (
        <ol style={{ paddingLeft: '1.25rem', margin: '0.5rem 0 0', lineHeight: 1.7 }}>
          <li>Search for your business on <strong>Google Maps</strong></li>
          <li>Click your business listing</li>
          <li>Click <strong>"Share"</strong></li>
          <li>Copy the link</li>
          <li>Paste it in your business settings</li>
          <li style={{ marginTop: '0.5rem', color: '#6B6B63' }}>
            Tip: The link usually starts with <code style={{ background: '#F2F0EA', padding: '2px 6px', borderRadius: '4px' }}>g.page/r/...</code> or <code style={{ background: '#F2F0EA', padding: '2px 6px', borderRadius: '4px' }}>maps.app.goo.gl/...</code>
          </li>
        </ol>
      ),
    },
    {
      question: 'Where should I place my QR code?',
      answer: (
        <div style={{ margin: '0.5rem 0 0', lineHeight: 1.7 }}>
          <p style={{ margin: '0 0 0.75rem' }}>Place your QR code where customers naturally pause after a positive experience:</p>
          <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
            <li>On table tents or receipts</li>
            <li>Near the exit or payment counter</li>
            <li>On menus or packaging</li>
            <li>In thank-you emails or SMS</li>
          </ul>
          <p style={{ margin: '0.75rem 0 0', color: '#6B6B63' }}>
            Pro tip: Add a friendly call-to-action like "Loved your meal? Scan to share your experience!"
          </p>
        </div>
      ),
    },
    {
      question: 'How does the AI review draft work?',
      answer: (
        <div style={{ margin: '0.5rem 0 0', lineHeight: 1.7 }}>
          <p style={{ margin: 0 }}>
            When a customer rates their experience and selects tags, our AI uses that information to generate a personalized review draft. 
            The customer can edit it freely or write their own. This helps customers articulate their experience and increases the likelihood they'll complete the review.
          </p>
        </div>
      ),
    },
    {
      question: 'What happens to low ratings?',
      answer: (
        <div style={{ margin: '0.5rem 0 0', lineHeight: 1.7 }}>
          <p style={{ margin: 0 }}>
            When a customer gives a low rating (1-3 stars), they're taken through the same feedback process, but they're <strong>not</strong> redirected to Google. 
            Instead, their feedback comes directly to your Inbox where you can address it privately. This protects your online reputation while giving you a chance to resolve issues.
          </p>
        </div>
      ),
    },
    {
      question: 'Can I customize the tags customers see?',
      answer: (
        <div style={{ margin: '0.5rem 0 0', lineHeight: 1.7 }}>
          <p style={{ margin: '0 0 0.75rem' }}>
            Currently, tags are automatically customized based on your business type (Restaurant, Café, Bakery, etc.). 
            Custom tag editing is coming soon in a future update.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="db-page animate-fade-in">
      {/* ---- Top bar ---- */}
      <div className="db-topbar">
        <div>
          <h1 className="db-title">Help & Support</h1>
          <p className="db-subtitle">Get answers and reach out if you need assistance</p>
        </div>
      </div>

      {/* ---- Contact Card (Priority: Most Visible) ---- */}
      <div className="db-card" style={{ background: 'linear-gradient(135deg, #E9F2E7 0%, #F2F0EA 100%)', border: '1px solid rgba(63,125,69,0.2)', marginBottom: '1.5rem' }}>
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="32" height="32" style={{ color: '#3F7D45' }}>
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1A1A1A', marginBottom: '0.5rem' }}>
            Need Help? We're Here for You
          </h2>
          <p style={{ fontSize: '0.9375rem', color: '#6B6B63', marginBottom: '1.5rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
            Have questions or stuck on something? Contact us directly and we'll get back to you quickly.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="mailto:support@reviewboost.app"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.875rem 1.5rem',
                borderRadius: '10px',
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: '#fff',
                background: '#1A1A1A',
                textDecoration: 'none',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(26,26,26,0.15)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#000000';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(26,26,26,0.25)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#1A1A1A';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(26,26,26,0.15)';
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Email Support
            </a>
            <a
              href="https://wa.me/1234567890?text=Hi%2C%20I%20need%20help%20with%20ReviewBoost"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.875rem 1.5rem',
                borderRadius: '10px',
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: '#1A1A1A',
                background: '#FFFFFF',
                textDecoration: 'none',
                border: '1px solid #E3E1D9',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#1A1A1A';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#E3E1D9';
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" style={{ color: '#25D366' }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp Support
            </a>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#A3A39A', marginTop: '1rem' }}>
            Average response time: Within 24 hours
          </p>
        </div>
      </div>

      {/* ---- FAQ Section ---- */}
      <div className="db-card">
        <h2 className="db-card-title">Frequently Asked Questions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {faqs.map((faq, index) => (
            <div
              key={index}
              style={{
                border: '1px solid #E3E1D9',
                borderRadius: '8px',
                overflow: 'hidden',
                background: expandedFaq === index ? '#F2F0EA' : '#FFFFFF',
                transition: 'background 0.2s',
              }}
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                }}
              >
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1A1A1A', flex: 1 }}>
                  {faq.question}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="20"
                  height="20"
                  style={{
                    color: '#6B6B63',
                    transform: expandedFaq === index ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {expandedFaq === index && (
                <div style={{
                  padding: '0 1.25rem 1.25rem',
                  fontSize: '0.875rem',
                  color: '#1A1A1A',
                  lineHeight: 1.7,
                  animation: 'fade-in 0.2s',
                }}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ---- Additional Resources ---- */}
      <div className="db-card" style={{ marginTop: '1rem' }}>
        <h2 className="db-card-title">Quick Tips</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div style={{
            padding: '1.25rem',
            borderRadius: '8px',
            background: '#F2F0EA',
            border: '1px solid #E3E1D9',
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>📱</div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1A1A1A', marginBottom: '0.5rem' }}>
              Test Your QR Code
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6B6B63', margin: 0, lineHeight: 1.6 }}>
              Always scan your QR code yourself before printing to make sure it works correctly.
            </p>
          </div>
          <div style={{
            padding: '1.25rem',
            borderRadius: '8px',
            background: '#F2F0EA',
            border: '1px solid #E3E1D9',
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>⭐</div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1A1A1A', marginBottom: '0.5rem' }}>
              Timing Matters
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6B6B63', margin: 0, lineHeight: 1.6 }}>
              Ask for reviews right after a positive moment, when the experience is fresh in their mind.
            </p>
          </div>
          <div style={{
            padding: '1.25rem',
            borderRadius: '8px',
            background: '#F2F0EA',
            border: '1px solid #E3E1D9',
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>📊</div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1A1A1A', marginBottom: '0.5rem' }}>
              Monitor Your Inbox
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6B6B63', margin: 0, lineHeight: 1.6 }}>
              Check your Feedback Inbox regularly to catch and resolve issues before they become public reviews.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
