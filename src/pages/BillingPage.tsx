export default function BillingPage() {
  return (
    <div className="db-page animate-fade-in">
      {/* ---- Top bar ---- */}
      <div className="db-topbar">
        <div>
          <h1 className="db-title">Plan & Billing</h1>
          <p className="db-subtitle">Manage your subscription and billing</p>
        </div>
      </div>

      {/* ---- Current Plan Card ---- */}
      <div className="db-card" style={{ background: 'linear-gradient(135deg, #E9F2E7 0%, #F2F0EA 100%)', border: '1px solid rgba(63,125,69,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="32" height="32" style={{ color: '#3F7D45' }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
                Free — Pilot Program
              </h2>
              <div style={{
                padding: '0.375rem 0.75rem',
                borderRadius: '99px',
                background: '#3F7D45',
                color: '#FFFFFF',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}>
                Active
              </div>
            </div>
            <p style={{ fontSize: '1rem', color: '#6B6B63', margin: '0 0 1.25rem', lineHeight: 1.6 }}>
              You're part of our early pilot program. Enjoy full access to all features at no charge during this period.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              padding: '1rem',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(63,125,69,0.1)',
            }}>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B6B63', margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  QR Scans
                </p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
                  Unlimited
                </p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B6B63', margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Locations
                </p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
                  1 Included
                </p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B6B63', margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  AI Reviews
                </p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
                  Unlimited
                </p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B6B63', margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Support
                </p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
                  Priority
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Pilot Program Info ---- */}
      <div className="db-card" style={{ marginTop: '1.5rem' }}>
        <h2 className="db-card-title">About the Pilot Program</h2>
        <div style={{ fontSize: '0.9375rem', color: '#1A1A1A', lineHeight: 1.7 }}>
          <p style={{ margin: '0 0 1rem' }}>
            Thank you for being an early adopter! You're helping us build the best review collection system for restaurants and local businesses.
          </p>
          <p style={{ margin: '0 0 1rem' }}>
            <strong>What does this mean for you?</strong>
          </p>
          <ul style={{ margin: '0 0 1rem', paddingLeft: '1.5rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>✅ Full access to all current and upcoming features</li>
            <li style={{ marginBottom: '0.5rem' }}>✅ No charges during the pilot period</li>
            <li style={{ marginBottom: '0.5rem' }}>✅ Priority support and direct feedback channel</li>
            <li style={{ marginBottom: '0.5rem' }}>✅ Early notice and special pricing when we launch paid plans</li>
          </ul>
          <p style={{ margin: 0, color: '#6B6B63' }}>
            We'll notify you well in advance before introducing any pricing changes. Your feedback is invaluable to us — thank you for being part of our journey!
          </p>
        </div>
      </div>

      {/* ---- Future Pricing Preview ---- */}
      <div className="db-card" style={{ marginTop: '1.5rem' }}>
        <h2 className="db-card-title">Pricing Plans Coming Soon</h2>
        <p style={{ fontSize: '0.875rem', color: '#6B6B63', marginBottom: '1.5rem' }}>
          We're still finalizing our pricing structure based on pilot feedback. Here's a preview of what we're considering:
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* Starter Plan */}
          <div style={{
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid #E3E1D9',
            background: '#FFFFFF',
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1A1A1A', marginBottom: '0.5rem' }}>
              Starter
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6B6B63', marginBottom: '1rem' }}>
              Perfect for single-location businesses
            </p>
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 700, color: '#1A1A1A' }}>$29</span>
              <span style={{ fontSize: '0.875rem', color: '#6B6B63' }}>/month</span>
            </div>
            <ul style={{ fontSize: '0.875rem', color: '#1A1A1A', lineHeight: 1.8, paddingLeft: '1.25rem', margin: 0 }}>
              <li>1 Location</li>
              <li>Unlimited QR scans</li>
              <li>AI review generation</li>
              <li>Basic analytics</li>
              <li>Email support</li>
            </ul>
          </div>

          {/* Professional Plan */}
          <div style={{
            padding: '1.5rem',
            borderRadius: '12px',
            border: '2px solid #3F7D45',
            background: '#FFFFFF',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              top: '-12px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '0.25rem 0.75rem',
              borderRadius: '99px',
              background: '#3F7D45',
              color: '#FFFFFF',
              fontSize: '0.6875rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Most Popular
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1A1A1A', marginBottom: '0.5rem' }}>
              Professional
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6B6B63', marginBottom: '1rem' }}>
              For growing businesses with multiple locations
            </p>
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 700, color: '#1A1A1A' }}>$79</span>
              <span style={{ fontSize: '0.875rem', color: '#6B6B63' }}>/month</span>
            </div>
            <ul style={{ fontSize: '0.875rem', color: '#1A1A1A', lineHeight: 1.8, paddingLeft: '1.25rem', margin: 0 }}>
              <li>Up to 5 Locations</li>
              <li>Unlimited QR scans</li>
              <li>AI review generation</li>
              <li>Advanced analytics & insights</li>
              <li>Priority email & chat support</li>
              <li>Custom branding</li>
            </ul>
          </div>

          {/* Enterprise Plan */}
          <div style={{
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid #E3E1D9',
            background: '#FFFFFF',
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1A1A1A', marginBottom: '0.5rem' }}>
              Enterprise
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6B6B63', marginBottom: '1rem' }}>
              For chains and franchises
            </p>
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 700, color: '#1A1A1A' }}>Custom</span>
            </div>
            <ul style={{ fontSize: '0.875rem', color: '#1A1A1A', lineHeight: 1.8, paddingLeft: '1.25rem', margin: 0 }}>
              <li>Unlimited locations</li>
              <li>Unlimited QR scans</li>
              <li>AI review generation</li>
              <li>Custom analytics & reporting</li>
              <li>Dedicated account manager</li>
              <li>White-label options</li>
              <li>API access</li>
            </ul>
          </div>
        </div>

        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          borderRadius: '8px',
          background: '#F2F0EA',
          border: '1px solid #E3E1D9',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '0.875rem', color: '#6B6B63', margin: 0 }}>
            💡 These are preliminary estimates and may change based on pilot feedback. 
            <strong style={{ color: '#1A1A1A', display: 'block', marginTop: '0.25rem' }}>
              Pilot participants will receive special early-bird pricing.
            </strong>
          </p>
        </div>
      </div>

      {/* ---- Need Something Different? ---- */}
      <div className="db-card" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1A1A1A', marginBottom: '0.75rem' }}>
          Have questions about pricing?
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#6B6B63', marginBottom: '1rem', maxWidth: '480px', margin: '0 auto 1rem' }}>
          We're happy to discuss your specific needs and help you find the right plan when pricing launches.
        </p>
        <a
          href="mailto:support@reviewboost.app?subject=Pricing%20Inquiry"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: '#FFFFFF',
            background: '#1A1A1A',
            textDecoration: 'none',
            transition: 'all 0.2s',
          }}
        >
          Contact Us
        </a>
      </div>
    </div>
  );
}
