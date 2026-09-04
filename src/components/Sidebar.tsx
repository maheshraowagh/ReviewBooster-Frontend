import { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { useAuth, UserButton } from "@clerk/clerk-react";
import { useAuthStore } from "../stores/authStore";
import { HoverGifIcon } from "./HoverGifIcon";

const NAV_ITEMS = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    to: "/inbox",
    label: "Feedback Inbox",
    hasBadge: true,
    icon: <HoverGifIcon src="/icons8-comments.gif" alt="Feedback Inbox" className="sidebar-gif-icon" />,
  },
  {
    to: "/insights",
    label: "Insights",
    icon: <HoverGifIcon src="/icons8-pie-chart.gif" alt="Feedback Inbox" className="sidebar-gif-icon" />,

  },
  {
    to: "/local-seo",
    label: "Business Health",
    icon: <HoverGifIcon src="/icons8-health.gif" alt="Business Health" className="sidebar-gif-icon" />,
  },
  {
    to: "/qr-locations",
    label: "QR & Locations",
    icon: <HoverGifIcon src="/icons8-qr-code.gif" alt="QR & Locations" className="sidebar-gif-icon" />,
  },
  {
    to: "/whatsapp",
    label: "WhatsApp",
    icon: <HoverGifIcon src="/icons8-whatsapp.gif" alt="WhatsApp" className="sidebar-gif-icon" />,
  },
  {
    to: "/campaigns",
    label: "WA Campaigns",
    icon: <HoverGifIcon src="/icons8-letter.gif" alt="WhatsApp" className="sidebar-gif-icon" />,

  },
  {
    to: "/email-campaigns",
    label: "Email Campaigns",
    icon: <HoverGifIcon src="/icons8-mail.gif" alt="Email Campaigns" className="sidebar-gif-icon" />,
  },

  {
    to: "/settings",
    label: "Settings",
    icon: <HoverGifIcon src="/icons8-settings.gif" alt="Settings" className="sidebar-gif-icon" />,
  },
  {
    to: "/billing",
    label: "Plan & Billing",
    icon: <HoverGifIcon src="/icons8-dollar-bag.gif" alt="Plan & Billing" className="sidebar-gif-icon" />,
  },
  {
    to: "/help",
    label: "Help",
    icon: <HoverGifIcon src="/icons8-ask-question.gif" alt="Help" className="sidebar-gif-icon" />,
  },
];

interface SidebarProps {
  businessName?: string;
}

