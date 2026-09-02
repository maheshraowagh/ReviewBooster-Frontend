import LegalLayout from "./LegalLayout";

export default function TermsOfServicePage() {
  return (
    <LegalLayout>
      <div className="legal-header-block">
        <h1 className="legal-title">Terms of Service</h1>
        <div className="legal-meta">
          <span>Effective Date: August 26, 2026</span>
          <span>•</span>
          <span>Last Updated: August 26, 2026</span>
          <span className="legal-badge-tag">SaaS Agreement</span>
        </div>
      </div>

      <div className="legal-prose">
        <p>
          Welcome to ReviewBooster. These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (whether personally or on behalf of an entity, &ldquo;User,&rdquo; &ldquo;Customer,&rdquo; or &ldquo;you&rdquo;) and ReviewBooster (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) concerning your access to and use of the ReviewBooster website, software, APIs, and associated online services (collectively, the &ldquo;Platform&rdquo;).
        </p>

        <p>
          By creating an account, connecting your Google Business Profile, or accessing our services, you acknowledge that you have read, understood, and agreed to be bound by these Terms. If you do not agree, you must immediately discontinue use of the Platform.
        </p>

        <h2>1. Services Provided</h2>
        <p>
          ReviewBooster is a SaaS marketing platform designed to assist businesses in collecting customer feedback, generating AI-assisted customer review drafts, auditing Google Business Profiles, managing customer communication lists, and orchestrating WhatsApp and email campaign reminders.
        </p>

        <h2>2. Account Registration & Security</h2>
        <ul>
          <li>You must be at least 18 years old and legally capable of entering into binding contracts to register for an account.</li>
          <li>You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.</li>
          <li>You agree to provide accurate, current, and complete business information during onboarding and to keep your account profile updated.</li>
        </ul>

        <h2>3. Acceptable Use Policy & Anti-Spam Obligations</h2>
        <p>
          As a condition of using our messaging features (WhatsApp campaigns, Email campaigns), you agree strictly to the following requirements:
        </p>
        <ul>
          <li>
            <strong>Prior Customer Consent:</strong> You confirm that all customer contact numbers and email addresses uploaded to the Platform have been collected with appropriate opt-in consent in compliance with applicable anti-spam and telecom regulations.
          </li>
          <li>
            <strong>Prohibited Activities:</strong> You will not use ReviewBooster to transmit unsolicited commercial communications (spam), harassment, deceptive material, hate speech, malware, or unlawful content.
          </li>
          <li>
            <strong>Platform Integrity:</strong> You will not attempt to reverse engineer, scrape, bypass rate limiters, or compromise the security and stability of our API or underlying infrastructure.
          </li>
        </ul>

        <h2>4. Subscriptions, Billing & Payment Terms</h2>
        <ul>
          <li>
            <strong>Pricing & Plans:</strong> ReviewBooster offers Free and tiered Paid Subscription Plans (e.g., Starter, Professional). Plan specifications, feature quotas (such as WhatsApp monthly message credits), and pricing in Indian Rupees (INR) are described on our Billing page.
          </li>
          <li>
            <strong>Payment Gateway:</strong> All subscription payments are processed securely through our authorized payment partner, Razorpay. By subscribing to a paid tier, you authorize recurring periodic charges (monthly or annual) to your chosen payment method.
          </li>
          <li>
            <strong>Taxes:</strong> All fees are exclusive of applicable Goods and Services Tax (GST) unless explicitly noted otherwise.
          </li>
          <li>
            <strong>Cancellation & Refunds:</strong> Subscriptions can be cancelled at any time through the Billing settings. For detailed terms regarding refunds, please refer to our <a href="/refund">Refund & Cancellation Policy</a>.
          </li>
        </ul>

        <h2>5. Intellectual Property Rights</h2>
        <p>
          The ReviewBooster platform, code, architecture, algorithms, UI designs, trademarks, and documentation are the exclusive intellectual property of ReviewBooster. You are granted a non-exclusive, non-transferable, revocable license to access the Platform in accordance with your active subscription plan.
        </p>
        <p>
          You retain all rights and ownership of your proprietary business data, logos, customer lists, and feedback records uploaded to your account.
        </p>

        <h2>6. Third-Party Integrations (Google, WhatsApp, Clerk)</h2>
        <p>
          Our services integrate with third-party platforms including Google Business Profile, WhatsApp (via Evolution API), and Clerk. We are not responsible for the uptime, policy changes, or account restrictions imposed by external platform operators on your individual third-party business accounts.
        </p>

        <h2>7. Limitation of Liability & Disclaimers</h2>
        <div className="legal-highlight-box">
          The Platform is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis without warranties of any kind, whether express or implied. To the fullest extent permitted by law, ReviewBooster shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of business profits, data loss, or reputation damage resulting from your use of the Platform.
        </div>

        <h2>8. Governing Law & Dispute Resolution</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of India. Any disputes or claims arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts in India.
        </p>

        <h2>9. Contact & Inquiries</h2>
        <p>
          If you have any questions or concerns regarding these Terms, please contact our support desk at <a href="mailto:support@reviewbooster.in">support@reviewbooster.in</a>.
        </p>
      </div>
    </LegalLayout>
  );
}
