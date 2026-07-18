import { useState, useEffect, useCallback, useRef } from "react";
import api, { type ApiResponse } from "../lib/api";

// ─── Types ───────────────────────────────────────────────────────

interface WhatsappInstance {
  _id: string;
  businessId: string;
  instanceName: string;
  provider: string;
  mode: string;
  status: "pending" | "connecting" | "qr_generated" | "connected" | "disconnected" | "error";
  connectedPhone: string;
  connectedAt: string | null;
  firstConnectedAt: string | null;
  messagingPausedAt: string | null;
  messagingPauseReason: string | null;
}

interface StatusResponse {
  status: string;
  instance: WhatsappInstance | null;
  liveStatus?: unknown;
}

interface ConnectResponse {
  qr?: { base64?: string; code?: string; pairingCode?: string };
  instance: WhatsappInstance;
  message?: string;
}

interface UsageData {
  configured: boolean;
  status?: string;
  provider?: string;
  messagingPaused?: boolean;
  messagingPauseReason?: string;
  warming?: { ageDays: number; warmupComplete: boolean; currentWarmupLimit: number | null };
  daily?: { sentToday: number; failedToday: number; limit: number; remaining: number };
  monthly?: { used: number; limit: number; remaining: number };
  quietHours?: { isQuiet: boolean; currentHour: number; nextAllowedHour: number };
}

interface MessageLogEntry {
  _id: string;
  messageType: string;
  message: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedReason: string | null;
  providerMessageId: string | null;
  customerId?: { name: string; phoneNormalized: string } | null;
}

// ─── Component ───────────────────────────────────────────────────

