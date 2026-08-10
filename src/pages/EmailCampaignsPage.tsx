import { useState, useRef, useMemo } from "react";
import "./email-campaigns.css";
import {
  useEmailCampaigns,
  useEmailCampaign,
  useEmailCampaignImportCsv,
  useCreateEmailCampaign,
  useEmailCampaignAction,
} from "../hooks/queries/useEmailCampaigns";
import { useCurrentBusiness } from "../hooks/queries/useBusiness";
import { EmailTemplateSelector, EmailTemplateConfig } from "../components/EmailTemplateSelector";
import type {
  ValidationResult,
  EmailCampaign,
} from "../services/emailCampaignService";
import { getGoogleAuthUrl } from "../services/googleAuthService";

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
  const steps = ["Campaign Details", "Import Contacts", "Email Design", "Review & Send"];
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
  const [manualRows, setManualRows] = useState<{ id: string; name: string; email: string }[]>([
    { id: '1', name: '', email: '' },
    { id: '2', name: '', email: '' },
    { id: '3', name: '', email: '' },
  ]);
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState("");
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

  const handleAddRow = () => {
    setManualRows((prev) => [...prev, { id: String(Date.now() + Math.random()), name: '', email: '' }]);
  };

  const handleRemoveRow = (id: string) => {
    setManualRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRowChange = (id: string, field: 'name' | 'email', val: string) => {
    setManualRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  };

  const handleParseBulkPaste = () => {
    if (!bulkPasteText.trim()) return;
    const lines = bulkPasteText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const parsedRows = lines.map((line, idx) => {
      const parts = line.split(',');
      return {
        id: String(Date.now() + idx),
        email: (parts[0] || '').trim(),
        name: parts.slice(1).join(',').trim(),
      };
    });
    setManualRows((prev) => {
      const existingFilled = prev.filter((r) => r.name.trim() || r.email.trim());
      return [...existingFilled, ...parsedRows];
    });
    setBulkPasteText("");
    setShowBulkPaste(false);
  };

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

  async function handleManualTableValidate() {
    const validRows = manualRows.filter((r) => r.email.trim() || r.name.trim());
    if (validRows.length === 0) {
      setError("Please enter at least one email address.");
      return;
    }
    setError("");
    setValidation(null);
    setLoading(true);
    try {
      const data = await importCsvMut.mutateAsync({
        manualRecipients: validRows.map((r) => ({ name: r.name.trim(), email: r.email.trim() })),
      });
      setValidation(data);
    } catch (err: any) {
      setError(err.message || "Validation failed");
    }
    setLoading(false);
  }

  const [templateConfig, setTemplateConfig] = useState<EmailTemplateConfig>({
    templateKey: 'personal',
    subject: 'Quick question from {{businessName}}',
    greeting: 'Hi {{name}},',
    customMessage: '',
    buttonText: 'Leave a Review →',
  });
  const [selectedProvider, setSelectedProvider] = useState<'platform' | 'gmail'>('platform');
  const { data: business } = useCurrentBusiness();

  // Keep emailSubject state synced with templateConfig
  const handleTemplateChange = (cfg: EmailTemplateConfig) => {
    setTemplateConfig(cfg);
    setEmailSubject(cfg.subject || `Quick question from ${business?.name || 'our business'}`);
  };

  async function createCampaign() {
    const finalSubject = (templateConfig.subject || emailSubject || `Quick question from ${business?.name || 'our business'}`).trim();
    if (!campaignName.trim() || !finalSubject || !validation?.valid.length) return;
    setError("");
    setLoading(true);
    try {
      const data = await createCampaignMut.mutateAsync({
        name: campaignName.trim(),
        emailSubject: finalSubject,
        recipients: validation.valid,
        provider: selectedProvider,
        templateKey: templateConfig.templateKey,
        greeting: templateConfig.greeting,
        customMessage: templateConfig.customMessage,
        buttonText: templateConfig.buttonText,
      });
      setCreatedId(data.campaign._id);
      setStep(4);
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

  const canGoNext1 = campaignName.trim().length > 0;
  const canGoNext2 = (validation?.valid.length ?? 0) > 0;
  const canGoNext3 = (templateConfig.subject || emailSubject || 'Quick question').trim().length > 0;

  return (
    <div className="ec-wizard-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ec-wizard" role="dialog" aria-modal="true" aria-label="New Email Campaign">

        {/* Header */}
        <div className="ec-wizard-header">
          <h2 className="ec-wizard-title">New Email Campaign</h2>
          <button className="ec-wizard-close" onClick={onClose} aria-label="Close wizard">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Step bar */}
        <StepBar current={step} />

        {/* Body */}
        <div className="ec-wizard-body">

          {/* ── Step 1: Campaign Details & Provider ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Campaign Name */}
              <div className="ec-field" style={{ marginBottom: 0 }}>
                <label className="ec-label" htmlFor="ec-campaign-name">Campaign Name</label>
                <input id="ec-campaign-name" className="ec-input" type="text"
                  placeholder="e.g. July review push"
                  value={campaignName} onChange={(e) => setCampaignName(e.target.value)} maxLength={120} />
              </div>

              {/* Provider Selection — professional cards */}
              <div className="ec-field" style={{ marginBottom: 0 }}>
                <label className="ec-label">Send Emails Via</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginTop: '8px' }}>
                  {/* Gmail Card */}
                  <div
                    onClick={() => { if (business?.gmailConnected) setSelectedProvider('gmail'); }}
                    style={{
                      padding: '18px',
                      borderRadius: '12px',
                      border: selectedProvider === 'gmail' ? '2px solid #1A1A1A' : '1px solid #E3E1D9',
                      background: selectedProvider === 'gmail' ? '#F9F8F5' : '#fff',
                      cursor: business?.gmailConnected ? 'pointer' : 'default',
                      opacity: business?.gmailConnected ? 1 : 0.65,
                      transition: 'all 0.15s ease',
                      boxShadow: selectedProvider === 'gmail' ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>✉️</span> Gmail OAuth
                      </span>
                      {business?.gmailConnected ? (
                        <span className="ec-status-badge running" style={{ fontSize: '10px' }}>Connected</span>
                      ) : (
                        <span className="ec-status-badge draft" style={{ fontSize: '10px' }}>Not Connected</span>
                      )}
                    </div>
                    <p style={{ fontSize: '12px', color: '#6B6B63', margin: 0, lineHeight: 1.5 }}>
                      {business?.gmailConnected
                        ? `Sends directly from ${business.gmailEmail}. Customer replies land in your Gmail inbox.`
                        : 'Connect your Gmail account to send emails directly from your personal or business email.'}
                    </p>
                    {!business?.gmailConnected && (
                      <button type="button" onClick={async (e) => {
                        e.stopPropagation();
                        try { const url = await getGoogleAuthUrl(); window.location.href = url; } catch {}
                      }} style={{
                        marginTop: '12px', fontSize: '12px', fontWeight: 600, color: '#1A1A1A',
                        background: '#fff', border: '1px solid #E3E1D9', borderRadius: '8px',
                        padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                        Connect Gmail →
                      </button>
                    )}
                  </div>

                  {/* Default Server Card */}
                  <div
                    onClick={() => setSelectedProvider('platform')}
                    style={{
                      padding: '18px',
                      borderRadius: '12px',
                      border: selectedProvider === 'platform' ? '2px solid #1A1A1A' : '1px solid #E3E1D9',
                      background: selectedProvider === 'platform' ? '#F9F8F5' : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: selectedProvider === 'platform' ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>⚡</span> Default Server
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px', background: '#E3F2FD', color: '#1976D2' }}>Default</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6B6B63', margin: 0, lineHeight: 1.5 }}>
                      Sends as "{business?.name || 'Your Business'}" with your logo. Customer replies go to {business?.contactEmail || 'your email'}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
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
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
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

              {/* Manual entry — Structured Recipient Table */}
              {importTab === "manual" && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <label className="ec-label" style={{ marginBottom: '2px' }}>Enter Recipients</label>
                      <span className="ec-label-hint">Fill in customer names and email addresses cleanly into separate columns below.</span>
                    </div>
                    <button
                      type="button"
                      className="ec-btn ec-btn-ghost"
                      onClick={() => setShowBulkPaste(!showBulkPaste)}
                      style={{ fontSize: '12px', padding: '5px 12px' }}
                    >
                      {showBulkPaste ? '✕ Close Paste Box' : '📋 Paste Bulk Text'}
                    </button>
                  </div>

                  {showBulkPaste && (
                    <div style={{ background: '#F9F8F5', border: '1px solid #E3E1D9', borderRadius: '10px', padding: '14px' }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#1A1A1A', margin: '0 0 6px' }}>
                        Paste lines (Format: email, name — e.g. john@gmail.com, John)
                      </p>
                      <textarea
                        rows={4}
                        value={bulkPasteText}
                        onChange={(e) => setBulkPasteText(e.target.value)}
                        placeholder={"maheshgo2079@gmail.com, Mahesh\nakashsingh10993@gmail.com, Akash"}
                        className="ec-input ec-textarea"
                        style={{ fontSize: '12px', marginBottom: '10px' }}
                      />
                      <button
                        type="button"
                        className="ec-btn ec-btn-secondary"
                        onClick={handleParseBulkPaste}
                        disabled={!bulkPasteText.trim()}
                        style={{ fontSize: '12px', padding: '6px 14px' }}
                      >
                        Convert to Table ↓
                      </button>
                    </div>
                  )}

                  {/* Table Grid */}
                  <div style={{ border: '1px solid #E3E1D9', borderRadius: '10px', overflow: 'hidden', background: '#fff' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#F9F8F5', borderBottom: '1px solid #E3E1D9', color: '#6B6B63', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          <th style={{ padding: '10px 14px', width: '36px' }}>#</th>
                          <th style={{ padding: '10px 14px' }}>Customer Name</th>
                          <th style={{ padding: '10px 14px' }}>Email Address <span style={{ color: '#C0392B' }}>*</span></th>
                          <th style={{ padding: '10px 14px', width: '50px', textAlign: 'center' }}>Remove</th>
                        </tr>
                      </thead>
                      <tbody>
                        {manualRows.map((row, idx) => (
                          <tr key={row.id} style={{ borderBottom: '1px solid #F3F2EE' }}>
                            <td style={{ padding: '8px 14px', color: '#A3A39A', fontWeight: 600, fontSize: '12px' }}>{idx + 1}</td>
                            <td style={{ padding: '8px 10px' }}>
                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) => handleRowChange(row.id, 'name', e.target.value)}
                                placeholder="e.g. Mahesh Wagh"
                                style={{
                                  width: '100%', padding: '7px 10px', border: '1px solid #E3E1D9', borderRadius: '6px',
                                  fontSize: '13px', color: '#1A1A1A', background: '#fff', boxSizing: 'border-box'
                                }}
                              />
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <input
                                type="email"
                                value={row.email}
                                onChange={(e) => handleRowChange(row.id, 'email', e.target.value)}
                                placeholder="e.g. maheshgo2079@gmail.com"
                                style={{
                                  width: '100%', padding: '7px 10px', border: '1px solid #E3E1D9', borderRadius: '6px',
                                  fontSize: '13px', color: '#1A1A1A', background: '#fff', boxSizing: 'border-box'
                                }}
                              />
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(row.id)}
                                disabled={manualRows.length <= 1}
                                style={{
                                  background: 'none', border: 'none', color: '#C0392B', cursor: manualRows.length <= 1 ? 'not-allowed' : 'pointer',
                                  fontSize: '15px', opacity: manualRows.length <= 1 ? 0.3 : 0.8, padding: '4px'
                                }}
                                title="Remove row"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Table Footer Controls */}
                    <div style={{ padding: '10px 14px', background: '#FAFAF7', borderTop: '1px solid #E3E1D9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <button
                        type="button"
                        className="ec-btn ec-btn-ghost"
                        onClick={handleAddRow}
                        style={{ fontSize: '12px', fontWeight: 600 }}
                      >
                        + Add Row
                      </button>

                      <button
                        type="button"
                        className="ec-btn ec-btn-primary"
                        onClick={handleManualTableValidate}
                        disabled={loading || !manualRows.some(r => r.email.trim() || r.name.trim())}
                        style={{ fontSize: '12px', padding: '7px 16px' }}
                      >
                        {loading ? "Validating…" : "Validate List →"}
                      </button>
                    </div>
                  </div>
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

          {/* ── Step 3: Email Design ── */}
          {step === 3 && (
            <EmailTemplateSelector
              businessName={business?.name || ''}
              logoUrl={business?.logoUrl}
              value={templateConfig}
              onChange={handleTemplateChange}
            />
          )}

          {/* ── Step 4: Review & Launch ── */}
          {step === 4 && (
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
                      <span className="label">Sending Method</span>
                      <span className="count" style={{ color: selectedProvider === 'gmail' ? "#10B981" : "#3B82F6" }}>
                        {selectedProvider === 'gmail' ? `✉️ Gmail (${business?.gmailEmail})` : `⚡ Default Server ("${business?.name}")`}
                      </span>
                    </div>
                    <div className="ec-validation-row">
                      <span className="label">Template Style</span>
                      <span className="count" style={{ textTransform: "capitalize" }}>{templateConfig.templateKey}</span>
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
                        ~{Math.max(1, Math.ceil(((validation?.valid.length ?? 0) * (selectedProvider === 'gmail' ? 3 : 0.5)) / 60))} min
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: "13px", color: "#6B6B63", lineHeight: 1.6, margin: 0 }}>
                    {selectedProvider === 'gmail'
                      ? 'Emails will be sent directly through your Gmail API connection. Replies will arrive in your Gmail inbox.'
                      : 'Emails will be sent via our default server with your logo and business identity.'}
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
                Next: Import contacts →
              </button>
            )}
            {step === 2 && (
              <button id="ec-wizard-next-2" className="ec-btn ec-btn-primary"
                disabled={!canGoNext2 || loading} onClick={() => setStep(3)}>
                Next: Email design →
              </button>
            )}
            {step === 3 && (
              <button id="ec-wizard-next-3" className="ec-btn ec-btn-primary"
                disabled={!canGoNext3 || loading} onClick={createCampaign}>
                {loading ? "Creating…" : "Review & confirm →"}
              </button>
            )}
            {step === 4 && !launched && (
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
    } catch {/* ignore */ }
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
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
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
            <div style={{ marginTop: "6px", display: "flex", gap: "6px", alignItems: "center" }}>
              <StatusBadge status={c.status} />
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700">
                {c.sendingConfig?.provider === 'gmail' ? '✉️ Gmail' : '⚡ Default Server'}
              </span>
            </div>
          </div>

          <button className="ec-wizard-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
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

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { data: campaignsData, isLoading: loading, refetch } = useEmailCampaigns({
    page,
    limit: rowsPerPage,
    status: statusFilter,
  });

  const campaigns = campaignsData?.campaigns || [];
  const pagination = campaignsData?.pagination || {
    page,
    limit: rowsPerPage,
    total: campaigns.length,
    totalPages: Math.max(1, Math.ceil(campaigns.length / rowsPerPage)),
  };

  const visibleCampaigns = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return campaigns;
    return campaigns.filter((c) => c.name.toLowerCase().includes(term));
  }, [campaigns, search]);

  const stats = useMemo(() => {
    return {
      total: pagination.total,
      running: campaigns.filter((c) => c.status === "running").length,
      sent: campaigns.reduce((sum, c) => sum + (c.successCount || 0), 0),
      failed: campaigns.reduce((sum, c) => sum + (c.failedCount || 0), 0),
    };
  }, [campaigns, pagination.total]);

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
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Campaign
        </button>
      </div>

      {/* Stats Cards */}
      <section className="ec-page-stat-grid" aria-label="Campaign summary">
        <div className="ec-page-stat-card">
          <div className="ec-page-stat-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <p className="ec-page-stat-card__label">Total Campaigns</p>
            <strong>{stats.total}</strong>
            <span>All time</span>
          </div>
        </div>
        <div className="ec-page-stat-card">
          <div className="ec-page-stat-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <p className="ec-page-stat-card__label">Active / Running</p>
            <strong>{stats.running}</strong>
            <span>Current page</span>
          </div>
        </div>
        <div className="ec-page-stat-card">
          <div className="ec-page-stat-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m22 2-7 20-4-9-9-4 20-7Z" />
              <path d="M22 2 11 13" />
            </svg>
          </div>
          <div>
            <p className="ec-page-stat-card__label">Emails Sent</p>
            <strong>{stats.sent}</strong>
            <span>Current page</span>
          </div>
        </div>
        <div className="ec-page-stat-card ec-page-stat-card--danger">
          <div className="ec-page-stat-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.3 4.3 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
            </svg>
          </div>
          <div>
            <p className="ec-page-stat-card__label">Failed Deliveries</p>
            <strong>{stats.failed}</strong>
            <span>Current page</span>
          </div>
        </div>
      </section>

      {/* Main Campaign Panel */}
      <section className="ec-panel" aria-labelledby="email-campaign-list-title">
        <div className="ec-panel__header">
          <div className="ec-panel__title-row">
            <div>
              <h2 id="email-campaign-list-title">All Campaigns</h2>
              <p>{pagination.total.toLocaleString()} campaigns</p>
            </div>
          </div>

          <div className="ec-toolbar">
            <label className="ec-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search campaigns..."
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </label>

            <label className="ec-select-wrap">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="running">Sending</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </div>
        </div>

        {loading ? (
          <p style={{ padding: "32px", color: "#6B6B63", fontSize: "14px", textAlign: "center" }}>Loading campaigns…</p>
        ) : campaigns.length === 0 ? (
          <div className="ec-empty" style={{ border: "none" }}>
            <div className="ec-empty-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <polyline points="3,9 12,15 21,9" />
              </svg>
            </div>
            <h2 className="ec-empty-title">No campaigns found</h2>
            <p className="ec-empty-desc">
              Create a new email campaign to request reviews.
            </p>
          </div>
        ) : (
          <>
            <div className="ec-table-wrap">
              <table className="ec-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCampaigns.map((c) => {
                    const processed = (c.successCount || 0) + (c.failedCount || 0) + (c.skippedCount || 0);
                    const progressPct = c.totalRecipients > 0 ? Math.round((processed / c.totalRecipients) * 100) : 0;
                    return (
                      <tr key={c._id} onClick={() => setSelectedId(c._id)}>
                        <td>
                          <span className="ec-table__name">{c.name}</span>
                          <span className="ec-table__subject">{c.emailSubject}</span>
                        </td>
                        <td>
                          <StatusBadge status={c.status} />
                        </td>
                        <td>
                          <div className="ec-delivery">
                            <div className="ec-delivery__meta">
                              <span>{progressPct}% ({processed}/{c.totalRecipients})</span>
                            </div>
                            <div className="ec-delivery__track">
                              <span className="ec-delivery__success" style={{ width: `${progressPct}%` }} />
                            </div>
                            {c.failedCount > 0 && (
                              <span className="ec-delivery__failed">{c.failedCount} failed</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="ec-table__date">
                            {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(c.createdAt))}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="ec-pagination">
              <span className="ec-pagination__page">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="ec-pagination__controls">
                <label>
                  Rows per page:
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </label>
                <button
                  className="ec-btn ec-btn-ghost"
                  style={{ padding: "5px 10px" }}
                  disabled={pagination.page <= 1}
                  onClick={(e) => { e.stopPropagation(); setPage(p => p - 1); }}
                >
                  Prev
                </button>
                <button
                  className="ec-btn ec-btn-ghost"
                  style={{ padding: "5px 10px" }}
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={(e) => { e.stopPropagation(); setPage(p => p + 1); }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

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
