import LegalLayout from "./LegalLayout";

export default function RefundPolicyPage() {
  return (
    <LegalLayout>
      <div className="legal-header-block">
        <h1 className="legal-title">Refund & Cancellation Policy</h1>
        <div className="legal-meta">
          <span>Effective Date: August 26, 2026</span>
          <span>•</span>
          <span>Last Updated: August 26, 2026</span>
          <span className="legal-badge-tag">Razorpay & RBI Compliant</span>
        </div>
      </div>

      <div className="legal-prose">
        <p>
          At ReviewBooster, we aim to provide high-quality SaaS tools to help your business manage and grow its online reputation. This Refund & Cancellation Policy outlines the conditions and timelines under which subscriptions may be cancelled and refunds may be issued.
        </p>

        <h2>1. Subscription Cancellation</h2>
        <p>
          You can cancel your paid ReviewBooster subscription at any time directly through your account dashboard or by contacting our support team:
        </p>
        <ul>
          <li>
            <strong>Self-Service Cancellation:</strong> Navigate to <strong>Dashboard &gt; Billing &gt; Manage Subscription</strong> and click &ldquo;Cancel Subscription&rdquo;.
          </li>
          <li>
            <strong>Effective Timing:</strong> When you cancel a recurring subscription, the cancellation takes effect at the end of your current billing period (monthly or annual). You will retain full access to all paid plan features, WhatsApp quotas, and campaign capabilities until the billing cycle expires.
          </li>
          <li>
            <strong>No Auto-Renewal:</strong> Once cancelled, your payment method will not be charged for any subsequent billing periods.
          </li>
        </ul>

        <h2>2. Refund Eligibility & 7-Day Money-Back Guarantee</h2>
        <p>
          We stand behind the value of our platform. For first-time subscribers on any paid tier (Starter or Professional):
        </p>
        <ul>
          <li>
            <strong>7-Day Initial Guarantee:</strong> If you are dissatisfied with the service, you are eligible to request a <strong>100% full refund</strong> within <strong>7 calendar days</strong> from your initial subscription date.
          </li>
          <li>
            <strong>Technical Faults or Unscheduled Downtime:</strong> If you experience persistent technical failures or system unreachability that our support team is unable to resolve within 72 hours, a prorated or full refund for the affected billing period will be issued.
          </li>
          <li>
            <strong>Duplicate or Incorrect Charges:</strong> In the event of an erroneous double charge or system billing glitch, you will be refunded immediately in full upon reporting.
          </li>
        </ul>

        <h2>3. Non-Refundable Scenarios</h2>
        <p>Refunds will not be issued under the following circumstances:</p>
        <ul>
          <li>Requests submitted after the 7-day money-back guarantee window for recurring renewal cycles.</li>
          <li>Accounts terminated due to violations of our <a href="/terms">Terms of Service</a> or Anti-Spam Policy (e.g., transmitting unconsented spam messages or violating telecom regulations).</li>
          <li>Unused monthly message quotas at the end of a regular completed billing cycle.</li>
        </ul>

        <h2>4. Refund Processing Timeline & Method</h2>
        <div className="legal-highlight-box">
          <strong>Refund Method:</strong> All approved refunds are processed directly back to the <strong>original payment method</strong> (Credit Card, Debit Card, Net Banking, or UPI) via our payment gateway partner, Razorpay.
        </div>
        <ul>
          <li><strong>Approval:</strong> Refund requests are reviewed and approved within <strong>24 to 48 business hours</strong> of receipt.</li>
          <li><strong>Credit Timeline:</strong> Once processed by ReviewBooster, the refunded amount typically reflects in your bank account or card statement within <strong>5 to 7 business days</strong>, depending on your issuing bank&rsquo;s processing schedule.</li>
        </ul>

        <h2>5. How to Request a Refund</h2>
        <p>
          To initiate a refund request, please email our billing support team with your account details:
        </p>
        <div className="legal-contact-grid">
          <div className="legal-contact-card">
            <div className="legal-contact-card-title">Billing Email</div>
            <div className="legal-contact-card-value">billing@reviewbooster.in</div>
          </div>
          <div className="legal-contact-card">
            <div className="legal-contact-card-title">Required Information</div>
            <div className="legal-contact-card-value">Registered Email, Business Name, Payment ID</div>
          </div>
          <div className="legal-contact-card">
            <div className="legal-contact-card-title">Processing Turnaround</div>
            <div className="legal-contact-card-value">24–48 Business Hours</div>
          </div>
        </div>
      </div>
    </LegalLayout>
  );
}
