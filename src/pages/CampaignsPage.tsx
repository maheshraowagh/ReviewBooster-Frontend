import { useState, useEffect, useCallback, useRef } from "react";
import api, { type ApiResponse } from "../lib/api";

// ─── Types ───────────────────────────────────────────────────────

interface CampaignSummary {
  _id: string;
  name: string;
  templateKey: string;
  status: string;
  totalRecipients: number;
  pendingCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  pausedAt: string | null;
  pauseReason: string | null;
}

interface Recipient {
  _id: string;
  phoneNormalized: string;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  lastError: string | null;
  skipReason: string | null;
  retryCount: number;
  customerId?: { name: string; phoneNormalized: string } | null;
}

interface CsvPreview {
  totalRows: number;
  valid: number;
  skipped: number;
  invalid: number;
  duplicate: number;
  validRecords: { phoneNormalized: string; name: string; customerId: string | null; isNew: boolean }[];
  reasons: { row: number; phone: string; reason: string }[];
}

// ─── Component ───────────────────────────────────────────────────

export default function CampaignsPage() {
  // Views
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  // Campaign list
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);

  // Campaign detail
  const [detail, setDetail] = useState<CampaignSummary | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientPage, setRecipientPage] = useState(1);
  const [recipientTotal, setRecipientTotal] = useState(0);

  // Create wizard
  const [wizardStep, setWizardStep] = useState(1);
  const [campaignName, setCampaignName] = useState("");
  const [templateKey, setTemplateKey] = useState("review_request");
  const [inputMode, setInputMode] = useState<"csv" | "manual">("csv");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [manualNumbers, setManualNumbers] = useState("");
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Actions
  const [actionLoading, setActionLoading] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Fetchers ─────────────────────────────────────────────────

  const fetchCampaigns = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await api.get<ApiResponse<{ campaigns: CampaignSummary[] }>>("/campaigns");
      if (res.data.success && res.data.data) {
        setCampaigns(res.data.data.campaigns);
      }
    } catch { /* silent */ }
    setListLoading(false);
  }, []);

  const fetchDetail = useCallback(async (id: string) => {
    try {
      const [campaignRes, recipientRes] = await Promise.all([
        api.get<ApiResponse<{ campaign: CampaignSummary }>>(`/campaigns/${id}`),
        api.get<ApiResponse<{ recipients: Recipient[]; pagination: { total: number } }>>(`/campaigns/${id}/recipients?limit=20`),
      ]);
      if (campaignRes.data.success && campaignRes.data.data) {
        setDetail(campaignRes.data.data.campaign);
      }
      if (recipientRes.data.success && recipientRes.data.data) {
        setRecipients(recipientRes.data.data.recipients);
        setRecipientTotal(recipientRes.data.data.pagination.total);
      }
    } catch { /* silent */ }
  }, []);

  const fetchRecipients = useCallback(async (id: string, page: number) => {
    try {
      const res = await api.get<ApiResponse<{ recipients: Recipient[]; pagination: { total: number } }>>(`/campaigns/${id}/recipients?page=${page}&limit=20`);
      if (res.data.success && res.data.data) {
        setRecipients(res.data.data.recipients);
        setRecipientTotal(res.data.data.pagination.total);
        setRecipientPage(page);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  // ─── Actions ──────────────────────────────────────────────────

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCsvUpload = async () => {
    if (!csvFile) return;
    setCsvUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      const res = await api.post<ApiResponse<CsvPreview>>("/campaigns/import-csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.success && res.data.data) {
        setCsvPreview(res.data.data);
        setWizardStep(3);
      } else {
        showToast("error", res.data.error?.message || "Upload failed");
      }
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Upload failed");
    } finally {
      setCsvUploading(false);
    }
  };

  const handleManualUpload = async () => {
    const lines = manualNumbers.split(/\r?\n/).map(n => n.trim()).filter(Boolean);
    if (lines.length === 0) return;
    
    setCsvUploading(true);
    try {
      const res = await api.post<ApiResponse<CsvPreview>>("/campaigns/validate-manual", { numbers: lines });
      if (res.data.success && res.data.data) {
        setCsvPreview(res.data.data);
        setWizardStep(3);
      } else {
        showToast("error", res.data.error?.message || "Validation failed");
      }
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Validation failed");
    } finally {
      setCsvUploading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName.trim() || !csvPreview) return;
    setCreating(true);
    try {
      const res = await api.post<ApiResponse<{ campaign: CampaignSummary }>>("/campaigns", {
        name: campaignName.trim(),
        templateKey,
        recipients: csvPreview.validRecords,
      });
      if (res.data.success && res.data.data) {
        showToast("success", "Campaign created! 🎉");
        resetWizard();
        setView("detail");
        setSelectedCampaignId(res.data.data.campaign._id);
        fetchDetail(res.data.data.campaign._id);
        fetchCampaigns();
      } else {
        showToast("error", res.data.error?.message || "Failed");
      }
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (id: string, action: "start" | "pause" | "resume" | "cancel") => {
    setActionLoading(action);
    try {
      const res = await api.post<ApiResponse<{ campaign: CampaignSummary }>>(`/campaigns/${id}/${action}`);
      if (res.data.success) {
        showToast("success", `Campaign ${action}ed ✅`);
        fetchDetail(id);
        fetchCampaigns();
      } else {
        showToast("error", res.data.error?.message || `Failed to ${action}`);
      }
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setActionLoading("");
    }
  };

  const openDetail = (id: string) => {
    setSelectedCampaignId(id);
    setView("detail");
    fetchDetail(id);
  };

  const resetWizard = () => {
    setWizardStep(1);
    setCampaignName("");
    setTemplateKey("review_request");
    setCsvFile(null);
    setManualNumbers("");
    setCsvPreview(null);
    setInputMode("csv");
  };

  // ─── Status Helpers ───────────────────────────────────────────

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      draft: "#737373", running: "#2563eb", paused: "#d97706", completed: "#15803d",
      cancelled: "#9ca3af", failed: "#dc2626", pending: "#737373", queued: "#737373",
      processing: "#2563eb", accepted: "#2563eb", sent: "#2563eb", delivered: "#15803d",
      read: "#059669", skipped: "#d97706", retry_scheduled: "#d97706",
    };
    return map[s] || "#737373";
  };

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="db-page animate-fade-in">
      <div className="db-topbar">
        <div>
          <h1 className="db-title">Campaigns</h1>
          <p className="db-subtitle">Send WhatsApp review requests in bulk</p>
        </div>
        {view !== "create" && (
          <button className="wa-btn wa-btn-primary" onClick={() => { resetWizard(); setView("create"); }}>
            + New Campaign
          </button>
        )}
        {view !== "list" && (
          <button className="wa-btn wa-btn-secondary" onClick={() => { setView("list"); fetchCampaigns(); }}>
            ← Back to List
          </button>
        )}
      </div>

      {toast && <div className={`wa-success-toast wa-toast-${toast.type}`} role="status">{toast.msg}</div>}

      {/* ──── Campaign List ──── */}
      {view === "list" && (
        <div className="wa-card">
          <div className="wa-card-header">
            <div className="wa-card-icon wa-card-icon-blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="24" height="24">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div>
              <h2 className="wa-card-title">All Campaigns</h2>
              <p className="wa-card-desc">{campaigns.length} campaigns</p>
            </div>
          </div>

          {listLoading ? (
            <div style={{ textAlign: "center", padding: "2rem" }}><div className="loading-spinner" /></div>
          ) : campaigns.length === 0 ? (
            <p className="wa-empty-text">No campaigns yet. Click "New Campaign" to get started.</p>
          ) : (
            <div className="wa-messages-table-wrap">
              <table className="wa-messages-table">
                <thead>
                  <tr><th>Name</th><th>Status</th><th>Recipients</th><th>Sent</th><th>Failed</th><th>Created</th><th></th></tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c._id} style={{ cursor: "pointer" }} onClick={() => openDetail(c._id)}>
                      <td><strong>{c.name}</strong></td>
                      <td><span className="wa-msg-status" style={{ background: `${statusColor(c.status)}15`, color: statusColor(c.status) }}>{c.status}</span></td>
                      <td>{c.totalRecipients}</td>
                      <td>{c.successCount}</td>
                      <td>{c.failedCount}</td>
                      <td className="wa-msg-time">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td><button className="wa-btn wa-btn-secondary wa-btn-sm" onClick={(e) => { e.stopPropagation(); openDetail(c._id); }}>View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ──── Create Campaign Wizard ──── */}
      {view === "create" && (
        <div className="wa-card">
          <div className="wa-card-header">
            <div className="wa-card-icon wa-card-icon-green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="24" height="24">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <div>
              <h2 className="wa-card-title">Create Campaign</h2>
              <p className="wa-card-desc">Step {wizardStep} of 3</p>
            </div>
          </div>

          {/* Step 1: Name + Template */}
          {wizardStep === 1 && (
            <div className="wa-test-form">
              <div className="wa-form-group">
                <label className="wa-form-label">Campaign Name *</label>
                <input className="wa-form-input" type="text" placeholder="e.g. July Review Drive" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
              </div>
              <div className="wa-form-group">
                <label className="wa-form-label">Message Template</label>
                <select className="wa-form-input" value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}>
                  <option value="review_request">Review Request</option>
                  <option value="thank_you">Thank You</option>
                </select>
              </div>
              <button className="wa-btn wa-btn-primary" disabled={!campaignName.trim()} onClick={() => setWizardStep(2)}>
                Next: Upload Recipients →
              </button>
            </div>
          )}

          {/* Step 2: CSV Upload */}
          {/* Step 2: Recipients */}
          {wizardStep === 2 && (
            <div className="wa-test-form">
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                <button
                  className={`wa-btn ${inputMode === "csv" ? "wa-btn-primary" : "wa-btn-secondary"}`}
                  onClick={() => setInputMode("csv")}
                >
                  Upload CSV File
                </button>
                <button
                  className={`wa-btn ${inputMode === "manual" ? "wa-btn-primary" : "wa-btn-secondary"}`}
                  onClick={() => setInputMode("manual")}
                >
                  Manual Entry
                </button>
              </div>

              {inputMode === "csv" ? (
                <div className="wa-form-group">
                  <label className="wa-form-label">Upload CSV File *</label>
                  <p className="wa-card-desc" style={{ marginBottom: "0.5rem" }}>
                    Only <strong>.csv</strong> files are allowed. The file must have a <code>phone</code> column. Optional: <code>name</code> column.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="wa-form-input"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  />
                </div>
              ) : (
                <div className="wa-form-group">
                  <label className="wa-form-label">Enter Phone Numbers *</label>
                  <p className="wa-card-desc" style={{ marginBottom: "0.5rem" }}>
                    Enter one phone number per line, optionally followed by a comma and name. Include country code (e.g., 919876543210, John Doe).
                  </p>
                  <textarea
                    className="wa-form-input"
                    rows={6}
                    placeholder={"919876543210, John Doe\n919812345678, Priya"}
                    value={manualNumbers}
                    onChange={(e) => setManualNumbers(e.target.value)}
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                <button className="wa-btn wa-btn-secondary" onClick={() => setWizardStep(1)}>← Back</button>
                <button 
                  className="wa-btn wa-btn-primary" 
                  disabled={(inputMode === "csv" ? !csvFile : !manualNumbers.trim()) || csvUploading} 
                  onClick={inputMode === "csv" ? handleCsvUpload : handleManualUpload}
                >
                  {csvUploading ? "Validating..." : "Validate & Preview"}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview + Confirm */}
          {wizardStep === 3 && csvPreview && (
            <div className="wa-test-form">
              <div className="wa-usage-grid" style={{ marginBottom: "1rem" }}>
                <div className="wa-usage-item">
                  <span className="wa-usage-label">Valid</span>
                  <span className="wa-usage-value" style={{ color: "#15803d" }}>{csvPreview.valid}</span>
                </div>
                <div className="wa-usage-item">
                  <span className="wa-usage-label">Skipped</span>
                  <span className="wa-usage-value" style={{ color: "#d97706" }}>{csvPreview.skipped}</span>
                </div>
                <div className="wa-usage-item">
                  <span className="wa-usage-label">Invalid</span>
                  <span className="wa-usage-value" style={{ color: "#dc2626" }}>{csvPreview.invalid}</span>
                </div>
                <div className="wa-usage-item">
                  <span className="wa-usage-label">Duplicate</span>
                  <span className="wa-usage-value">{csvPreview.duplicate}</span>
                </div>
              </div>

              {csvPreview.reasons.length > 0 && (
                <details style={{ marginBottom: "1rem" }}>
                  <summary style={{ cursor: "pointer", fontSize: "0.8125rem", color: "#666" }}>
                    {csvPreview.reasons.length} skipped/invalid rows
                  </summary>
                  <div className="wa-messages-table-wrap" style={{ marginTop: "0.5rem" }}>
                    <table className="wa-messages-table">
                      <thead><tr><th>Row</th><th>Phone</th><th>Reason</th></tr></thead>
                      <tbody>
                        {csvPreview.reasons.slice(0, 20).map((r, i) => (
                          <tr key={i}><td>{r.row}</td><td>{r.phone}</td><td><span className="wa-msg-type wa-type-negative_alert">{r.reason}</span></td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}

              <div className="camp-summary-box">
                <p><strong>Campaign:</strong> {campaignName}</p>
                <p><strong>Template:</strong> {templateKey.replace(/_/g, " ")}</p>
                <p><strong>Recipients:</strong> {csvPreview.valid} customers will receive messages</p>
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button className="wa-btn wa-btn-secondary" onClick={() => setWizardStep(2)}>← Back</button>
                <button className="wa-btn wa-btn-primary" disabled={creating || csvPreview.valid === 0} onClick={handleCreateCampaign}>
                  {creating ? "Creating..." : `Create Campaign (${csvPreview.valid} recipients)`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──── Campaign Detail ──── */}
      {view === "detail" && detail && (
        <>
          <div className="wa-card">
            <div className="wa-card-header">
              <div>
                <h2 className="wa-card-title">{detail.name}</h2>
                <p className="wa-card-desc">Template: {detail.templateKey.replace(/_/g, " ")}</p>
              </div>
              <span className="wa-msg-status" style={{ background: `${statusColor(detail.status)}15`, color: statusColor(detail.status), fontSize: "0.875rem", padding: "0.25rem 0.75rem" }}>
                {detail.status}
              </span>
            </div>

            {detail.pauseReason && (
              <div className="wa-paused-banner">⚠️ {detail.pauseReason}</div>
            )}

            <div className="wa-usage-grid" style={{ marginBottom: "1rem" }}>
              <div className="wa-usage-item">
                <span className="wa-usage-label">Total</span>
                <span className="wa-usage-value">{detail.totalRecipients}</span>
              </div>
              <div className="wa-usage-item">
                <span className="wa-usage-label">Sent</span>
                <span className="wa-usage-value" style={{ color: "#15803d" }}>{detail.successCount}</span>
              </div>
              <div className="wa-usage-item">
                <span className="wa-usage-label">Failed</span>
                <span className="wa-usage-value" style={{ color: "#dc2626" }}>{detail.failedCount}</span>
              </div>
              <div className="wa-usage-item">
                <span className="wa-usage-label">Pending</span>
                <span className="wa-usage-value">{detail.pendingCount}</span>
              </div>
            </div>

            {/* Progress bar */}
            {detail.totalRecipients > 0 && (
              <div className="camp-progress-bar">
                <div className="camp-progress-fill camp-progress-success" style={{ width: `${(detail.successCount / detail.totalRecipients) * 100}%` }} />
                <div className="camp-progress-fill camp-progress-failed" style={{ width: `${(detail.failedCount / detail.totalRecipients) * 100}%` }} />
                <div className="camp-progress-fill camp-progress-skipped" style={{ width: `${(detail.skippedCount / detail.totalRecipients) * 100}%` }} />
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
              {["draft", "paused", "scheduled"].includes(detail.status) && (
                <button className="wa-btn wa-btn-primary" disabled={!!actionLoading} onClick={() => handleAction(detail._id, "start")}>
                  {actionLoading === "start" ? "Starting..." : "▶ Start Campaign"}
                </button>
              )}
              {detail.status === "running" && (
                <button className="wa-btn wa-btn-secondary" disabled={!!actionLoading} onClick={() => handleAction(detail._id, "pause")}>
                  {actionLoading === "pause" ? "..." : "⏸ Pause"}
                </button>
              )}
              {detail.status === "paused" && (
                <button className="wa-btn wa-btn-primary" disabled={!!actionLoading} onClick={() => handleAction(detail._id, "resume")}>
                  {actionLoading === "resume" ? "..." : "▶ Resume"}
                </button>
              )}
              {!["completed", "cancelled"].includes(detail.status) && (
                <button className="wa-btn wa-btn-danger" disabled={!!actionLoading} onClick={() => { if (confirm("Cancel this campaign?")) handleAction(detail._id, "cancel"); }}>
                  {actionLoading === "cancel" ? "..." : "✕ Cancel"}
                </button>
              )}
              <button className="wa-btn wa-btn-secondary wa-btn-sm" onClick={() => fetchDetail(detail._id)}>
                ↻ Refresh
              </button>
            </div>
          </div>

          {/* Recipients table */}
          <div className="wa-card">
            <div className="wa-card-header">
              <h2 className="wa-card-title">Recipients</h2>
              <span className="wa-card-desc">{recipientTotal} total</span>
            </div>

            {recipients.length === 0 ? (
              <p className="wa-empty-text">No recipients found.</p>
            ) : (
              <>
                <div className="wa-messages-table-wrap">
                  <table className="wa-messages-table">
                    <thead>
                      <tr><th>Customer</th><th>Phone</th><th>Status</th><th>Sent</th><th>Delivered</th><th>Error</th></tr>
                    </thead>
                    <tbody>
                      {recipients.map((r) => (
                        <tr key={r._id}>
                          <td>{r.customerId?.name || "—"}</td>
                          <td className="wa-msg-phone">{r.phoneNormalized}</td>
                          <td><span className="wa-msg-status" style={{ background: `${statusColor(r.status)}15`, color: statusColor(r.status) }}>{r.status}</span></td>
                          <td className="wa-msg-time">{r.sentAt ? new Date(r.sentAt).toLocaleTimeString() : "—"}</td>
                          <td className="wa-msg-time">
                            {r.readAt ? `Read ${new Date(r.readAt).toLocaleTimeString()}`
                              : r.deliveredAt ? `✓✓ ${new Date(r.deliveredAt).toLocaleTimeString()}`
                              : "—"}
                          </td>
                          <td className="wa-msg-time" style={{ color: "#dc2626" }}>{r.lastError || r.skipReason || ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {recipientTotal > 20 && (
                  <div className="wa-pagination">
                    <button className="wa-btn wa-btn-secondary wa-btn-sm" disabled={recipientPage <= 1} onClick={() => fetchRecipients(detail._id, recipientPage - 1)}>← Prev</button>
                    <span className="wa-page-info">Page {recipientPage} of {Math.ceil(recipientTotal / 20)}</span>
                    <button className="wa-btn wa-btn-secondary wa-btn-sm" disabled={recipientPage >= Math.ceil(recipientTotal / 20)} onClick={() => fetchRecipients(detail._id, recipientPage + 1)}>Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
