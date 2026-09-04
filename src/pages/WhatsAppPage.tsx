import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "../providers/SocketProvider";
import { useCurrentBusiness } from "../hooks/queries/useBusiness";
import "./whatsapp.css";

import {
  useWhatsappStatusRaw,
  useWhatsappUsage,
  useWhatsappMessages,
  useWhatsappQr,
  useConnectWhatsapp,
  useDisconnectWhatsapp,
  usePauseMessaging,
  useResumeMessaging,
  useSendReviewRequest,
  useSendTestMessage,
} from "../hooks/queries/useWhatsapp";
import { RecentMessagesCard } from "../components/whatsapp/RecentMessagesCard";

// ─── Template Presets ───────────────────────────────────────────────

interface TemplatePreset {
  id: "warm" | "review_request" | "direct";
  name: string;
  desc: string;
  text: string;
}

const TEMPLATES: TemplatePreset[] = [
  {
    id: "warm",
    name: "Friendly Warm",
    desc: "Gentle gratitude with warm tone",
    text: "Hi {name}! Thanks for visiting {business}. 🙏\n\nWe would truly appreciate your feedback! Could you take 30 seconds to rate your experience with us?",
  },
  {
    id: "review_request",
    name: "Direct Review Ask",
    desc: "Professional & high-converting",
    text: "Hi {name}! Thank you for visiting {business}. 🙏\n\nWe strive for excellence and would greatly appreciate your feedback to help us serve you better:",
  },
  {
    id: "direct",
    name: "Quick Direct",
    desc: "Fast, 5-star direct link ask",
    text: "Hi {name}, quick favor from {business}! ⭐\n\nGot 30 seconds to rate your experience with us today?",
  },
];

