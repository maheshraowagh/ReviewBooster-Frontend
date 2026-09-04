import type { MessageLogEntry } from "../../services/whatsappService";

interface RecentMessagesCardProps {
  messages: MessageLogEntry[];
  msgTotal: number;
  msgPage: number;
  setMsgPage: (page: number) => void;
  fetchMessages: () => void;
}

const AVATAR_COLORS = [
  "wa-msg-avatar-mint",
  "wa-msg-avatar-butter",
  "wa-msg-avatar-sky",
  "wa-msg-avatar-coral",
  "wa-msg-avatar-purple",
];

function getStatusDetails(status: string) {
  switch (status) {
    case "created":
    case "queued":
    case "sending":
      return { label: status, icon: "⏳", cls: "wa-mstatus-pending" };
    case "accepted":
    case "sent":
      return { label: status, icon: "📤", cls: "wa-mstatus-sent" };
    case "delivered":
      return { label: "delivered", icon: "✓✓", cls: "wa-mstatus-delivered" };
    case "read":
      return { label: "read", icon: "👁️", cls: "wa-mstatus-read" };
    case "failed":
      return { label: "failed", icon: "⚠️", cls: "wa-mstatus-failed" };
    case "suppressed":
      return { label: "suppressed", icon: "🚫", cls: "wa-mstatus-suppressed" };
    default:
      return { label: status, icon: "•", cls: "wa-mstatus-pending" };
  }
}

function getInitials(name?: string) {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function RecentMessagesCard({
  messages,
  msgTotal,
  msgPage,
  setMsgPage,
  fetchMessages,
}: RecentMessagesCardProps) {
  const totalPages = Math.max(1, Math.ceil(msgTotal / 10));

  return (
    <div className="wa-table-card">
      <div className="wa-card-header">
        <div className="wa-card-icon wa-card-icon-purple">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        </div>
        <div>
          <h2 className="wa-card-title">Recent Delivery Activity</h2>
          <p className="wa-card-desc">{msgTotal} total messages logged in current session</p>
        </div>
        <button
          type="button"
          className="wa-btn wa-btn-secondary wa-btn-sm"
          style={{ marginLeft: "auto" }}
          onClick={() => fetchMessages()}
        >
          ↻ Refresh Log
        </button>
      </div>

      {messages.length === 0 ? (
        <p className="wa-empty-text">No messages dispatched yet. Send your first review request above! 🚀</p>
      ) : (
        <>
          <div className="wa-messages-table-wrap">
            <table className="wa-messages-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Dispatched</th>
                  <th>Delivery / Read</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m, idx) => {
                  const statusInfo = getStatusDetails(m.status);
                  const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                  const customerName = m.customerId?.name || "Customer";
                  const initials = getInitials(m.customerId?.name);

                  return (
                    <tr key={m._id}>
                      <td>
                        <div className="wa-cust-cell">
                          <div className={`wa-msg-avatar ${avatarColor}`}>
                            {initials}
                          </div>
                          <div>
                            <span className="wa-msg-customer">{customerName}</span>
                            <span className="wa-msg-phone">{m.customerId?.phoneNormalized || "—"}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`wa-msg-type wa-type-${m.messageType}`}>
                          {m.messageType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>
                        <span className={`wa-msg-status ${statusInfo.cls}`}>
                          <span>{statusInfo.icon}</span>
                          <span>{statusInfo.label}</span>
                        </span>
                      </td>
                      <td className="wa-msg-time">
                        {m.sentAt ? new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                      </td>
                      <td className="wa-msg-time">
                        {m.readAt ? (
                          <span style={{ color: "#065F46", fontWeight: 700 }}>
                            👁️ Read {new Date(m.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : m.deliveredAt ? (
                          <span style={{ color: "#0369A1", fontWeight: 700 }}>
                            ✓✓ {new Date(m.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {msgTotal > 10 && (
            <div className="wa-pagination">
              <button
                type="button"
                className="wa-btn wa-btn-secondary wa-btn-sm"
                disabled={msgPage <= 1}
                onClick={() => setMsgPage(msgPage - 1)}
              >
                ← Prev
              </button>
              <span className="wa-page-info">
                Page {msgPage} of {totalPages}
              </span>
              <button
                type="button"
                className="wa-btn wa-btn-secondary wa-btn-sm"
                disabled={msgPage >= totalPages}
                onClick={() => setMsgPage(msgPage + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
