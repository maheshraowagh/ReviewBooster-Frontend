import { useState, useRef } from "react";
import "./email-campaigns.css";
import {
  useEmailCampaigns,
  useEmailCampaign,
  useEmailCampaignImportCsv,
  useCreateEmailCampaign,
  useEmailCampaignAction,
} from "../hooks/queries/useEmailCampaigns";
import type { 
  ValidationResult, 
  EmailCampaign, 
} from "../services/emailCampaignService";

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusLabel(status: string) {
  const map: Record<string, string> = {
    draft: "Draft", running: "Sending", paused: "Paused",
    completed: "Completed", failed: "Failed", cancelled: "Cancelled",
  };
  return map[status] || status;
}

function successRate(c: EmailCampaign) {
  const sent = c.successCount || 0;
  const total = c.totalRecipients || 1;
  return Math.round((sent / total) * 100);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepBar({ current }: { current: number }) {
  const steps = ["Email Template", "Import Contacts", "Review & Send"];
  return (
    <div className="ec-step-bar">
      {steps.map((label, i) => {
        const idx = i + 1;
        const cls = idx < current ? "done" : idx === current ? "active" : "";
        return (
          <div key={label} className={`ec-step-item ${cls}`}>
            <div className="ec-step-dot">
              {idx < current ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : idx}
            </div>
            <span className="ec-step-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`ec-status-badge ${status}`}>{statusLabel(status)}</span>;
}

// ── Wizard ────────────────────────────────────────────────────────────────────

interface WizardProps {
  onClose: () => void;
  onCreated: () => void;
}

function EmailCampaignWizard({ onClose, onCreated }: WizardProps) {
  const [step, setStep] = useState(1);
  const [campaignName, setCampaignName] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [importTab, setImportTab] = useState<"csv" | "sheet" | "manual">("csv");
  const [sheetUrl, setSheetUrl] = useState("");
  const [manualList, setManualList] = useState("");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);
  const importCsvMut = useEmailCampaignImportCsv();
  const createCampaignMut = useCreateEmailCampaign();
  const actionMut = useEmailCampaignAction();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(file: File) {
    setError("");
    setValidation(null);
    setLoading(true);
    try {
      const data = await importCsvMut.mutateAsync({ file });
      setValidation(data);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    }
    setLoading(false);
  }

  async function handleSheetFetch() {
    if (!sheetUrl.trim()) return;
    setError("");
    setValidation(null);
    setLoading(true);
    try {
      const data = await importCsvMut.mutateAsync({ googleSheetUrl: sheetUrl.trim() });
      setValidation(data);
    } catch (err: any) {
      setError(err.message || "Could not fetch sheet");
    }
    setLoading(false);
  }

  async function handleManualValidate() {
    if (!manualList.trim()) return;
    setError("");
    setValidation(null);
    setLoading(true);
    try {
      const data = await importCsvMut.mutateAsync({ manualList });
      setValidation(data);
    } catch (err: any) {
      setError(err.message || "Validation failed");
    }
    setLoading(false);
  }

  async function createCampaign() {
    if (!campaignName.trim() || !emailSubject.trim() || !validation?.valid.length) return;
    setError("");
    setLoading(true);
    try {
      const data = await createCampaignMut.mutateAsync({
        name: campaignName.trim(),
        emailSubject: emailSubject.trim(),
        recipients: validation.valid,
      });
      setCreatedId(data.campaign._id);
      setStep(3);
    } catch (err: any) {
      setError(err.message || "Failed to create campaign");
    }
    setLoading(false);
  }

  async function launchCampaign() {
    if (!createdId) return;
    setLaunching(true);
    setError("");
    try {
      await actionMut.mutateAsync({ id: createdId, action: "start" });
      setLaunched(true);
      setTimeout(() => { onCreated(); onClose(); }, 1800);
    } catch (err: any) {
      setError(err.message || "Failed to start campaign");
    }
    setLaunching(false);
  }

  const canGoNext1 = campaignName.trim().length > 0 && emailSubject.trim().length > 0;
  const canGoNext2 = (validation?.valid.length ?? 0) > 0;

  return (
    <div className="ec-wizard-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ec-wizard" role="dialog" aria-modal="true" aria-label="New Email Campaign">

        {/* Header */}
        <div className="ec-wizard-header">
          <h2 className="ec-wizard-title">New Email Campaign</h2>
          <button className="ec-wizard-close" onClick={onClose} aria-label="Close wizard">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Step bar */}
        <StepBar current={step} />

        {/* Body */}
        <div className="ec-wizard-body">

          {/* ── Step 1: Template ── */}
          {step === 1 && (
            <>
              <div className="ec-field">
                <label className="ec-label" htmlFor="ec-campaign-name">Campaign name</label>
                <input id="ec-campaign-name" className="ec-input" type="text"
                  placeholder="e.g. July review push"
                  value={campaignName} onChange={(e) => setCampaignName(e.target.value)} maxLength={120} />
              </div>

              <div className="ec-field">
                <label className="ec-label" htmlFor="ec-email-subject">
                  Email subject <span className="ec-label-hint">shown in the recipient's inbox</span>
                </label>
                <input id="ec-email-subject" className="ec-input" type="text"
                  placeholder="Share your experience with us"
                  value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} maxLength={200} />
              </div>

              {/* Live preview */}
              <p className="ec-label">Email preview</p>
              <div className="ec-email-preview">
                <div className="ec-email-preview-header">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="3,9 12,15 21,9"/>
                  </svg>
                  <span>{emailSubject || "Share your experience with us"}</span>
                </div>
                <div className="ec-email-preview-body">
                  <p>Hi <strong>[Customer Name]</strong>,</p>
                  <p>Thank you for visiting <strong>your business</strong>!<br />
                     We'd love to hear your thoughts — it only takes 30 seconds.</p>
                  <span className="ec-email-cta">Leave a Review →</span>
                  <p className="ec-email-unsubscribe">You can <u>unsubscribe</u> from these emails at any time.</p>
                </div>
              </div>
            </>
          )}

          {/* ── Step 2: Import Contacts ── */}
          {step === 2 && (
            <>
              <div className="ec-import-tabs">
                {(["csv", "sheet", "manual"] as const).map((tab) => (
                  <button key={tab} id={`ec-import-tab-${tab}`}
                    className={`ec-import-tab${importTab === tab ? " active" : ""}`}
                    onClick={() => { setImportTab(tab); setValidation(null); setError(""); }}>
                    {tab === "csv" ? "📄 Upload CSV" : tab === "sheet" ? "📊 Google Sheet" : "✏️ Type manually"}
                  </button>
                ))}
              </div>

              {/* CSV upload */}
              {importTab === "csv" && (
                <>
                  <div className="ec-upload-area"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
                    onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("drag-over");
                      const file = e.dataTransfer.files[0];
                      if (file) handleFileUpload(file);
                    }}>
                    <div className="ec-upload-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    </div>
                    <p className="ec-upload-text"><strong>Click to upload</strong> or drag and drop</p>
                    <p className="ec-upload-hint">CSV file with an <code>email</code> column (and optional <code>name</code>)</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
                </>
              )}

              {/* Google Sheet */}
              {importTab === "sheet" && (
                <div className="ec-field">
                  <label className="ec-label" htmlFor="ec-sheet-url">
                    Google Sheet URL <span className="ec-label-hint">must be shared as "Anyone with the link can view"</span>
                  </label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input id="ec-sheet-url" className="ec-input" type="url"
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} />
                    <button id="ec-sheet-fetch-btn" className="ec-btn ec-btn-primary"
                      onClick={handleSheetFetch} disabled={loading || !sheetUrl.trim()}
                      style={{ flexShrink: 0 }}>
                      {loading ? "Fetching…" : "Fetch"}
                    </button>
                  </div>
                  <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#A3A39A" }}>
                    First row must be column headers. Include an <code>email</code> column (and optionally <code>name</code>).
                  </p>
                </div>
              )}

              {/* Manual entry */}
              {importTab === "manual" && (
                <div className="ec-field">
                  <label className="ec-label" htmlFor="ec-manual-list">
                    Paste emails <span className="ec-label-hint">one per line, or "email, name" format</span>
                  </label>
                  <textarea id="ec-manual-list" className="ec-input ec-textarea"
                    placeholder={"john@example.com, John\njane@example.com\nbob@example.com, Bob Smith"}
                    value={manualList} onChange={(e) => setManualList(e.target.value)}
                    style={{ minHeight: "140px" }} />
                  <button id="ec-manual-validate-btn" className="ec-btn ec-btn-secondary"
                    style={{ marginTop: "10px" }}
                    onClick={handleManualValidate} disabled={loading || !manualList.trim()}>
                    {loading ? "Validating…" : "Validate list"}
                  </button>
                </div>
              )}

              {loading && !validation && (
                <p style={{ textAlign: "center", color: "#6B6B63", fontSize: "14px", marginTop: "12px" }}>Processing…</p>
              )}

              {/* Validation summary */}
              {validation && (
                <div className="ec-validation-summary">
                  <div className="ec-validation-row success">
                    <span className="label">✓ Valid recipients</span>
                    <span className="count">{validation.valid.length}</span>
                  </div>
                  <div className={`ec-validation-row${validation.skipped.length > 0 ? " warn" : ""}`}>
                    <span className="label">Skipped (opted out / duplicate)</span>
                    <span className="count">{validation.skipped.length}</span>
                  </div>
                  <div className={`ec-validation-row${validation.errors.length > 0 ? " error" : ""}`}>
                    <span className="label">Invalid email format</span>
                    <span className="count">{validation.errors.length}</span>
                  </div>
                  <div className="ec-validation-row">
                    <span className="label">Total rows processed</span>
                    <span className="count">{validation.totalRows}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Step 3: Review & Launch ── */}
          {step === 3 && (
            <>
              {launched ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: "42px", marginBottom: "12px" }}>🚀</div>
                  <p style={{ fontSize: "16px", fontWeight: 600, color: "#1A1A1A" }}>Campaign launched!</p>
                  <p style={{ fontSize: "14px", color: "#6B6B63" }}>Emails are being sent. You'll see progress in the campaign list.</p>
                </div>
              ) : (
                <>
                  <p className="ec-label" style={{ marginBottom: "12px" }}>Campaign summary</p>
                  <div className="ec-validation-summary" style={{ marginBottom: "20px" }}>
                    <div className="ec-validation-row">
                      <span className="label">Campaign name</span>
                      <span className="count" style={{ color: "#1A1A1A" }}>{campaignName}</span>
                    </div>
                    <div className="ec-validation-row">
                      <span className="label">Subject</span>
                      <span style={{ fontSize: "13px", color: "#6B6B63", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{emailSubject}</span>
                    </div>
                    <div className="ec-validation-row success">
                      <span className="label">Recipients</span>
                      <span className="count">{validation?.valid.length ?? 0}</span>
                    </div>
                    <div className="ec-validation-row">
                      <span className="label">Estimated send time</span>
                      <span style={{ fontSize: "13px", color: "#6B6B63" }}>
                        ~{Math.max(1, Math.ceil(((validation?.valid.length ?? 0) * 2) / 60))} min
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: "13px", color: "#6B6B63", lineHeight: 1.6, margin: 0 }}>
                    Every email includes a one-click unsubscribe link. Opted-out customers are automatically skipped.
                  </p>
                </>
              )}
            </>
          )}

          {/* Error display */}
          {error && (
            <p style={{ marginTop: "12px", fontSize: "13px", color: "#C0392B", background: "#FDF2F2", padding: "10px 14px", borderRadius: "8px", margin: "12px 0 0" }}>
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="ec-wizard-footer">
          {step > 1 && !launched
            ? <button className="ec-btn ec-btn-ghost" onClick={() => { setStep(s => s - 1); setError(""); }}>← Back</button>
            : <span />}

          <div style={{ display: "flex", gap: "10px" }}>
            {step === 1 && (
              <button id="ec-wizard-next-1" className="ec-btn ec-btn-primary"
                disabled={!canGoNext1} onClick={() => setStep(2)}>
                Next: Add contacts →
              </button>
            )}
            {step === 2 && (
              <button id="ec-wizard-next-2" className="ec-btn ec-btn-primary"
                disabled={!canGoNext2 || loading} onClick={createCampaign}>
                {loading ? "Creating…" : "Review & confirm →"}
              </button>
            )}
            {step === 3 && !launched && (
              <>
                <button className="ec-btn ec-btn-secondary" onClick={onClose}>Save as draft</button>
                <button id="ec-wizard-launch-btn" className="ec-btn ec-btn-primary"
                  disabled={launching} onClick={launchCampaign}>
                  {launching ? "Launching…" : "🚀 Send now"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Detail Panel ───────────────────────────────────────────────────────────────

function CampaignDetailPanel({
  campaignId,
  onClose,
  onAction,
}: { campaignId: string; onClose: () => void; onAction: () => void }) {
  const { data: detail, isLoading } = useEmailCampaign(campaignId);
  const actionMut = useEmailCampaignAction();
  const [actionLoading, setActionLoading] = useState(false);

  async function toggleRunning() {
    if (!detail) return;
    setActionLoading(true);
    const isRunning = detail.campaign.status === "running";
    try {
      await actionMut.mutateAsync({ id: campaignId, action: isRunning ? "pause" : "start" });
      onAction();
    } catch {/* ignore */}
    setActionLoading(false);
  }

  if (isLoading || !detail) {
    return (
      <div className="ec-detail-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="ec-detail-panel">
          <div className="ec-detail-header">
            <p style={{ color: "#6B6B63", fontSize: "14px" }}>Loading…</p>
            <button className="ec-wizard-close" onClick={onClose} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const c = detail.campaign;
  const rate = successRate(c);
  const processed = (c.successCount || 0) + (c.failedCount || 0) + (c.skippedCount || 0);
  const fillPct = c.totalRecipients > 0 ? Math.round((processed / c.totalRecipients) * 100) : 0;

  return (
    <div className="ec-detail-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ec-detail-panel">
        <div className="ec-detail-header">
          <div style={{ minWidth: 0 }}>
            <p className="ec-detail-name">{c.name}</p>
            <p className="ec-detail-subject">{c.emailSubject}</p>
            <div style={{ marginTop: "6px" }}><StatusBadge status={c.status} /></div>
          </div>
          <button className="ec-wizard-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="ec-detail-body">
          {/* Progress bar */}
          {(c.status === "running" || c.status === "paused") && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#6B6B63", marginBottom: "6px" }}>
                <span>Progress</span>
                <span>{processed} / {c.totalRecipients}</span>
              </div>
              <div className="ec-progress-bar-track">
                <div className="ec-progress-bar-fill" style={{ width: `${fillPct}%` }} />
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="ec-stats-grid">
            <div className="ec-stat-card">
              <div className="ec-stat-label">Total</div>
              <div className="ec-stat-value">{c.totalRecipients}</div>
            </div>
            <div className="ec-stat-card">
              <div className="ec-stat-label">Sent</div>
              <div className="ec-stat-value green">{c.successCount}</div>
            </div>
            <div className="ec-stat-card">
              <div className="ec-stat-label">Failed</div>
              <div className="ec-stat-value red">{c.failedCount}</div>
            </div>
            <div className="ec-stat-card">
              <div className="ec-stat-label">Success rate</div>
              <div className="ec-stat-value">{rate}%</div>
            </div>
          </div>

          {/* Action button */}
          {(c.status === "running" || c.status === "paused" || c.status === "draft") && (
            <button id="ec-detail-toggle-btn"
              className={`ec-btn ${c.status === "running" ? "ec-btn-secondary" : "ec-btn-primary"}`}
              style={{ marginBottom: "24px", width: "100%", justifyContent: "center" }}
              onClick={toggleRunning} disabled={actionLoading}>
              {actionLoading ? "…" : c.status === "running" ? "⏸ Pause campaign" : "▶ Resume / Start"}
            </button>
          )}

          {/* Recipient table */}
          <p className="ec-label" style={{ marginBottom: "12px" }}>Recipients</p>
          <table className="ec-recipient-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {detail.recipients.map((r) => (
                <tr key={r._id}>
                  <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                    {r.email || r.customerId?.email || "—"}
                  </td>
                  <td>{r.customerId?.name || "—"}</td>
                  <td><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          {detail.pagination.totalPages > 1 && (
            <p style={{ marginTop: "10px", fontSize: "12px", color: "#A3A39A", textAlign: "center" }}>
              Showing {detail.recipients.length} of {detail.pagination.total} recipients
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function EmailCampaignsPage() {
  const [showWizard, setShowWizard] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: campaignsData, isLoading: loading, refetch } = useEmailCampaigns();
  const campaigns = campaignsData || [];

  return (
    <div className="email-campaigns-page">
      {/* Header */}
      <div className="email-campaigns-header">
        <div>
          <h1 className="email-campaigns-title">Email Campaigns</h1>
          <p className="email-campaigns-subtitle">
            Send personalised review request emails to your customers.
          </p>
        </div>
        <button id="ec-new-campaign-btn" className="ec-btn ec-btn-primary"
          onClick={() => setShowWizard(true)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Campaign
        </button>
      </div>

      {/* Campaign list */}
      {loading ? (
        <p style={{ color: "#6B6B63", fontSize: "14px" }}>Loading campaigns…</p>
      ) : campaigns.length === 0 ? (
        <div className="ec-empty">
          <div className="ec-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="3,9 12,15 21,9"/>
            </svg>
          </div>
          <h2 className="ec-empty-title">No email campaigns yet</h2>
          <p className="ec-empty-desc">
            Upload a list of customer emails and send personalised review requests in minutes.
          </p>
          <button id="ec-empty-new-btn" className="ec-btn ec-btn-primary"
            onClick={() => setShowWizard(true)}>
            Create your first campaign
          </button>
        </div>
      ) : (
        <div className="email-campaign-list">
          {campaigns.map((c) => (
            <div key={c._id} id={`ec-campaign-${c._id}`}
              className="email-campaign-card" onClick={() => setSelectedId(c._id)}>
              <div className="email-campaign-card-main">
                <p className="email-campaign-card-name">{c.name}</p>
                <p className="email-campaign-card-subject">{c.emailSubject}</p>
                <div className="email-campaign-card-meta">
                  <span className="email-campaign-card-stat"><strong>{c.totalRecipients}</strong> recipients</span>
                  <span className="email-campaign-card-stat"><strong style={{ color: "#3F7D45" }}>{c.successCount}</strong> sent</span>
                  {c.failedCount > 0 && (
                    <span className="email-campaign-card-stat"><strong style={{ color: "#C0392B" }}>{c.failedCount}</strong> failed</span>
                  )}
                  <span className="email-campaign-card-stat">{successRate(c)}% success</span>
                </div>
              </div>
              <StatusBadge status={c.status} />
            </div>
          ))}
        </div>
      )}

      {/* Wizard modal */}
      {showWizard && (
        <EmailCampaignWizard
          onClose={() => setShowWizard(false)}
          onCreated={() => refetch()}
        />
      )}

      {/* Detail slide-in panel */}
      {selectedId && (
        <CampaignDetailPanel
          campaignId={selectedId}
          onClose={() => setSelectedId(null)}
          onAction={() => refetch()}
        />
      )}
    </div>
  );
}
