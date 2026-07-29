import type { MessageLogEntry } from "../../services/whatsappService";

interface RecentMessagesCardProps {
  messages: MessageLogEntry[];
  msgTotal: number;
  msgPage: number;
  setMsgPage: (page: number) => void;
  fetchMessages: () => void;
}

export function RecentMessagesCard({
  messages,
  msgTotal,
  msgPage,
  setMsgPage,
  fetchMessages,
}: RecentMessagesCardProps) {
  return (
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
        <button className="wa-btn wa-btn-secondary wa-btn-sm" onClick={() => fetchMessages()}>↻ Refresh</button>
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
              <button className="wa-btn wa-btn-secondary wa-btn-sm" disabled={msgPage <= 1} onClick={() => setMsgPage(msgPage - 1)}>← Prev</button>
              <span className="wa-page-info">Page {msgPage} of {Math.ceil(msgTotal / 10)}</span>
              <button className="wa-btn wa-btn-secondary wa-btn-sm" disabled={msgPage >= Math.ceil(msgTotal / 10)} onClick={() => setMsgPage(msgPage + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
