import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const consent = localStorage.getItem("rb_cookie_consent");
    if (!consent) {
      // Don't show cookie banner immediately on public customer review flow to avoid obstructing flow
      if (!location.pathname.startsWith("/r/")) {
        const timer = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(timer);
      }
    }
  }, [location.pathname]);

  if (!visible) return null;

  const handleChoice = (type: "accepted" | "essential") => {
    localStorage.setItem("rb_cookie_consent", type);
    setVisible(false);
  };

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie consent banner">
      <div className="cookie-text">
        We use essential cookies and diagnostic telemetry to ensure our platform operates securely and to analyze performance in compliance with our{" "}
        <Link to="/privacy" onClick={() => setVisible(false)}>
          Privacy Policy
        </Link>.
      </div>
      <div className="cookie-actions">
        <button
          type="button"
          className="cookie-btn-decline"
          onClick={() => handleChoice("essential")}
        >
          Essential Only
        </button>
        <button
          type="button"
          className="cookie-btn-accept"
          onClick={() => handleChoice("accepted")}
        >
          Accept All
        </button>
      </div>
    </div>
  );
}