export default function Sidebar({ businessName }: SidebarProps) {
  const appUser = useAuthStore((state) => state.appUser);
  const { getToken } = useAuth();
  const [atRiskCount, setAtRiskCount] = useState(0);
  const [auditReady, setAuditReady] = useState(false);

  // Listen for audit completion via Socket.IO
  useEffect(() => {
    let socketInstance: any = null;
    const connectSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        const token = await getToken();
        if (!token) return;
        const url = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api$/, '');
        socketInstance = io(url, { auth: { token }, reconnectionDelay: 3000 });
        socketInstance.on('gbp-audit:ready', () => setAuditReady(true));
      } catch { /* ignore */ }
    };
    connectSocket();
    return () => { socketInstance?.disconnect(); };
  }, [getToken]);

  useEffect(() => {
    let es: EventSource | null = null;
    let closed = false;

    const connect = async () => {
      try {
        const token = await getToken();
        if (!token || closed) return;

        const base = import.meta.env.VITE_API_URL || '/api';
        const url = `${base}/inbox/badge-count/stream?token=${encodeURIComponent(token)}`;
        es = new EventSource(url);

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as { atRiskCount: number };
            setAtRiskCount(data.atRiskCount);
          } catch {
            // ignore malformed frames
          }
        };

        es.onerror = () => {
          es?.close();
          es = null;
          // Reconnect after 10 s if not intentionally closed
          if (!closed) setTimeout(connect, 10_000);
        };
      } catch {
        // Token fetch failed — retry later
        if (!closed) setTimeout(connect, 10_000);
      }
    };

    connect();

    return () => {
      closed = true;
      es?.close();
    };
  }, [getToken]);

  const isPopoverOpenRef = useRef(false);
  const lastClosedAtRef = useRef(0);

  useEffect(() => {
    const handleCapturePointerDown = () => {
      const popover = document.querySelector(
        '.cl-userButtonPopoverCard, .cl-userButtonPopoverRoot, .cl-userButton-popover, .cl-popover, [class*="userButtonPopover"], [class*="cl-popover"]'
      );
      if (popover) {
        isPopoverOpenRef.current = true;
      }
    };

    const observer = new MutationObserver(() => {
      const popover = document.querySelector(
        '.cl-userButtonPopoverCard, .cl-userButtonPopoverRoot, .cl-userButton-popover, .cl-popover, [class*="userButtonPopover"], [class*="cl-popover"]'
      );
      const isOpen = !!popover;
      if (isPopoverOpenRef.current && !isOpen) {
        lastClosedAtRef.current = Date.now();
      }
      isPopoverOpenRef.current = isOpen;
    });

    window.addEventListener('pointerdown', handleCapturePointerDown, { capture: true });
    window.addEventListener('mousedown', handleCapturePointerDown, { capture: true });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('pointerdown', handleCapturePointerDown, { capture: true });
      window.removeEventListener('mousedown', handleCapturePointerDown, { capture: true });
      observer.disconnect();
    };
  }, []);

  const handleUserMenuToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const justClosed = Date.now() - lastClosedAtRef.current < 400;
    if (isPopoverOpenRef.current || justClosed) {
      isPopoverOpenRef.current = false;
      return;
    }

    const btn = document.querySelector(
      '.sidebar-user-card .cl-userButtonTrigger'
    ) as HTMLElement;
    btn?.click();
  };

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <defs>
              <linearGradient
                id="logo-grad"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <polygon
              points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              stroke="url(#logo-grad)"
              fill="none"
            />
          </svg>
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">ReviewBoost</span>
          {businessName && (
            <span className="sidebar-business-name">{businessName}</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <p className="sidebar-nav-label">Menu</p>
        <div className="sidebar-nav-links">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/dashboard"}
              className={({ isActive }) =>
                `sidebar-nav-item${isActive ? " active" : ""}`
              }
              onClick={(e) => {
                // Prevent middle-click or ctrl+click from opening new tab
                if (e.button === 1 || e.ctrlKey || e.metaKey) {
                  e.preventDefault();
                }
                // Clear audit badge when visiting health page
                if (item.to === '/local-seo') setAuditReady(false);
              }}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span className="sidebar-nav-text">{item.label}</span>
              {item.hasBadge && atRiskCount > 0 && (
                <span className="sidebar-alert-badge">{atRiskCount}</span>
              )}
              {item.to === '/local-seo' && auditReady && (
                <span className="sidebar-audit-badge">New</span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User Profile Footer */}
      <div className="sidebar-footer">
        {appUser?.role === 'admin' && (
          <NavLink
            to="/admin/dashboard"
            className="sidebar-admin-link"
          >
            🛡️ Go to Admin Panel
          </NavLink>
        )}
        <div className="sidebar-user-card">
          <div className="sidebar-user-card-left">
            <UserButton afterSignOutUrl="/sign-in" />
            <div
              className="sidebar-user-card-info"
              style={{ cursor: "pointer" }}
              onClick={handleUserMenuToggle}
            >
              <span className="sidebar-user-card-name">
                {appUser?.name || appUser?.email?.split("@")[0] || "User"}
              </span>
              <span className="sidebar-user-card-email">
                {appUser?.email || ""}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-user-card-chevron"
            aria-label="User menu"
            onClick={handleUserMenuToggle}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