export default function WhatsAppPage() {
  const [qrBase64, setQrBase64] = useState<string | null>(null);

  // Poll faster (5s) during QR phase to quickly detect connection after scan
  const statusPollMs = qrBase64 ? 5000 : 30000;
  const { data: statusData, isLoading, refetch: fetchStatus } = useWhatsappStatusRaw(statusPollMs);
  const instance = statusData?.instance || null;
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const { data: usage } = useWhatsappUsage();
  const { data: business } = useCurrentBusiness();

  const [msgPage, setMsgPage] = useState(1);
  const { data: messagesData, refetch: fetchMessages } = useWhatsappMessages(msgPage);
  const messages = messagesData?.messages || [];
  const msgTotal = messagesData?.total || 0;

  const connectMut = useConnectWhatsapp();
  const disconnectMut = useDisconnectWhatsapp();
  const pauseMut = usePauseMessaging();
  const resumeMut = useResumeMessaging();
  const sendReviewMut = useSendReviewRequest();
  const sendTestMut = useSendTestMessage();
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  // Review request form & preview state
  const [rrPhone, setRrPhone] = useState("");
  const [rrName, setRrName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplatePreset["id"]>("warm");
  const [rrSending, setRrSending] = useState(false);
  const [rrResult, setRrResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Test message
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Hello! This is a test message from ReviewBoost 🚀");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Pause
  const [pausing, setPausing] = useState(false);

  const isConnected = instance?.status === "connected";
  const isQrPhase = instance?.status === "qr_generated" || qrBase64 !== null;

  // Track connection state transitions to auto-trigger Test Popup on connect
  const prevConnectedRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (prevConnectedRef.current === false && isConnected) {
      setShowTestModal(true);
      setSuccessMsg("WhatsApp Connected Successfully! 🎉");
      setTimeout(() => setSuccessMsg(""), 4000);
    }
    prevConnectedRef.current = isConnected;
  }, [isConnected]);

  // Sync QR base64 state from instance status changes if needed
  useEffect(() => {
    if (isConnected) {
      setQrBase64(null);
    }
  }, [isConnected]);

  // Auto-recover: if DB says qr_generated but we have no QR data, fetch fresh QR
  const qrEnabled = !isLoading && !isConnected && (instance?.status === 'qr_generated' || qrBase64 !== null);
  const { data: qrQueryData } = useWhatsappQr(qrEnabled);

  // Sync QR data from query cache into local state
  useEffect(() => {
    if (qrQueryData?.needsQr && qrQueryData.qr?.base64) {
      setQrBase64(qrQueryData.qr.base64);
    } else if (qrQueryData && !qrQueryData.needsQr) {
      setQrBase64(null);
      fetchStatus();
    }
  }, [qrQueryData, fetchStatus]);

  // Listen for server-side auto-disconnect
  useEffect(() => {
    if (!socket) return;
    const handler = (payload: { reason: string; campaignsPaused?: number }) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp'] });
      setQrBase64(null);
      const campaignNote = payload.campaignsPaused
        ? ` ${payload.campaignsPaused} campaign(s) were paused.`
        : '';
      setError(
        `WhatsApp was auto-disconnected: ${payload.reason}.${campaignNote} Please reconnect by scanning QR.`
      );
    };
    socket.on('whatsapp:auto-disconnected', handler);
    return () => { socket.off('whatsapp:auto-disconnected', handler); };
  }, [socket, queryClient]);

  // ─── Actions ──────────────────────────────────────────────────

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    setQrBase64(null);
    try {
      const data = await connectMut.mutateAsync();
      if (data.instance.status === "connected") {
        setSuccessMsg("Already connected! ✅");
        setTimeout(() => setSuccessMsg(""), 3000);
        setShowTestModal(true);
      } else if (data.qr) {
        setQrBase64(data.qr.base64 || data.qr.code || null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect");
    } finally {
      setConnecting(false);
    }
  };

  const triggerDisconnect = () => setShowDisconnectModal(true);

  const confirmDisconnect = async () => {
    setShowDisconnectModal(false);
    setDisconnecting(true);
    setError(null);
    try {
      await disconnectMut.mutateAsync();
      setQrBase64(null);
      setSuccessMsg("WhatsApp disconnected cleanly.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleRefreshQr = async () => {
    await queryClient.refetchQueries({ queryKey: ['whatsapp', 'qr'] });
  };

  const handlePauseResume = async () => {
    setPausing(true);
    try {
      const isPaused = usage?.messagingPaused;
      if (isPaused) {
        await resumeMut.mutateAsync();
      } else {
        await pauseMut.mutateAsync("Manual pause");
      }
      setSuccessMsg(isPaused ? "Messaging resumed ✅" : "Messaging paused ⏸️");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch {
      setError("Failed to update messaging status");
    } finally {
      setPausing(false);
    }
  };

  const handleSendReviewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rrPhone.trim()) return;
    setRrSending(true);
    setRrResult(null);
    try {
      await sendReviewMut.mutateAsync({
        phone: rrPhone.trim(),
        customerName: rrName.trim() || undefined,
      });
      setRrResult({ type: "success", msg: "Review request dispatched! 🚀 Customer will receive the WhatsApp message shortly." });
      setRrPhone("");
      setRrName("");
    } catch (err: any) {
      setRrResult({ type: "error", msg: err.message || "Failed to send review request" });
    } finally {
      setRrSending(false);
      setTimeout(() => setRrResult(null), 6000);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim() || !testMessage.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      await sendTestMut.mutateAsync({
        phone: testPhone.trim(),
        message: testMessage.trim(),
      });
      setSendResult({ type: "success", msg: "Test message sent successfully! ✅ Check your WhatsApp." });
    } catch (err: any) {
      setSendResult({ type: "error", msg: err.message || "Failed to send test message" });
    } finally {
      setSending(false);
      setTimeout(() => setSendResult(null), 5000);
    }
  };

  // Interpolate live preview message
  const currentTemplate = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];
  const businessName = business?.name || "ReviewBoost Demo";
  const customerDisplayName = rrName.trim() || "Alex";
  const previewMessage = currentTemplate.text
    .replace(/{name}/g, customerDisplayName)
    .replace(/{business}/g, businessName);

  // Business initials
  const bInitials = businessName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "RB";

  // Calculations for Quota cards
  const dailySent = usage?.daily?.sentToday ?? 0;
  const dailyLimit = usage?.daily?.limit ?? 1;
  const dailyPct = Math.min(100, Math.round((dailySent / dailyLimit) * 100));
  const dailyRemaining = usage?.daily?.remaining ?? 0;
  const dailyBarColor =
    dailyPct > 85
      ? "var(--brutal-coral)"
      : dailyPct > 60
      ? "var(--brutal-butter)"
      : "var(--brutal-mint)";

  const monthlyUsed = usage?.monthly?.used ?? 0;
  const monthlyLimit = usage?.monthly?.limit ?? 1;
  const monthlyPct = Math.min(100, Math.round((monthlyUsed / (monthlyLimit || 1)) * 100));
  const monthlyRemaining = usage?.monthly?.remaining ?? 0;
  const isMonthlyLow = monthlyLimit > 0 && (monthlyRemaining / monthlyLimit) < 0.2;

  const warmupDay = usage?.warming?.ageDays ?? 0;
  const isWarmupDone = usage?.warming?.warmupComplete;

  if (isLoading) {
    return (
      <div className="db-page animate-fade-in">
        <div className="db-loading-overlay"><div className="loading-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="db-page animate-fade-in">
      <div className="wa-page-container">
        {/* Topbar */}
        <div className="db-topbar">
          <div>
            <h1 className="db-title">WhatsApp Studio</h1>
            <p className="db-subtitle">Connect device, dispatch review requests, and monitor executive delivery quotas</p>
          </div>
          {isConnected && (
            <button
              type="button"
              className="wa-btn wa-btn-secondary"
              onClick={() => setShowTestModal(true)}
            >
              💬 Send Test Dispatch
            </button>
          )}
        </div>

        {error && (
          <div className="db-error" role="alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {successMsg && (
          <div className="wa-success-toast" role="status">
            <span>✨</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* ──── COMPONENT 1: Connection & QR Pairing Station ──── */}
        <div
          className={`wa-conn-card ${
            isConnected
              ? "wa-conn-connected"
              : isQrPhase
              ? "wa-conn-qr"
              : "wa-conn-disconnected"
          }`}
        >
          {/* STATE A: Connected */}
          {isConnected && (
            <div>
              <div className="wa-conn-active-header">
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div className="wa-card-icon">
                    <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                      <path
                        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"
                        fill="#065F46"
                      />
                      <path
                        d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"
                        stroke="#065F46"
                        strokeWidth="2"
                        fill="none"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="wa-card-title">WhatsApp Session Live</h2>
                    <p className="wa-card-desc">Active device connected and authorized for customer dispatching</p>
                  </div>
                </div>

                <div className="wa-conn-status-pill">
                  <span className="wa-conn-pulse-dot" />
                  <span>ONLINE & HEALTHY</span>
                </div>
              </div>

              <div className="wa-conn-details-grid">
                <div className="wa-conn-meta-box">
                  <span className="wa-conn-meta-label">Connected Phone Number</span>
                  <div className="wa-conn-meta-val">
                    <span>📱</span>
                    <span>{instance?.connectedPhone ? `+${instance.connectedPhone}` : "Connected"}</span>
                  </div>
                </div>
                <div className="wa-conn-meta-box">
                  <span className="wa-conn-meta-label">Gateway Engine</span>
                  <div className="wa-conn-meta-val">
                    <span>⚡</span>
                    <span>Evolution (Baileys)</span>
                  </div>
                </div>
                <div className="wa-conn-meta-box">
                  <span className="wa-conn-meta-label">Instance Status</span>
                  <div className="wa-conn-meta-val" style={{ color: "#065F46" }}>
                    <span>✅ Ready to Dispatch</span>
                  </div>
                </div>
              </div>

              <div className="wa-conn-actions">
                <button
                  type="button"
                  className="wa-btn wa-btn-secondary"
                  onClick={() => setShowTestModal(true)}
                >
                  💬 Send Test Message
                </button>
                <button
                  type="button"
                  className="wa-btn wa-btn-danger"
                  onClick={triggerDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? "Disconnecting..." : "Disconnect Device"}
                </button>
              </div>
            </div>
          )}

          {/* STATE B: QR Pairing Station */}
          {!isConnected && isQrPhase && qrBase64 && (
            <div className="wa-qr-station">
              <div className="wa-qr-header-bar">
                <span>⚡ SCAN QR CODE TO PAIR</span>
              </div>
              <h2 className="wa-card-title" style={{ fontSize: "1.4rem" }}>
                Connect Your WhatsApp Account
              </h2>
              <p className="wa-card-desc" style={{ maxWidth: "420px", textAlign: "center" }}>
                Open WhatsApp on your phone, go to Linked Devices, and point your camera at the matrix below.
              </p>

              <div className="wa-qr-frame">
                <img
                  src={qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                  alt="WhatsApp QR Code"
                />
              </div>

              <div className="wa-qr-steps">
                <div className="wa-step-item">
                  <span className="wa-step-num">1</span>
                  <span>Open WhatsApp → Settings → <strong>Linked Devices</strong></span>
                </div>
                <div className="wa-step-item">
                  <span className="wa-step-num">2</span>
                  <span>Tap <strong>Link a Device</strong> and point at the QR code above</span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.25rem" }}>
                <div className="wa-qr-pulse-indicator">
                  <span className="wa-qr-pulse-dot" />
                  <span>Waiting for scan & verification…</span>
                </div>
                <button
                  type="button"
                  className="wa-btn wa-btn-secondary wa-btn-sm"
                  onClick={handleRefreshQr}
                >
                  ↻ Refresh QR
                </button>
              </div>
            </div>
          )}

          {/* STATE C: Disconnected */}
          {!isConnected && !isQrPhase && (
            <div className="wa-disc-wrap">
              <div className="wa-disc-icon-bob">
                <svg viewBox="0 0 24 24" fill="none" width="36" height="36">
                  <path
                    d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"
                    fill="#1A1A1A"
                  />
                  <path
                    d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"
                    stroke="#1A1A1A"
                    strokeWidth="2.5"
                    fill="none"
                  />
                </svg>
              </div>

              <div>
                <h2 className="wa-disc-title">Connect WhatsApp Device</h2>
                <p className="wa-card-desc" style={{ maxWidth: "440px", marginTop: "0.35rem" }}>
                  Link your WhatsApp account to enable 1-click review request dispatches and automated drip sequences.
                </p>
              </div>

              <div className="wa-disc-benefits">
                <span className="wa-benefit-pill">⚡ Instant Review Requests</span>
                <span className="wa-benefit-pill">👁️ Live Read Receipts</span>
                <span className="wa-benefit-pill">🛡️ Anti-Ban Warmup Engine</span>
                <span className="wa-benefit-pill">🌙 Automated Quiet Hours</span>
              </div>

              <button
                type="button"
                className="wa-btn wa-btn-primary"
                style={{ padding: "0.85rem 2rem", fontSize: "1rem" }}
                onClick={handleConnect}
                disabled={connecting}
              >
                {connecting ? (
                  <>
                    <span className="wa-btn-spinner" /> Initializing Gateway...
                  </>
                ) : (
                  "Connect WhatsApp Now →"
                )}
              </button>
            </div>
          )}
        </div>

        {/* ──── COMPONENT 2: Executive Delivery Quota Dashboard (4 Cards) ──── */}
        {isConnected && usage?.configured && (
          <div className="wa-quota-section">
            <div className="wa-quota-header">
              <div className="wa-quota-title-row">
                <h2 className="wa-card-title" style={{ fontSize: "1.1rem" }}>Delivery Quotas & Health Engine</h2>
                <span className="wa-quota-badge">
                  {usage.planDisplayName ? `${usage.planDisplayName} Tier` : "Standard Plan"}
                </span>
              </div>

              <button
                type="button"
                className="wa-btn wa-btn-sm"
                onClick={handlePauseResume}
                disabled={pausing}
                style={{
                  background: usage.messagingPaused ? "var(--brutal-mint)" : "var(--brutal-coral)",
                  color: usage.messagingPaused ? "#065F46" : "#991B1B",
                }}
              >
                {pausing ? "..." : usage.messagingPaused ? "▶ Resume Messaging" : "⏸ Pause Messaging"}
              </button>
            </div>

            {usage.messagingPaused && (
              <div className="wa-killswitch-banner">
                <span>⚠️</span>
                <span>
                  <strong>Messaging is paused:</strong> {usage.messagingPauseReason || "Manual pause activated"}. Scheduled campaigns and review requests are held.
                </span>
              </div>
            )}

            <div className="wa-quota-grid">
              {/* Card 1: Daily Volume */}
              <div className="wa-quota-card wa-quota-card-mint">
                <div className="wa-qcard-top">
                  <span className="wa-qcard-label">Daily Volume</span>
                  <span className="wa-qcard-icon">📊</span>
                </div>
                <div>
                  <div className="wa-qcard-val">{dailySent} / {dailyLimit}</div>
                  <div className="wa-qcard-sub">{dailyRemaining} remaining today</div>
                  <div className="wa-quota-bar">
                    <div
                      className="wa-quota-fill"
                      style={{
                        width: `${dailyPct}%`,
                        background: dailyBarColor,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Monthly Credits */}
              <div className="wa-quota-card wa-quota-card-butter">
                <div className="wa-qcard-top">
                  <span className="wa-qcard-label">Monthly Credits</span>
                  <span className="wa-qcard-icon">💳</span>
                </div>
                <div>
                  <div className="wa-qcard-val">{monthlyUsed} / {monthlyLimit}</div>
                  <div className="wa-qcard-sub">
                    {monthlyLimit === 0 ? "Upgrade plan to send" : `${monthlyRemaining} remaining this cycle`}
                    {isMonthlyLow && <span style={{ color: "#991B1B", marginLeft: "4px" }}>⚠️ Low</span>}
                  </div>
                  <div className="wa-quota-bar">
                    <div
                      className="wa-quota-fill"
                      style={{
                        width: `${monthlyPct}%`,
                        background: isMonthlyLow ? "var(--brutal-coral)" : "var(--brutal-butter)",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Warm-up Status */}
              <div className="wa-quota-card wa-quota-card-sky">
                <div className="wa-qcard-top">
                  <span className="wa-qcard-label">Warm-up Status</span>
                  <span className="wa-qcard-icon">🛡️</span>
                </div>
                <div>
                  <div className="wa-qcard-val">Day {warmupDay}</div>
                  <div className="wa-qcard-sub">
                    {isWarmupDone ? "✅ Complete (Safe)" : `Limit: ${usage.warming?.currentWarmupLimit || 20}/day`}
                  </div>
                  <div className="wa-milestone-dots">
                    <span className={`wa-mdot ${warmupDay >= 1 ? "wa-mdot-active" : ""}`} title="Day 1" />
                    <span className={`wa-mdot ${warmupDay >= 7 ? "wa-mdot-active" : ""}`} title="Day 7" />
                    <span className={`wa-mdot ${warmupDay >= 14 ? "wa-mdot-active" : ""}`} title="Day 14" />
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, marginLeft: "4px" }}>
                      {isWarmupDone ? "100%" : `${Math.min(100, Math.round((warmupDay / 14) * 100))}%`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 4: Quiet Hours */}
              <div className="wa-quota-card wa-quota-card-cream">
                <div className="wa-qcard-top">
                  <span className="wa-qcard-label">Quiet Hours Guard</span>
                  <span className="wa-qcard-icon">{usage.quietHours?.isQuiet ? "🌙" : "☀️"}</span>
                </div>
                <div>
                  <div className="wa-qcard-val">
                    {usage.quietHours?.isQuiet ? "Active" : "Open"}
                  </div>
                  <div className="wa-qcard-sub">
                    {usage.quietHours?.isQuiet ? "Holds messages until 8 AM" : "Operating window (9 AM - 9 PM)"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ──── COMPONENT 3: Review Request Studio with Live Chat Bubble Preview ──── */}
        {isConnected && (
          <div className="wa-review-studio">
            {/* Left Column: Form Controls */}
            <div className="wa-studio-card">
              <div className="wa-card-header">
                <div className="wa-card-icon wa-card-icon-coral">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <div>
                  <h2 className="wa-card-title">Review Request Studio</h2>
                  <p className="wa-card-desc">Dispatch a personalized WhatsApp review invitation instantly</p>
                </div>
              </div>

              <form onSubmit={handleSendReviewRequest}>
                <div className="wa-form-row">
                  <div className="wa-form-group" style={{ flex: 1 }}>
                    <label className="wa-form-label" htmlFor="rr-phone">
                      Customer Phone *
                    </label>
                    <div className="wa-input-with-prefix">
                      <span className="wa-prefix-pill">+91</span>
                      <input
                        id="rr-phone"
                        className="wa-form-input"
                        type="tel"
                        placeholder="9876543210"
                        value={rrPhone}
                        onChange={(e) => setRrPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="wa-form-group" style={{ flex: 1 }}>
                    <label className="wa-form-label" htmlFor="rr-name">
                      Customer Name (Optional)
                    </label>
                    <input
                      id="rr-name"
                      className="wa-form-input-standard"
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={rrName}
                      onChange={(e) => setRrName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Template Selector */}
                <div className="wa-form-group">
                  <label className="wa-form-label">Select Message Template Preset</label>
                  <div className="wa-templates-selector">
                    {TEMPLATES.map((tmpl) => {
                      const isActive = selectedTemplate === tmpl.id;
                      return (
                        <button
                          key={tmpl.id}
                          type="button"
                          className={`wa-template-pill-btn ${isActive ? "active" : ""}`}
                          onClick={() => setSelectedTemplate(tmpl.id)}
                        >
                          <input
                            type="radio"
                            className="wa-t-radio"
                            checked={isActive}
                            readOnly
                          />
                          <div className="wa-t-info">
                            <span className="wa-t-title">{tmpl.name}</span>
                            <span className="wa-t-desc">{tmpl.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="wa-btn wa-btn-primary"
                  style={{ width: "100%", padding: "0.85rem", fontSize: "0.95rem" }}
                  disabled={rrSending || !rrPhone.trim()}
                >
                  {rrSending ? (
                    <>
                      <span className="wa-btn-spinner" /> Dispatching Request...
                    </>
                  ) : (
                    "🚀 Dispatch Review Request"
                  )}
                </button>

                {rrResult && (
                  <div className={`wa-send-result wa-send-${rrResult.type}`}>
                    {rrResult.msg}
                  </div>
                )}
              </form>
            </div>

            {/* Right Column: Live Phone Frame Preview */}
            <div className="wa-preview-column">
              <div className="wa-preview-label">
                <span>📱 LIVE CUSTOMER PREVIEW</span>
              </div>

              <div className="wa-phone-frame">
                <div className="wa-phone-header">
                  <span className="wa-phone-avatar">{bInitials}</span>
                  <div className="wa-phone-contact-info">
                    <span className="wa-phone-contact">{businessName}</span>
                    <span className="wa-phone-status">Online</span>
                  </div>
                </div>

                <div className="wa-chat-area">
                  <div className="wa-bubble wa-bubble-incoming">
                    <p className="wa-bubble-text">{previewMessage}</p>
                    <div style={{ marginTop: "8px", borderTop: "1px dashed rgba(0,0,0,0.15)", paddingTop: "6px" }}>
                      <span style={{ fontSize: "0.75rem", color: "#0284C7", fontWeight: 700 }}>
                        ⭐ g.page/r/your-review-link
                      </span>
                    </div>
                    <div className="wa-bubble-meta">
                      <span className="wa-bubble-time">10:42 AM</span>
                      <span className="wa-bubble-ticks">✓✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ──── COMPONENT 4: Test Dispatcher Modal ──── */}
        {showTestModal && (
          <div className="wa-modal-overlay" onClick={() => setShowTestModal(false)}>
            <div className="wa-modal" onClick={(e) => e.stopPropagation()}>
              <div className="wa-modal-header-between">
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div className="wa-card-icon wa-card-icon-blue" style={{ width: 38, height: 38 }}>
                    💬
                  </div>
                  <div>
                    <h2 className="wa-modal-title">Send Test Dispatch</h2>
                    <p className="wa-card-desc">Verify your WhatsApp connection in real-time</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="wa-modal-close"
                  onClick={() => setShowTestModal(false)}
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendTest}>
                <div className="wa-form-group">
                  <label className="wa-form-label" htmlFor="popup-test-phone">
                    Recipient Phone Number (with Country Code)
                  </label>
                  <input
                    id="popup-test-phone"
                    className="wa-form-input-standard"
                    type="text"
                    placeholder="e.g. 919876543210"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    autoFocus
                    required
                  />
                </div>

                <div className="wa-form-group">
                  <label className="wa-form-label" htmlFor="popup-test-message">
                    Message Content
                  </label>
                  <textarea
                    id="popup-test-message"
                    className="wa-form-textarea"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    rows={3}
                    required
                  />
                </div>

                {sendResult && (
                  <div className={`wa-send-result wa-send-${sendResult.type}`}>
                    {sendResult.msg}
                  </div>
                )}

                <div className="wa-modal-actions" style={{ marginTop: "1rem" }}>
                  <button
                    type="button"
                    className="wa-btn wa-btn-secondary"
                    onClick={() => setShowTestModal(false)}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="wa-btn wa-btn-primary"
                    disabled={sending || !testPhone.trim()}
                  >
                    {sending ? (
                      <>
                        <span className="wa-btn-spinner" /> Sending...
                      </>
                    ) : (
                      "Send Test Now"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ──── COMPONENT 5: Disconnect Confirmation Modal ──── */}
        {showDisconnectModal && (
          <div className="wa-modal-overlay" onClick={() => setShowDisconnectModal(false)}>
            <div className="wa-modal" onClick={(e) => e.stopPropagation()}>
              <div className="wa-modal-header">
                <div className="wa-modal-icon-danger">
                  ⚠️
                </div>
                <h2 className="wa-modal-title">Disconnect WhatsApp?</h2>
              </div>
              <div className="wa-modal-body">
                <p style={{ margin: "0 0 0.75rem 0" }}>
                  Are you sure you want to disconnect this device?
                </p>
                <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#666", fontSize: "0.825rem" }}>
                  <li>Active drip campaigns will pause immediately.</li>
                  <li>Review request dispatching will be disabled until reconnected.</li>
                  <li>You will need to scan a new QR code to re-link your phone.</li>
                </ul>
              </div>
              <div className="wa-modal-actions">
                <button
                  type="button"
                  className="wa-btn wa-btn-secondary"
                  onClick={() => setShowDisconnectModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="wa-btn wa-btn-danger"
                  onClick={confirmDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? "Disconnecting..." : "Yes, Disconnect"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ──── COMPONENT 6: Recent Activity & Delivery Log ──── */}
        {isConnected && (
          <RecentMessagesCard
            messages={messages}
            msgTotal={msgTotal}
            msgPage={msgPage}
            setMsgPage={setMsgPage}
            fetchMessages={fetchMessages}
          />
        )}
      </div>
    </div>
  );
}
