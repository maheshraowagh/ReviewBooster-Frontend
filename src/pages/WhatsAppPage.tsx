import { useState, useEffect, useCallback, useRef } from "react";
import api, { type ApiResponse } from "../lib/api";

interface WhatsappInstance {
  _id: string;
  businessId: string;
  instanceName: string;
  provider: string;
  mode: string;
  status: "pending" | "qr_generated" | "connected" | "disconnected";
  connectedPhone: string;
  connectedAt: string | null;
  lastDisconnectedAt: string | null;
  lastWebhookEventAt: string | null;
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

export default function WhatsAppPage() {
  const [instance, setInstance] = useState<WhatsappInstance | null>(null);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Test message state
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState(
    "Hello! This is a test message from ReviewBoost 🚀"
  );
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ------ Fetch current status ------
  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<StatusResponse>>(
        "/whatsapp/status"
      );
      if (res.data.success && res.data.data) {
        const { instance: inst, status } = res.data.data;
        setInstance(inst);
        // If connected, stop QR polling
        if (status === "connected" || inst?.status === "connected") {
          setQrBase64(null);
          stopPolling();
        }
      }
    } catch {
      // Silently fail on status poll — non-critical
    }
  }, []);

  // ------ Initial load ------
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchStatus();
      setLoading(false);
    };
    init();
    return () => stopPolling();
  }, [fetchStatus]);

  // ------ Polling helpers ------
  const startPolling = useCallback(() => {
    stopPolling();
    // Poll status every 5s while waiting for QR scan
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await api.get<ApiResponse<StatusResponse>>(
          "/whatsapp/status"
        );
        if (res.data.success && res.data.data) {
          const inst = res.data.data.instance;
          setInstance(inst);
          if (inst?.status === "connected") {
            setQrBase64(null);
            stopPolling();
            setSuccessMsg("WhatsApp connected successfully! 🎉");
            setTimeout(() => setSuccessMsg(""), 5000);
          }
        }
      } catch {
        // ignore poll errors
      }
    }, 5000);
  }, []);

  function stopPolling() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }

  // ------ Connect ------
  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    setQrBase64(null);
    try {
      const res = await api.post<ApiResponse<ConnectResponse>>(
        "/whatsapp/connect"
      );
      if (res.data.success && res.data.data) {
        const data = res.data.data;
        setInstance(data.instance);

        if (data.instance.status === "connected") {
          setSuccessMsg("Already connected! ✅");
          setTimeout(() => setSuccessMsg(""), 3000);
        } else if (data.qr) {
          // QR code received — display it
          const base64 = data.qr.base64 || data.qr.code || null;
          setQrBase64(base64);
          startPolling();
        }
      } else {
        setError(res.data.error?.message || "Failed to connect");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to connect to WhatsApp";
      setError(msg);
    } finally {
      setConnecting(false);
    }
  };

  // ------ Disconnect ------
  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect WhatsApp?")) return;
    setDisconnecting(true);
    setError(null);
    try {
      const res = await api.post<ApiResponse<{ instance: WhatsappInstance }>>(
        "/whatsapp/disconnect"
      );
      if (res.data.success && res.data.data) {
        setInstance(res.data.data.instance);
        setQrBase64(null);
        stopPolling();
        setSuccessMsg("WhatsApp disconnected");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch {
      setError("Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  // ------ Refresh QR ------
  const handleRefreshQr = async () => {
    setError(null);
    try {
      const res = await api.get<
        ApiResponse<{ qr?: { base64?: string; code?: string }; needsQr: boolean }>
      >("/whatsapp/qr");
      if (res.data.success && res.data.data) {
        if (res.data.data.needsQr && res.data.data.qr) {
          setQrBase64(
            res.data.data.qr.base64 || res.data.data.qr.code || null
          );
        } else {
          // Already connected
          fetchStatus();
        }
      }
    } catch {
      setError("Failed to refresh QR code");
    }
  };

  // ------ Send Test Message ------
  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim() || !testMessage.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await api.post<ApiResponse<{ message: string }>>(
        "/whatsapp/send-test",
        {
          phone: testPhone.trim(),
          message: testMessage.trim(),
        }
      );
      if (res.data.success) {
        setSendResult({ type: "success", msg: "Message sent! ✅" });
      } else {
        setSendResult({
          type: "error",
          msg: res.data.error?.message || "Failed to send",
        });
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to send message";
      setSendResult({ type: "error", msg });
    } finally {
      setSending(false);
      setTimeout(() => setSendResult(null), 5000);
    }
  };

  // ------ Helpers ------
  const isConnected = instance?.status === "connected";
  const isQrPhase =
    instance?.status === "qr_generated" || qrBase64 !== null;
  const connectedDuration = instance?.connectedAt
    ? getTimeSince(instance.connectedAt)
    : null;

  // ------ Render ------
  if (loading) {
    return (
      <div className="db-page animate-fade-in">
        <div className="db-loading-overlay">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="db-page animate-fade-in">
      {/* Top bar */}
      <div className="db-topbar">
        <div>
          <h1 className="db-title">WhatsApp</h1>
          <p className="db-subtitle">
            Connect your WhatsApp number to send messages
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="db-error" role="alert">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="20"
            height="20"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* Success */}
      {successMsg && (
        <div className="wa-success-toast" role="status">
          {successMsg}
        </div>
      )}

      {/* Connection Card */}
      <div className="wa-card">
        <div className="wa-card-header">
          <div className="wa-card-icon">
            <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
              <path
                d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"
                fill="#25D366"
              />
              <path
                d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"
                stroke="#25D366"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
          </div>
          <div>
            <h2 className="wa-card-title">WhatsApp Connection</h2>
            <p className="wa-card-desc">
              {isConnected
                ? "Your WhatsApp is connected and ready to send messages"
                : "Connect your WhatsApp number to get started"}
            </p>
          </div>
          <div className={`wa-status-badge wa-status-${instance?.status || "disconnected"}`}>
            <span className="wa-status-dot" />
            {isConnected
              ? "Connected"
              : instance?.status === "qr_generated"
                ? "Scanning..."
                : "Disconnected"}
          </div>
        </div>

        <div className="wa-card-body">
          {/* Connected state */}
          {isConnected && (
            <div className="wa-connected-info">
              <div className="wa-info-row">
                <span className="wa-info-label">Phone Number</span>
                <span className="wa-info-value">
                  {instance?.connectedPhone
                    ? `+${instance.connectedPhone}`
                    : "Connected"}
                </span>
              </div>
              <div className="wa-info-row">
                <span className="wa-info-label">Connected For</span>
                <span className="wa-info-value">
                  {connectedDuration || "Just now"}
                </span>
              </div>
              <div className="wa-info-row">
                <span className="wa-info-label">Provider</span>
                <span className="wa-info-value wa-provider-badge">
                  Evolution (Baileys)
                </span>
              </div>
              <button
                className="wa-btn wa-btn-danger"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          )}

          {/* QR Code state */}
          {!isConnected && isQrPhase && qrBase64 && (
            <div className="wa-qr-section">
              <div className="wa-qr-container">
                <img
                  src={
                    qrBase64.startsWith("data:")
                      ? qrBase64
                      : `data:image/png;base64,${qrBase64}`
                  }
                  alt="WhatsApp QR Code"
                  className="wa-qr-image"
                />
              </div>
              <div className="wa-qr-instructions">
                <p className="wa-qr-step">
                  <strong>1.</strong> Open WhatsApp on your phone
                </p>
                <p className="wa-qr-step">
                  <strong>2.</strong> Tap{" "}
                  <strong>Menu ⋮ → Linked Devices → Link a Device</strong>
                </p>
                <p className="wa-qr-step">
                  <strong>3.</strong> Point your phone camera at this QR code
                </p>
              </div>
              <button
                className="wa-btn wa-btn-secondary"
                onClick={handleRefreshQr}
              >
                Refresh QR Code
              </button>
            </div>
          )}

          {/* Not configured / disconnected state */}
          {!isConnected && !isQrPhase && (
            <div className="wa-disconnected-section">
              <div className="wa-disconnected-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  width="48"
                  height="48"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
                </svg>
              </div>
              <p className="wa-disconnected-text">
                Connect your WhatsApp number to start sending review requests,
                alerts, and campaign messages.
              </p>
              <button
                className="wa-btn wa-btn-primary"
                onClick={handleConnect}
                disabled={connecting}
              >
                {connecting ? (
                  <>
                    <span className="wa-btn-spinner" /> Connecting...
                  </>
                ) : (
                  "Connect WhatsApp"
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Test Message Card — only when connected */}
      {isConnected && (
        <div className="wa-card wa-card-test">
          <div className="wa-card-header">
            <div className="wa-card-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                width="24"
                height="24"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="wa-card-title">Send Test Message</h2>
              <p className="wa-card-desc">
                Verify your connection by sending a test message
              </p>
            </div>
          </div>
          <form className="wa-test-form" onSubmit={handleSendTest}>
            <div className="wa-form-group">
              <label className="wa-form-label" htmlFor="wa-test-phone">
                Phone Number
              </label>
              <input
                id="wa-test-phone"
                className="wa-form-input"
                type="text"
                placeholder="919876543210 (with country code)"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
            </div>
            <div className="wa-form-group">
              <label className="wa-form-label" htmlFor="wa-test-message">
                Message
              </label>
              <textarea
                id="wa-test-message"
                className="wa-form-textarea"
                placeholder="Type your test message..."
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={3}
              />
            </div>
            <button
              type="submit"
              className="wa-btn wa-btn-primary"
              disabled={sending || !testPhone.trim() || !testMessage.trim()}
            >
              {sending ? (
                <>
                  <span className="wa-btn-spinner" /> Sending...
                </>
              ) : (
                "Send Test Message"
              )}
            </button>
            {sendResult && (
              <div
                className={`wa-send-result wa-send-${sendResult.type}`}
                role="status"
              >
                {sendResult.msg}
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

// ------ Utility ------
function getTimeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}
