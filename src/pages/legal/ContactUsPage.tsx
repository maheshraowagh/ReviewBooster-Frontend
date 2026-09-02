import LegalLayout from "./LegalLayout";

export default function ContactUsPage() {
  return (
    <LegalLayout>
      <div className="legal-header-block">
        <h1 className="legal-title">Contact & Support</h1>
        <div className="legal-meta">
          <span>Customer Success & Inquiries</span>
          <span>•</span>
          <span>We typically respond within 24 business hours</span>
        </div>
      </div>

      <div className="legal-prose">
        <p>
          Have questions about onboarding your business, connecting your WhatsApp instance, auditing your Google Business Profile, or managing your subscription? Our support team is here to assist you.
        </p>

        <h2>Direct Contact Channels</h2>
        <div className="legal-contact-grid">
          <div className="legal-contact-card">
            <div className="legal-contact-card-title">General Inquiries & Support</div>
            <div className="legal-contact-card-value">
              <a href="mailto:support@reviewbooster.in">support@reviewbooster.in</a>
            </div>
          </div>

          <div className="legal-contact-card">
            <div className="legal-contact-card-title">Billing & Subscription Desk</div>
            <div className="legal-contact-card-value">
              <a href="mailto:billing@reviewbooster.in">billing@reviewbooster.in</a>
            </div>
          </div>

          <div className="legal-contact-card">
            <div className="legal-contact-card-title">Privacy & Grievance Officer</div>
            <div className="legal-contact-card-value">
              <a href="mailto:privacy@reviewbooster.in">privacy@reviewbooster.in</a>
            </div>
          </div>

          <div className="legal-contact-card">
            <div className="legal-contact-card-title">Business Operating Hours</div>
            <div className="legal-contact-card-value">
              Monday – Saturday, 9:30 AM – 6:30 PM IST
            </div>
          </div>
        </div>

        <h2>Support Response SLAs</h2>
        <ul>
          <li><strong>General Support Queries:</strong> Acknowledged and answered within 24 business hours.</li>
          <li><strong>Billing & Refund Inquiries:</strong> Handled with priority within 12–24 business hours.</li>
          <li><strong>Service Outage / Critical Issues:</strong> Monitored 24/7 with immediate engineering response.</li>
        </ul>

        <h2>Self-Service Help Center</h2>
        <p>
          If you are already logged in to your account, you can also access our step-by-step documentation, WhatsApp setup tutorials, and campaign guides under the <a href="/help">Help & Documentation</a> section inside your dashboard.
        </p>
      </div>
    </LegalLayout>
  );
}