export default function WhatsAppPage() {
  // Connection state
  const [instance, setInstance] = useState<WhatsappInstance | null>(null);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Usage
  const [usage, setUsage] = useState<UsageData | null>(null);

  // Messages
  const [messages, setMessages] = useState<MessageLogEntry[]>([]);
  const [msgPage, setMsgPage] = useState(1);
  const [msgTotal, setMsgTotal] = useState(0);

  // Review request form
  const [rrPhone, setRrPhone] = useState("");
  const [rrName, setRrName] = useState("");
  const [rrSending, setRrSending] = useState(false);
  const [rrResult, setRrResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Test message
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Hello! This is a test message from ReviewBoost 🚀");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Pause
  const [pausing, setPausing] = useState(false);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Fetchers ─────────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<StatusResponse>>("/whatsapp/status");
      if (res.data.success && res.data.data) {
        const inst = res.data.data.instance;
        setInstance(inst);
        if (inst?.status === "connected") {
          setQrBase64(null);
          stopPolling();
        }
      }
    } catch { /* silent */ }
  }, []);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<UsageData>>("/whatsapp/usage");
      if (res.data.success && res.data.data) {
        setUsage(res.data.data);
      }
    } catch { /* silent */ }
  }, []);

  const fetchMessages = useCallback(async (page = 1) => {
    try {
      const res = await api.get<ApiResponse<{ messages: MessageLogEntry[]; pagination: { total: number } }>>(
        `/whatsapp/messages?page=${page}&limit=10`
      );
      if (res.data.success && res.data.data) {
        setMessages(res.data.data.messages);
        setMsgTotal(res.data.data.pagination.total);
        setMsgPage(page);
      }
    } catch { /* silent */ }
  }, []);

  // ─── Init ─────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStatus(), fetchUsage(), fetchMessages()]);
      setLoading(false);
    };
    init();
    return () => stopPolling();
  }, [fetchStatus, fetchUsage, fetchMessages]);

  // Auto-recover: if DB says qr_generated but we have no QR data, fetch a fresh QR
  useEffect(() => {
    if (!loading && instance && !qrBase64) {
      if (instance.status === "qr_generated") {
        // Stale QR state — auto-fetch a new QR and start polling
        (async () => {
          try {
            const res = await api.get<ApiResponse<{ qr?: { base64?: string }; needsQr: boolean }>>("/whatsapp/qr");
            if (res.data.success && res.data.data?.needsQr && res.data.data.qr) {
              setQrBase64(res.data.data.qr.base64 || null);
              startPolling();
            } else {
              // Instance may have reconnected — refresh status
              fetchStatus();
            }
          } catch {
            // QR fetch failed — reset to disconnected so Connect button shows
            setInstance((prev) => prev ? { ...prev, status: "disconnected" } : prev);
          }
        })();
      }
    }
  }, [loading, instance?.status]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Polling ──────────────────────────────────────────────────

  const startPolling = useCallback(() => {
    stopPolling();
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await api.get<ApiResponse<StatusResponse>>("/whatsapp/status");
        if (res.data.success && res.data.data) {
          const inst = res.data.data.instance;
          setInstance(inst);
          if (inst?.status === "connected") {
            setQrBase64(null);
            stopPolling();
            setSuccessMsg("WhatsApp connected successfully! 🎉");
            setTimeout(() => setSuccessMsg(""), 5000);
            fetchUsage();
          }
        }
      } catch { /* ignore */ }
    }, 5000);
  }, [fetchUsage]);

  function stopPolling() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }

  // ─── Actions ──────────────────────────────────────────────────

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    setQrBase64(null);
    try {
      const res = await api.post<ApiResponse<ConnectResponse>>("/whatsapp/connect");
      if (res.data.success && res.data.data) {
        const data = res.data.data;
        setInstance(data.instance);
        if (data.instance.status === "connected") {
          setSuccessMsg("Already connected! ✅");
          setTimeout(() => setSuccessMsg(""), 3000);
          fetchUsage();
        } else if (data.qr) {
          setQrBase64(data.qr.base64 || data.qr.code || null);
          startPolling();
        }
      } else {
        setError(res.data.error?.message || "Failed to connect");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect WhatsApp?")) return;
    setDisconnecting(true);
    setError(null);
    try {
      const res = await api.post<ApiResponse<{ instance: WhatsappInstance }>>("/whatsapp/disconnect");
      if (res.data.success && res.data.data) {
        setInstance(res.data.data.instance);
        setQrBase64(null);
        stopPolling();
        fetchUsage();
      }
    } catch {
      setError("Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleRefreshQr = async () => {
    try {
      const res = await api.get<ApiResponse<{ qr?: { base64?: string }; needsQr: boolean }>>("/whatsapp/qr");
      if (res.data.success && res.data.data?.needsQr && res.data.data.qr) {
        setQrBase64(res.data.data.qr.base64 || null);
      } else {
        fetchStatus();
      }
    } catch {
      setError("Failed to refresh QR");
    }
  };

  const handlePauseResume = async () => {
    setPausing(true);
    try {
      const isPaused = usage?.messagingPaused;
      const endpoint = isPaused ? "/whatsapp/resume" : "/whatsapp/pause";
      await api.post(endpoint, isPaused ? {} : { reason: "Manual pause" });
      await fetchUsage();
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
      const res = await api.post<ApiResponse<{ messageLogId: string }>>("/whatsapp/send-review-request", {
        phone: rrPhone.trim(),
        customerName: rrName.trim() || undefined,
      });
      if (res.data.success) {
        setRrResult({ type: "success", msg: "Review request sent! ✅" });
        setRrPhone("");
        setRrName("");
        fetchUsage();
        fetchMessages();
      } else {
        setRrResult({ type: "error", msg: res.data.error?.message || "Failed" });
      }
    } catch (err: unknown) {
      setRrResult({ type: "error", msg: err instanceof Error ? err.message : "Failed" });
    } finally {
      setRrSending(false);
      setTimeout(() => setRrResult(null), 5000);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim() || !testMessage.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await api.post<ApiResponse<{ message: string }>>("/whatsapp/send-test", {
        phone: testPhone.trim(),
        message: testMessage.trim(),
      });
      if (res.data.success) {
        setSendResult({ type: "success", msg: "Message sent! ✅" });
      } else {
        setSendResult({ type: "error", msg: res.data.error?.message || "Failed" });
      }
    } catch (err: unknown) {
      setSendResult({ type: "error", msg: err instanceof Error ? err.message : "Failed" });
    } finally {
      setSending(false);
      setTimeout(() => setSendResult(null), 5000);
    }
  };

  // ─── Derived ──────────────────────────────────────────────────

  const isConnected = instance?.status === "connected";
  const isQrPhase = instance?.status === "qr_generated" || qrBase64 !== null;

  // ─── Render ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="db-page animate-fade-in">
        <div className="db-loading-overlay"><div className="loading-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="db-page animate-fade-in">
      <div className="db-topbar">
        <div>
          <h1 className="db-title">WhatsApp</h1>
          <p className="db-subtitle">Connect, send review requests, and manage messaging</p>
        </div>
      </div>

      {error && (
        <div className="db-error" role="alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {successMsg && <div className="wa-success-toast" role="status">{successMsg}</div>}

      {/* ──── Connection Card ──── */}
      <div className="wa-card">
        <div className="wa-card-header">
          <div className="wa-card-icon">
            <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="#25D366" />
              <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" stroke="#25D366" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
          <div>
            <h2 className="wa-card-title">WhatsApp Connection</h2>
            <p className="wa-card-desc">{isConnected ? "Connected and ready" : isQrPhase ? "Scan QR code to connect" : "Connect to get started"}</p>
          </div>
          <div className={`wa-status-badge wa-status-${instance?.status || "disconnected"}`}>
            <span className="wa-status-dot" />
            {isConnected ? "Connected" : instance?.status === "qr_generated" ? "Awaiting Scan" : "Disconnected"}
          </div>
        </div>

        <div className="wa-card-body">
          {isConnected && (
            <div className="wa-connected-info">
              <div className="wa-info-row">
                <span className="wa-info-label">Phone</span>
                <span className="wa-info-value">{instance?.connectedPhone ? `+${instance.connectedPhone}` : "Connected"}</span>
              </div>
              <div className="wa-info-row">
                <span className="wa-info-label">Provider</span>
                <span className="wa-info-value wa-provider-badge">Evolution (Baileys)</span>
              </div>
              <button className="wa-btn wa-btn-danger" onClick={handleDisconnect} disabled={disconnecting}>
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          )}

          {!isConnected && isQrPhase && qrBase64 && (
            <div className="wa-qr-section">
              <div className="wa-qr-container">
                <img src={qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`} alt="QR Code" className="wa-qr-image" />
              </div>
              <div className="wa-qr-instructions">
                <p className="wa-qr-step"><strong>1.</strong> Open WhatsApp → <strong>Linked Devices → Link a Device</strong></p>
                <p className="wa-qr-step"><strong>2.</strong> Point camera at this QR code</p>
              </div>
              <button className="wa-btn wa-btn-secondary" onClick={handleRefreshQr}>Refresh QR Code</button>
            </div>
          )}

          {!isConnected && !isQrPhase && (
            <div className="wa-disconnected-section">
              <div className="wa-disconnected-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
                </svg>
              </div>
              <p className="wa-disconnected-text">Connect your WhatsApp to send review requests and campaign messages.</p>
              <button className="wa-btn wa-btn-primary" onClick={handleConnect} disabled={connecting}>
                {connecting ? <><span className="wa-btn-spinner" /> Connecting...</> : "Connect WhatsApp"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ──── Usage Card ──── */}
      {isConnected && usage?.configured && (
        <div className="wa-card">
          <div className="wa-card-header">
            <div className="wa-card-icon wa-card-icon-blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="24" height="24">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <h2 className="wa-card-title">Usage & Limits</h2>
              <p className="wa-card-desc">Warming progress, daily sends, and credits</p>
            </div>
            <button className="wa-btn wa-btn-sm" onClick={handlePauseResume} disabled={pausing} style={{
              background: usage.messagingPaused ? "#f0fdf4" : "#fef2f2",
              color: usage.messagingPaused ? "#15803d" : "#dc2626",
              border: `1px solid ${usage.messagingPaused ? "rgba(34,197,94,0.2)" : "rgba(220,38,38,0.15)"}`,
            }}>
              {pausing ? "..." : usage.messagingPaused ? "▶ Resume" : "⏸ Pause"}
            </button>
          </div>

          {usage.messagingPaused && (
            <div className="wa-paused-banner">
              ⚠️ Messaging is paused{usage.messagingPauseReason ? `: ${usage.messagingPauseReason}` : ""}
            </div>
          )}

          <div className="wa-usage-grid">
            <div className="wa-usage-item">
              <span className="wa-usage-label">Warm-up Day</span>
              <span className="wa-usage-value">{usage.warming?.ageDays ?? 0}</span>
              <span className="wa-usage-sub">{usage.warming?.warmupComplete ? "✅ Complete" : `Limit: ${usage.warming?.currentWarmupLimit}/day`}</span>
            </div>
            <div className="wa-usage-item">
              <span className="wa-usage-label">Today</span>
              <span className="wa-usage-value">{usage.daily?.sentToday ?? 0} / {usage.daily?.limit ?? 0}</span>
              <span className="wa-usage-sub">{usage.daily?.remaining ?? 0} remaining</span>
            </div>
            <div className="wa-usage-item">
              <span className="wa-usage-label">Monthly Credits</span>
              <span className="wa-usage-value">{usage.monthly?.used ?? 0} / {usage.monthly?.limit ?? 0}</span>
              <span className="wa-usage-sub">{usage.monthly?.remaining ?? 0} remaining</span>
            </div>
            <div className="wa-usage-item">
              <span className="wa-usage-label">Quiet Hours</span>
              <span className="wa-usage-value">{usage.quietHours?.isQuiet ? "🌙 Active" : "☀️ Open"}</span>
              <span className="wa-usage-sub">9 PM – 8 AM</span>
            </div>
          </div>
        </div>
      )}

      {/* ──── Send Review Request Card ──── */}
      {isConnected && (
        <div className="wa-card">
          <div className="wa-card-header">
            <div className="wa-card-icon wa-card-icon-green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="24" height="24">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div>
              <h2 className="wa-card-title">Send Review Request</h2>
              <p className="wa-card-desc">Send a WhatsApp review request to a customer</p>
            </div>
          </div>
          <form className="wa-test-form" onSubmit={handleSendReviewRequest}>
            <div className="wa-form-row">
              <div className="wa-form-group" style={{ flex: 1 }}>
                <label className="wa-form-label" htmlFor="rr-phone">Phone Number *</label>
                <input id="rr-phone" className="wa-form-input" type="text" placeholder="919876543210" value={rrPhone} onChange={(e) => setRrPhone(e.target.value)} />
              </div>
              <div className="wa-form-group" style={{ flex: 1 }}>
                <label className="wa-form-label" htmlFor="rr-name">Customer Name</label>
                <input id="rr-name" className="wa-form-input" type="text" placeholder="Optional" value={rrName} onChange={(e) => setRrName(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="wa-btn wa-btn-primary" disabled={rrSending || !rrPhone.trim()}>
              {rrSending ? <><span className="wa-btn-spinner" /> Sending...</> : "Send Review Request"}
            </button>
            {rrResult && <div className={`wa-send-result wa-send-${rrResult.type}`}>{rrResult.msg}</div>}
          </form>
        </div>
      )}

      {/* ──── Test Message Card ──── */}
      {isConnected && (
        <div className="wa-card">
          <div className="wa-card-header">
            <div className="wa-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="24" height="24">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="wa-card-title">Send Test Message</h2>
              <p className="wa-card-desc">Verify your connection</p>
            </div>
          </div>
          <form className="wa-test-form" onSubmit={handleSendTest}>
            <div className="wa-form-group">
              <label className="wa-form-label" htmlFor="wa-test-phone">Phone Number</label>
              <input id="wa-test-phone" className="wa-form-input" type="text" placeholder="919876543210" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
            </div>
            <div className="wa-form-group">
              <label className="wa-form-label" htmlFor="wa-test-message">Message</label>
              <textarea id="wa-test-message" className="wa-form-textarea" value={testMessage} onChange={(e) => setTestMessage(e.target.value)} rows={2} />
            </div>
            <button type="submit" className="wa-btn wa-btn-primary" disabled={sending || !testPhone.trim()}>
              {sending ? <><span className="wa-btn-spinner" /> Sending...</> : "Send Test"}
            </button>
            {sendResult && <div className={`wa-send-result wa-send-${sendResult.type}`}>{sendResult.msg}</div>}
          </form>
        </div>
      )}

      {/* ──── Recent Messages ──── */}
      {isConnected && (
        <div className="wa-card">
          <div className="wa-card-header">
            <div className="wa-card-icon wa-card-icon-purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="24" height="24">
                <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>
            <div>
              <h2 className="wa-card-title">Recent Messages</h2>
              <p className="wa-card-desc">{msgTotal} total messages</p>
            </div>
            <button className="wa-btn wa-btn-secondary wa-btn-sm" onClick={() => fetchMessages(msgPage)}>↻ Refresh</button>
          </div>

          {messages.length === 0 ? (
            <p className="wa-empty-text">No messages yet. Send your first review request above!</p>
          ) : (
            <>
              <div className="wa-messages-table-wrap">
                <table className="wa-messages-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Sent</th>
                      <th>Delivered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((m) => (
                      <tr key={m._id}>
                        <td>
                          <span className="wa-msg-customer">{m.customerId?.name || "—"}</span>
                          <span className="wa-msg-phone">{m.customerId?.phoneNormalized || "—"}</span>
                        </td>
                        <td><span className={`wa-msg-type wa-type-${m.messageType}`}>{m.messageType.replace(/_/g, " ")}</span></td>
                        <td><span className={`wa-msg-status wa-mstatus-${m.status}`}>{m.status}</span></td>
                        <td className="wa-msg-time">{m.sentAt ? new Date(m.sentAt).toLocaleTimeString() : "—"}</td>
                        <td className="wa-msg-time">
                          {m.readAt ? `Read ${new Date(m.readAt).toLocaleTimeString()}`
                            : m.deliveredAt ? `✓✓ ${new Date(m.deliveredAt).toLocaleTimeString()}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {msgTotal > 10 && (
                <div className="wa-pagination">
                  <button className="wa-btn wa-btn-secondary wa-btn-sm" disabled={msgPage <= 1} onClick={() => fetchMessages(msgPage - 1)}>← Prev</button>
                  <span className="wa-page-info">Page {msgPage} of {Math.ceil(msgTotal / 10)}</span>
                  <button className="wa-btn wa-btn-secondary wa-btn-sm" disabled={msgPage >= Math.ceil(msgTotal / 10)} onClick={() => fetchMessages(msgPage + 1)}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
