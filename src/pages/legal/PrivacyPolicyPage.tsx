import LegalLayout from "./LegalLayout";

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout>
      <div className="legal-header-block">
        <h1 className="legal-title">Privacy Policy</h1>
        <div className="legal-meta">
          <span>Effective Date: August 26, 2026</span>
          <span>•</span>
          <span>Last Updated: August 26, 2026</span>
          <span className="legal-badge-tag">DPDP Act 2023 & IT Act Compliant</span>
        </div>
      </div>

      <div className="legal-prose">
        <p>
          ReviewBooster (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website, utilize our SaaS platform, or interact with our public customer review collection portals.
        </p>

        <h2>1. Information We Collect</h2>
        <p>We collect information in the following categories:</p>
        <ul>
          <li>
            <strong>Account Information:</strong> Name, business email address, phone number, company name, and authentication identifiers provided during registration via Clerk.
          </li>
          <li>
            <strong>Business Profile & Location Data:</strong> Business name, category, physical address, Google Business Profile (GBP) Place IDs, review links, and brand logos uploaded to our media storage.
          </li>
          <li>
            <strong>Customer Interaction & Campaign Data:</strong> Customer contact details (names, phone numbers, email addresses) uploaded by business owners for review request campaigns.
          </li>
          <li>
            <strong>Public Reviewer Feedback:</strong> Star ratings, feedback tags, comments, and AI review drafts generated during customer interactions on our public review funnel (<code>/r/:businessCode</code>).
          </li>
          <li>
            <strong>Device & Technical Telemetry:</strong> IP addresses, browser user-agent strings, device fingerprints (hashed securely via SHA-256 for abuse mitigation), and visit timestamps.
          </li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>Your information is processed for the following legitimate purposes:</p>
        <ul>
          <li>To provide, operate, and maintain the ReviewBooster platform and dashboard.</li>
          <li>To generate tailored AI review drafts based on customer ratings and business context.</li>
          <li>To dispatch transactional WhatsApp and email review requests on behalf of authorized businesses.</li>
          <li>To audit and analyze Google Business Profile local SEO health metrics.</li>
          <li>To process subscription payments and recurring billing via our payment gateway partner (Razorpay).</li>
          <li>To prevent fraudulent scans, spam, and malicious automated bot activity.</li>
        </ul>

        <h2>3. Third-Party Service Providers & Data Processors</h2>
        <p>
          We partner with vetted third-party service providers to facilitate our platform operations. All providers are contractually bound to maintain strict confidentiality and data protection standards:
        </p>
        <ul>
          <li><strong>Authentication & User Identity:</strong> Clerk (Clerk Inc.)</li>
          <li><strong>Database & Cloud Hosting:</strong> MongoDB Atlas & Hostinger VPS</li>
          <li><strong>Payment Processing:</strong> Razorpay Software Private Limited</li>
          <li><strong>Transactional Email Delivery:</strong> Resend Technologies & Google OAuth (Gmail API)</li>
          <li><strong>Media & Asset Storage:</strong> Cloudinary Inc.</li>
          <li><strong>AI Text Generation:</strong> Groq Inc. / OpenAI API</li>
          <li><strong>Observability & Error Tracking:</strong> Sentry (Functional Software Inc.)</li>
        </ul>

        <h2>4. Data Protection & Security Measures</h2>
        <p>
          We implement multi-layered industry-standard security safeguards to protect your personal data against unauthorized access, destruction, or alteration:
        </p>
        <ul>
          <li><strong>Encryption:</strong> Sensitive access tokens (such as Gmail OAuth refresh tokens) are encrypted at rest using AES-256-GCM. All data in transit is encrypted using TLS 1.3.</li>
          <li><strong>Access Controls:</strong> Role-based access control (RBAC) ensures only authorized staff and owners can access their tenant data.</li>
          <li><strong>Device Fingerprint Hashing:</strong> End-user IP and user-agent signals are one-way hashed (SHA-256) and never stored as raw identifiers.</li>
        </ul>

        <h2>5. Your Rights & Data Choices</h2>
        <p>
          Under the Digital Personal Data Protection (DPDP) Act, 2023 and applicable privacy frameworks, you have the right to:
        </p>
        <ul>
          <li><strong>Access & Portability:</strong> Request a digital copy of the personal information we hold about you.</li>
          <li><strong>Correction & Rectification:</strong> Request correction of inaccurate or incomplete business profile data.</li>
          <li><strong>Erasure / Account Deletion:</strong> Request permanent deletion of your account, business records, and customer campaign logs.</li>
          <li><strong>Opt-Out of Communications:</strong> Campaign recipients may opt out at any time via the one-click unsubscribe link provided in every review request email or by replying STOP to WhatsApp messages.</li>
        </ul>

        <div className="legal-highlight-box">
          <strong>To exercise any of your data rights:</strong> Contact our Grievance Officer at{" "}
          <a href="mailto:privacy@reviewbooster.in">privacy@reviewbooster.in</a>. Requests will be acknowledged within 24 hours and fulfilled within 30 days.
        </div>

        <h2>6. Cookies & Tracking Technologies</h2>
        <p>
          We use essential session cookies for authentication, preference retention, and fraud prevention. We do not sell your personal data or utilize third-party cross-site advertising trackers. You can manage or disable cookie preferences via your browser settings.
        </p>

        <h2>7. Updates to This Policy</h2>
        <p>
          We may update this Privacy Policy periodically to reflect architectural changes or regulatory updates. When material revisions occur, we will notify registered users via email or an in-app banner prior to the changes taking effect.
        </p>

        <h2>8. Grievance Redressal & Contact Information</h2>
        <div className="legal-contact-grid">
          <div className="legal-contact-card">
            <div className="legal-contact-card-title">Grievance & Privacy Officer</div>
            <div className="legal-contact-card-value">Data Protection Desk</div>
          </div>
          <div className="legal-contact-card">
            <div className="legal-contact-card-title">Email Address</div>
            <div className="legal-contact-card-value">privacy@reviewbooster.in</div>
          </div>
          <div className="legal-contact-card">
            <div className="legal-contact-card-title">Response SLA</div>
            <div className="legal-contact-card-value">Within 24–48 Business Hours</div>
          </div>
        </div>
      </div>
    </LegalLayout>
  );
}
