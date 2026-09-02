import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

interface LegalLayoutProps {
  children: ReactNode;
}

export default function LegalLayout({ children }: LegalLayoutProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="legal-layout">
      {/* Navigation Header */}
      <header className="legal-header">
        <div className="legal-header-inner">
          <Link to="/" className="legal-logo-link">
            <span className="legal-logo-badge">RB</span>
            <span>ReviewBooster</span>
          </Link>

          <nav className="legal-nav-links">
            <Link
              to="/privacy"
              className={`legal-nav-link ${currentPath === "/privacy" ? "active" : ""}`}
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className={`legal-nav-link ${currentPath === "/terms" ? "active" : ""}`}
            >
              Terms
            </Link>
            <Link
              to="/refund"
              className={`legal-nav-link ${currentPath === "/refund" ? "active" : ""}`}
            >
              Refunds
            </Link>
            <Link
              to="/contact"
              className={`legal-nav-link ${currentPath === "/contact" ? "active" : ""}`}
            >
              Contact
            </Link>
            <Link to="/sign-in" className="legal-btn-login">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="legal-main">
        <div className="legal-card">{children}</div>
      </main>

      {/* Global Compliance Footer */}
      <footer className="legal-footer">
        <div className="legal-footer-inner">
          <div className="legal-footer-links">
            <Link to="/privacy" className="legal-footer-link">
              Privacy Policy
            </Link>
            <Link to="/terms" className="legal-footer-link">
              Terms of Service
            </Link>
            <Link to="/refund" className="legal-footer-link">
              Refund & Cancellation
            </Link>
            <Link to="/contact" className="legal-footer-link">
              Contact & Support
            </Link>
          </div>
          <div className="legal-footer-copy">
            © {new Date().getFullYear()} ReviewBooster. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
