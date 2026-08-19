import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { MouseEvent, ReactNode } from "react";
import "./campaigns.css";
import { useBilling } from "../lib/useBilling";
import {
  useBulkDeleteCampaigns,
  useCampaign,
  useCampaignAction,
  useCampaigns,
  useCreateCampaign,
  useDeleteCampaign,
  useImportCsv,
  useRecipients,
} from "../hooks/queries/useCampaigns";
import { useWhatsappStatusRaw } from "../hooks/queries/useWhatsapp";
import { useCurrentBusiness } from "../hooks/queries/useBusiness";
import { WhatsappTemplateSelector, WhatsappTemplateConfig } from "../components/WhatsappTemplateSelector";
import type { CampaignSummary, CsvPreview } from "../services/campaignService";

type ViewMode = "list" | "detail";

type ConfirmModal = {
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void | Promise<void>;
} | null;

const STATUS_FILTERS = [
  { label: "All", value: "all" },
  { label: "Running", value: "running" },
  { label: "Completed", value: "completed" },
  { label: "Failed", value: "failed" },
  { label: "Cancelled", value: "cancelled" },
];

function statusLabel(status: string) {
  const map: Record<string, string> = {
    draft: "Draft",
    running: "Sending",
    paused: "Paused",
    completed: "Completed",
    failed: "Failed",
    cancelled: "Cancelled",
  };
  return map[status] || status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function StepBar({ current }: { current: number }) {
  const steps = ["Campaign Details", "Import Contacts", "Message & Tone", "Review & Send"];
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
              ) : (
                idx
              )}
            </div>
            <span className="ec-step-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── WhatsApp Campaign Creation Wizard Modal ───────────────────────────────────

interface WizardProps {
  onClose: () => void;
  onCreated: (createdId?: string) => void;
  isWhatsappConnected: boolean;
  connectedPhone?: string;
}

function WhatsAppCampaignWizard({
  onClose,
  onCreated,
  isWhatsappConnected,
  connectedPhone,
}: WizardProps) {
  const [step, setStep] = useState(1);
  const [campaignName, setCampaignName] = useState("");
  const [importTab, setImportTab] = useState<"csv" | "sheet" | "manual">("csv");
  const [sheetUrl, setSheetUrl] = useState("");
  const [manualRows, setManualRows] = useState<{ id: string; name: string; phone: string }[]>([
    { id: "1", name: "", phone: "" },
    { id: "2", name: "", phone: "" },
    { id: "3", name: "", phone: "" },
  ]);
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [validation, setValidation] = useState<CsvPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);

  const [templateConfig, setTemplateConfig] = useState<WhatsappTemplateConfig>({
    templateKey: "warm",
    customMessage: "",
  });

  const { data: business } = useCurrentBusiness();
  const importCsvMut = useImportCsv();
  const createCampaignMut = useCreateCampaign();
  const actionMut = useCampaignAction();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddRow = () => {
    setManualRows((prev) => [...prev, { id: String(Date.now() + Math.random()), name: "", phone: "" }]);
  };

  const handleRemoveRow = (id: string) => {
    setManualRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRowChange = (id: string, field: "name" | "phone", val: string) => {
    setManualRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  };

  const handleParseBulkPaste = () => {
    if (!bulkPasteText.trim()) return;
    const lines = bulkPasteText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const parsedRows = lines.map((line, idx) => {
      const parts = line.split(",");
      const first = (parts[0] || "").trim();
      const second = parts.slice(1).join(",").trim();
      const isFirstPhone = /^[\d+\-\s()]+$/.test(first);
      return {
        id: String(Date.now() + idx),
        phone: isFirstPhone ? first : second,
        name: isFirstPhone ? second : first,
      };
    });
    setManualRows((prev) => {
      const existingFilled = prev.filter((r) => r.name.trim() || r.phone.trim());
      return [...existingFilled, ...parsedRows];
    });
    setBulkPasteText("");
    setShowBulkPaste(false);
  };

  const handleRemoveUploadedFile = () => {
    setUploadedFileName(null);
    setValidation(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  async function handleFileUpload(file: File) {
    setError("");
    setValidation(null);
    setLoading(true);
    try {
      const data = await importCsvMut.mutateAsync(file);
      setValidation(data);
      setUploadedFileName(file.name);
    } catch (err: any) {
      setError(err.message || "Upload failed");
      setUploadedFileName(null);
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
      setError(err.message || "Could not fetch Google Sheet");
    }
    setLoading(false);
  }

  async function handleManualTableValidate() {
    const validRows = manualRows.filter((r) => r.phone.trim() || r.name.trim());
    if (validRows.length === 0) {
      setError("Please enter at least one recipient phone number.");
      return;
    }
    setError("");
    setValidation(null);
    setLoading(true);
    try {
      const data = await importCsvMut.mutateAsync({
        manualRecipients: validRows.map((r) => ({ name: r.name.trim(), phone: r.phone.trim() })),
      });
      setValidation(data);
    } catch (err: any) {
      setError(err.message || "Validation failed");
    }
    setLoading(false);
  }

  async function createCampaign() {
    if (!campaignName.trim() || !validation?.validRecords?.length) return;
    setError("");
    setLoading(true);
    try {
      const data = await createCampaignMut.mutateAsync({
        name: campaignName.trim(),
        templateKey: templateConfig.templateKey,
        variables: {
          customMessage: templateConfig.customMessage,
          buttonText: templateConfig.buttonText,
        },
        recipients: validation.validRecords,
      });
      setCreatedId(data._id);
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
      setTimeout(() => {
        onCreated(createdId);
        onClose();
      }, 1600);
    } catch (err: any) {
      setError(err.message || "Failed to start campaign");
    }
    setLaunching(false);
  }

  const canGoNext1 = campaignName.trim().length > 0;
  const canGoNext2 = (validation?.valid ?? 0) > 0;

  return (
    <div className="ec-wizard-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ec-wizard" role="dialog" aria-modal="true" aria-label="New WhatsApp Campaign">
        {/* Header */}
        <div className="ec-wizard-header">
          <h2 className="ec-wizard-title">New WhatsApp Campaign</h2>
          <button className="ec-wizard-close" onClick={onClose} aria-label="Close wizard">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Step bar */}
        <StepBar current={step} />

        {/* Wizard Body */}
        <div className="ec-wizard-body">
          {/* ── Step 1: Campaign Details & Channel ── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="ec-field" style={{ marginBottom: 0 }}>
                <label className="ec-label" htmlFor="wa-campaign-name">
                  Campaign Name
                </label>
                <input
                  id="wa-campaign-name"
                  className="ec-input"
                  type="text"
                  placeholder="e.g. July WhatsApp Review Drive"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  maxLength={120}
                />
              </div>

              {/* WhatsApp Sender Channel Card with Genuine Green WhatsApp Logo */}
              <div className="ec-field" style={{ marginBottom: 0 }}>
                <label className="ec-label">WhatsApp Sender Connection</label>
                <div
                  style={{
                    padding: "18px 20px",
                    borderRadius: "12px",
                    border: isWhatsappConnected ? "1px solid #C6E6C0" : "1px solid #F8D7DA",
                    background: isWhatsappConnected ? "#F4FAF2" : "#FDF8F8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "12px",
                        background: "#25D366",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: "0 2px 8px rgba(37, 211, 102, 0.35)",
                      }}
                    >
                      <WhatsAppBrandIcon size={26} color="#FFFFFF" />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#1A1A1A" }}>
                          WhatsApp Session
                        </span>
                        <span
                          className={`campaign-status-badge campaign-status-badge--${isWhatsappConnected ? "running" : "failed"}`}
                          style={{ fontSize: "10px", padding: "1px 8px" }}
                        >
                          {isWhatsappConnected ? "Connected" : "Offline"}
                        </span>
                      </div>
                      <p style={{ fontSize: "12px", color: "#6B6B63", margin: "2px 0 0", lineHeight: 1.4 }}>
                        {isWhatsappConnected
                          ? connectedPhone
                            ? `Messages will send from +${connectedPhone}`
                            : "Your WhatsApp account is active and ready."
                          : "Connect your WhatsApp number to create and launch campaigns."}
                      </p>
                    </div>
                  </div>

                  {!isWhatsappConnected && (
                    <Link
                      to="/whatsapp"
                      className="ec-btn ec-btn-primary"
                      style={{ fontSize: "12px", padding: "8px 14px", textDecoration: "none", background: "#25D366" }}
                    >
                      Connect WhatsApp →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Import Contacts ── */}
          {step === 2 && (
            <>
              <div className="ec-import-tabs">
                {(["csv", "sheet", "manual"] as const).map((tab) => (
                  <button
                    key={tab}
                    id={`wa-import-tab-${tab}`}
                    className={`ec-import-tab${importTab === tab ? " active" : ""}`}
                    onClick={() => {
                      setImportTab(tab);
                      setError("");
                    }}
                  >
                    {tab === "csv" ? "📄 Upload CSV" : tab === "sheet" ? "📊 Google Sheet" : "✏️ Type manually"}
                  </button>
                ))}
              </div>

              {/* CSV Upload */}
              {importTab === "csv" && (
                <>
                  {uploadedFileName ? (
                    <div
                      style={{
                        background: "#F9F8F5",
                        border: "1px dashed #1A1A1A",
                        borderRadius: "12px",
                        padding: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "16px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <div
                          style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "10px",
                            background: "#E8F5E9",
                            color: "#2E7D32",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "22px",
                          }}
                        >
                          📄
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "14px", fontWeight: 600, color: "#1A1A1A" }}>{uploadedFileName}</span>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                padding: "2px 8px",
                                borderRadius: "12px",
                                background: "#E8F5E9",
                                color: "#2E7D32",
                              }}
                            >
                              Uploaded & Validated
                            </span>
                          </div>
                          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#6B6B63" }}>
                            {validation ? `${validation.validRecords?.length || 0} valid recipient(s) ready` : "File uploaded successfully"}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          className="ec-btn ec-btn-ghost"
                          onClick={() => {
                            if (fileInputRef.current) fileInputRef.current.value = "";
                            fileInputRef.current?.click();
                          }}
                          style={{ fontSize: "12px", padding: "6px 12px" }}
                        >
                          Change File
                        </button>
                        <button
                          type="button"
                          className="ec-btn ec-btn-ghost"
                          onClick={handleRemoveUploadedFile}
                          style={{ fontSize: "12px", padding: "6px 12px", color: "#C0392B" }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="ec-upload-area"
                      onClick={() => {
                        if (fileInputRef.current) fileInputRef.current.value = "";
                        fileInputRef.current?.click();
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add("drag-over");
                      }}
                      onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove("drag-over");
                        const file = e.dataTransfer.files[0];
                        if (file) handleFileUpload(file);
                      }}
                    >
                      <div className="ec-upload-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </div>
                      <p className="ec-upload-text">
                        <strong>Click to upload</strong> or drag and drop
                      </p>
                      <p className="ec-upload-hint">
                        CSV file with a <code>phone</code> column (and optional <code>name</code>)
                      </p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f);
                    }}
                  />

                  {/* Format Helper Card */}
                  <div style={{ background: "#F9F8F5", border: "1px solid #E3E1D9", borderRadius: "10px", padding: "14px", marginTop: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#1A1A1A", display: "flex", alignItems: "center", gap: "6px" }}>
                        💡 Expected CSV Format
                      </span>
                      <button
                        type="button"
                        className="ec-btn ec-btn-ghost"
                        onClick={() => {
                          const content = "name,phone\nMahesh Wagh,+12345678901\nAkash Singh,+19876543210\nJohn Doe,+15551234567";
                          const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "sample_whatsapp_contacts.csv";
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        style={{ fontSize: "11px", padding: "4px 10px", color: "#1A1A1A", border: "1px solid #E3E1D9" }}
                      >
                        📥 Download Sample CSV
                      </button>
                    </div>
                    <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#6B6B63", lineHeight: 1.4 }}>
                      First row must contain column headers. Requires a <code>phone</code> (or <code>mobile</code>) column and optional <code>name</code> column.
                    </p>
                    <div style={{ background: "#fff", border: "1px solid #E3E1D9", borderRadius: "6px", padding: "8px 12px", fontFamily: "monospace", fontSize: "11px", color: "#333" }}>
                      <div style={{ fontWeight: 700, color: "#1A1A1A" }}>name, phone</div>
                      <div style={{ color: "#6B6B63" }}>Mahesh Wagh, +12345678901</div>
                      <div style={{ color: "#6B6B63" }}>Akash Singh, +19876543210</div>
                    </div>
                  </div>
                </>
              )}

              {/* Google Sheet */}
              {importTab === "sheet" && (
                <div className="ec-field">
                  <label className="ec-label" htmlFor="wa-sheet-url">
                    Google Sheet URL <span className="ec-label-hint">must be shared as "Anyone with the link can view"</span>
                  </label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input
                      id="wa-sheet-url"
                      className="ec-input"
                      type="url"
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                    />
                    <button
                      id="wa-sheet-fetch-btn"
                      className="ec-btn ec-btn-primary"
                      onClick={handleSheetFetch}
                      disabled={loading || !sheetUrl.trim()}
                      style={{ flexShrink: 0 }}
                    >
                      {loading ? "Fetching…" : "Fetch"}
                    </button>
                  </div>
                  
                  {/* Google Sheet Format Helper */}
                  <div style={{ background: "#F9F8F5", border: "1px solid #E3E1D9", borderRadius: "10px", padding: "14px", marginTop: "14px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#1A1A1A", display: "block", marginBottom: "8px" }}>
                      💡 How to format & share your Google Sheet:
                    </span>
                    <ol style={{ margin: "0 0 10px", paddingLeft: "18px", fontSize: "12px", color: "#6B6B63", lineHeight: 1.6 }}>
                      <li>Row 1 must be headers containing <code>phone</code> (or <code>mobile</code>) and optional <code>name</code>.</li>
                      <li>In Google Sheets, click the <strong>Share</strong> button (top right).</li>
                      <li>Under General Access, select <strong>"Anyone with the link can view"</strong>.</li>
                      <li>Copy the sheet URL, paste it above, and click <strong>Fetch</strong>.</li>
                    </ol>
                    <div style={{ background: "#fff", border: "1px solid #E3E1D9", borderRadius: "6px", padding: "8px 12px", fontFamily: "monospace", fontSize: "11px", color: "#333" }}>
                      <div style={{ fontWeight: 700, color: "#1A1A1A" }}>name | phone</div>
                      <div style={{ color: "#6B6B63" }}>Mahesh Wagh | +12345678901</div>
                      <div style={{ color: "#6B6B63" }}>Akash Singh | +19876543210</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Table Grid */}
              {importTab === "manual" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <label className="ec-label" style={{ marginBottom: "2px" }}>
                        Enter Recipients
                      </label>
                      <span className="ec-label-hint">
                        Enter customer names and phone numbers cleanly into separate columns below.
                      </span>
                    </div>
                    <button
                      type="button"
                      className="ec-btn ec-btn-ghost"
                      onClick={() => setShowBulkPaste(!showBulkPaste)}
                      style={{ fontSize: "12px", padding: "5px 12px" }}
                    >
                      {showBulkPaste ? "✕ Close Paste Box" : "📋 Paste Bulk Text"}
                    </button>
                  </div>

                  {showBulkPaste && (
                    <div style={{ background: "#F9F8F5", border: "1px solid #E3E1D9", borderRadius: "10px", padding: "14px" }}>
                      <p style={{ fontSize: "12px", fontWeight: 600, color: "#1A1A1A", margin: "0 0 6px" }}>
                        Paste lines (Format: <code>phone, name</code> — e.g. <code>919876543210, John Doe</code>)
                      </p>
                      <textarea
                        rows={4}
                        value={bulkPasteText}
                        onChange={(e) => setBulkPasteText(e.target.value)}
                        placeholder={"919876543210, John Doe\n919812345678, Priya Sharma"}
                        className="ec-input ec-textarea"
                        style={{ fontSize: "12px", marginBottom: "10px" }}
                      />
                      <button
                        type="button"
                        className="ec-btn ec-btn-secondary"
                        onClick={handleParseBulkPaste}
                        disabled={!bulkPasteText.trim()}
                        style={{ fontSize: "12px", padding: "6px 14px" }}
                      >
                        Convert to Table ↓
                      </button>
                    </div>
                  )}

                  {/* Table Grid */}
                  <div style={{ border: "1px solid #E3E1D9", borderRadius: "10px", overflow: "hidden", background: "#fff" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "#F9F8F5", borderBottom: "1px solid #E3E1D9", color: "#6B6B63", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          <th style={{ padding: "10px 14px", width: "36px" }}>#</th>
                          <th style={{ padding: "10px 14px" }}>Customer Name</th>
                          <th style={{ padding: "10px 14px" }}>WhatsApp Phone Number</th>
                          <th style={{ padding: "10px 14px", width: "40px", textAlign: "center" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {manualRows.map((row, idx) => (
                          <tr key={row.id} style={{ borderBottom: idx === manualRows.length - 1 ? "none" : "1px solid #F3F2EE" }}>
                            <td style={{ padding: "8px 14px", color: "#A3A39A", fontSize: "12px" }}>{idx + 1}</td>
                            <td style={{ padding: "6px 10px" }}>
                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) => handleRowChange(row.id, "name", e.target.value)}
                                placeholder="e.g. John Doe"
                                style={{
                                  width: "100%",
                                  padding: "6px 10px",
                                  border: "1px solid #E3E1D9",
                                  borderRadius: "6px",
                                  fontSize: "13px",
                                  boxSizing: "border-box",
                                }}
                              />
                            </td>
                            <td style={{ padding: "6px 10px" }}>
                              <input
                                type="text"
                                value={row.phone}
                                onChange={(e) => handleRowChange(row.id, "phone", e.target.value)}
                                placeholder="e.g. 919876543210 (with country code)"
                                style={{
                                  width: "100%",
                                  padding: "6px 10px",
                                  border: "1px solid #E3E1D9",
                                  borderRadius: "6px",
                                  fontSize: "13px",
                                  boxSizing: "border-box",
                                }}
                              />
                            </td>
                            <td style={{ padding: "6px 10px", textAlign: "center" }}>
                              {manualRows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRow(row.id)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#A3A39A",
                                    cursor: "pointer",
                                    fontSize: "16px",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                  }}
                                  title="Remove row"
                                >
                                  ×
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <button
                      type="button"
                      className="ec-btn ec-btn-ghost"
                      onClick={handleAddRow}
                      style={{ fontSize: "12px", padding: "6px 14px" }}
                    >
                      + Add Row
                    </button>
                    <button
                      type="button"
                      className="ec-btn ec-btn-primary"
                      onClick={handleManualTableValidate}
                      disabled={loading || !manualRows.some((r) => r.phone.trim())}
                      style={{ fontSize: "12px", padding: "7px 18px" }}
                    >
                      {loading ? "Validating..." : "Validate Recipients →"}
                    </button>
                  </div>
                </div>
              )}

              {/* Validation Result Summary */}
              {validation && (
                <div className="ec-validation-summary">
                  <div className="ec-validation-row success">
                    <span className="label">✓ Valid numbers ready to send</span>
                    <span className="count">{validation.valid}</span>
                  </div>
                  {validation.skipped > 0 && (
                    <div className="ec-validation-row warn">
                      <span className="label">⚠ Skipped / Ineligible rows</span>
                      <span className="count">{validation.skipped}</span>
                    </div>
                  )}
                  {validation.invalid > 0 && (
                    <div className="ec-validation-row error">
                      <span className="label">✗ Invalid phone format</span>
                      <span className="count">{validation.invalid}</span>
                    </div>
                  )}
                  {validation.duplicate > 0 && (
                    <div className="ec-validation-row warn">
                      <span className="label">⚠ Duplicates removed</span>
                      <span className="count">{validation.duplicate}</span>
                    </div>
                  )}

                  {validation.reasons && validation.reasons.length > 0 && (
                    <details style={{ padding: "10px 16px", background: "#FAFAF7", fontSize: "12px" }}>
                      <summary style={{ cursor: "pointer", color: "#6B6B63", fontWeight: 600 }}>
                        View {validation.reasons.length} skipped details
                      </summary>
                      <div style={{ marginTop: "8px", maxHeight: "140px", overflowY: "auto" }}>
                        {validation.reasons.slice(0, 15).map((r, i) => (
                          <div key={i} style={{ color: "#C0392B", padding: "2px 0" }}>
                            Row {r.row}: {r.phone} — {r.reason}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Step 3: Message Tone & WhatsApp Preview ── */}
          {step === 3 && (
            <WhatsappTemplateSelector
              businessName={business?.name || ""}
              reviewUrl={(business as any)?.googleReviewUrl || (business as any)?.googleReviewLink || ""}
              value={templateConfig}
              onChange={setTemplateConfig}
            />
          )}

          {/* ── Step 4: Review & Send / Launch ── */}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    background: "#E9F2E7",
                    color: "#3F7D45",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px",
                    fontSize: "24px",
                  }}
                >
                  ✓
                </div>
                <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1A1A1A", margin: "0 0 4px" }}>
                  Campaign Ready!
                </h3>
                <p style={{ fontSize: "13px", color: "#6B6B63", margin: 0 }}>
                  Review the details below before launching your WhatsApp campaign.
                </p>
              </div>

              {/* Summary Card */}
              <div style={{ background: "#F9F8F5", border: "1px solid #E3E1D9", borderRadius: "12px", padding: "18px 20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", fontSize: "13px" }}>
                  <div>
                    <span style={{ color: "#6B6B63", display: "block", fontSize: "11px", textTransform: "uppercase" }}>Campaign Name</span>
                    <strong style={{ color: "#1A1A1A" }}>{campaignName}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#6B6B63", display: "block", fontSize: "11px", textTransform: "uppercase" }}>Channel</span>
                    <strong style={{ color: "#1A1A1A" }}>WhatsApp Direct</strong>
                  </div>
                  <div>
                    <span style={{ color: "#6B6B63", display: "block", fontSize: "11px", textTransform: "uppercase" }}>Recipients</span>
                    <strong style={{ color: "#3F7D45" }}>{validation?.valid || 0} customers</strong>
                  </div>
                  <div>
                    <span style={{ color: "#6B6B63", display: "block", fontSize: "11px", textTransform: "uppercase" }}>Sender Number</span>
                    <strong style={{ color: "#1A1A1A" }}>{connectedPhone ? `+${connectedPhone}` : "Connected Session"}</strong>
                  </div>
                </div>
              </div>

              {launched ? (
                <div style={{ padding: "16px", borderRadius: "10px", background: "#E9F2E7", color: "#2D6030", textAlign: "center", fontSize: "14px", fontWeight: 600 }}>
                  🚀 Campaign started successfully! Loading campaign dashboard...
                </div>
              ) : (
                <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                  <button
                    type="button"
                    className="ec-btn ec-btn-secondary"
                    onClick={() => {
                      onCreated(createdId || undefined);
                      onClose();
                    }}
                    style={{ flex: 1, justifyContent: "center" }}
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    className="ec-btn ec-btn-primary"
                    onClick={launchCampaign}
                    disabled={launching || !isWhatsappConnected}
                    style={{ flex: 1.5, justifyContent: "center", background: "#25D366" }}
                  >
                    {launching ? "Starting Campaign..." : "🚀 Launch Campaign Now"}
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={{ marginTop: "16px", padding: "10px 14px", borderRadius: "8px", background: "#FDF2F2", border: "1px solid #F8D7DA", color: "#C0392B", fontSize: "12px" }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Wizard Footer */}
        {step < 4 && (
          <div className="ec-wizard-footer">
            {step > 1 ? (
              <button className="ec-btn ec-btn-secondary" onClick={() => setStep(step - 1)}>
                ← Back
              </button>
            ) : (
              <div />
            )}

            {step === 1 && (
              <button className="ec-btn ec-btn-primary" disabled={!canGoNext1} onClick={() => setStep(2)}>
                Next: Import Contacts →
              </button>
            )}

            {step === 2 && (
              <button className="ec-btn ec-btn-primary" disabled={!canGoNext2} onClick={() => setStep(3)}>
                Next: Choose Template & Tone →
              </button>
            )}

            {step === 3 && (
              <button className="ec-btn ec-btn-primary" disabled={loading} onClick={createCampaign}>
                {loading ? "Creating Campaign..." : "Review & Launch →"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Campaigns Page ───────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [view, setView] = useState<ViewMode>("list");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState<ConfirmModal>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showWizard, setShowWizard] = useState(false);

  const { subscription, isLoading: planLoading } = useBilling();
  const isPlanBlocked = !planLoading && subscription?.plan === "free";

  const {
    data: campaignsData,
    isLoading: listLoading,
    isError: listError,
    refetch: refetchCampaigns,
    isFetching: listFetching,
  } = useCampaigns({ page, limit: rowsPerPage, status: statusFilter });

  const campaigns = campaignsData?.campaigns || [];
  const pagination = campaignsData?.pagination || {
    page,
    limit: rowsPerPage,
    total: campaigns.length,
    totalPages: Math.max(1, Math.ceil(campaigns.length / rowsPerPage)),
  };

  const { data: detail, refetch: refetchDetail } = useCampaign(
    selectedCampaignId || "",
    view === "detail" && !!selectedCampaignId
  );
  const [recipientPage, setRecipientPage] = useState(1);
  const { data: recipientsData } = useRecipients(selectedCampaignId || "", recipientPage);
  const recipients = recipientsData?.recipients || [];
  const recipientTotal = recipientsData?.total || 0;

  const { data: whatsappData, isLoading: whatsappChecking } = useWhatsappStatusRaw();
  const whatsappStatus =
    whatsappData?.liveStatus?.instance?.state ||
    whatsappData?.liveStatus?.state ||
    whatsappData?.status ||
    "disconnected";
  const isWhatsappConnected = whatsappStatus === "open" || whatsappStatus === "connected";

  const campaignActionMut = useCampaignAction();
  const deleteCampaignMut = useDeleteCampaign();
  const bulkDeleteMut = useBulkDeleteCampaigns();

  const [actionLoading, setActionLoading] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

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

  const selectedVisibleIds = visibleCampaigns
    .map((c) => c._id)
    .filter((id) => selectedIds.includes(id));
  const allVisibleSelected = visibleCampaigns.length > 0 && selectedVisibleIds.length === visibleCampaigns.length;

  useEffect(() => {
    setSelectedIds([]);
    setOpenMenuId(null);
  }, [page, rowsPerPage, statusFilter]);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    window.setTimeout(() => setToast(null), 4000);
  };

  const openDetail = (id: string) => {
    setSelectedCampaignId(id);
    setRecipientPage(1);
    setView("detail");
    setOpenMenuId(null);
  };

  const handleAction = async (id: string, action: "start" | "pause" | "resume" | "cancel") => {
    setActionLoading(action);
    try {
      await campaignActionMut.mutateAsync({ id, action });
      showToast("success", `Campaign ${action} completed`);
    } catch (err: any) {
      showToast("error", err.message || `Failed to ${action} campaign`);
    } finally {
      setActionLoading("");
    }
  };

  const handleDeleteCampaign = (id: string, name: string, event?: MouseEvent) => {
    event?.stopPropagation();
    setOpenMenuId(null);
    setConfirmModal({
      title: "Delete campaign?",
      message: `This will permanently delete "${name}". This action cannot be undone.`,
      confirmText: "Delete campaign",
      onConfirm: async () => {
        setActionLoading(`delete-${id}`);
        try {
          await deleteCampaignMut.mutateAsync(id);
          showToast("success", `Campaign "${name}" deleted`);
          setSelectedIds((prev) => prev.filter((item) => item !== id));
          if (selectedCampaignId === id && view === "detail") setView("list");
        } catch (err: any) {
          showToast("error", err.message || "Failed to delete campaign");
        } finally {
          setActionLoading("");
        }
      },
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      title: "Delete selected campaigns?",
      message: `This will permanently delete ${selectedIds.length} selected campaign(s) and their recipient records.`,
      confirmText: `Delete ${selectedIds.length} campaigns`,
      onConfirm: async () => {
        setActionLoading("bulk-delete");
        try {
          await bulkDeleteMut.mutateAsync(selectedIds);
          showToast("success", `Deleted ${selectedIds.length} campaign(s)`);
          setSelectedIds([]);
        } catch (err: any) {
          showToast("error", err.message || "Failed to delete campaigns");
        } finally {
          setActionLoading("");
        }
      },
    });
  };

  const toggleSelect = (id: string, event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    const visibleIds = visibleCampaigns.map((c) => c._id);
    setSelectedIds((prev) => {
      if (allVisibleSelected) return prev.filter((id) => !visibleIds.includes(id));
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  if (!planLoading && isPlanBlocked) {
    return <PlanBlockedCard />;
  }

  return (
    <div className="campaigns-page animate-fade-in">
      <CampaignPageHeader
        view={view}
        onBack={() => setView("list")}
        onNewCampaign={() => setShowWizard(true)}
        canCreate={isWhatsappConnected}
      />

      {toast && (
        <div className={`campaign-toast campaign-toast--${toast.type}`} role="status">
          {toast.msg}
        </div>
      )}

      {view === "list" && (
        <>
          <WhatsAppConnectionCard
            status={whatsappStatus}
            checking={whatsappChecking}
            instancePhone={whatsappData?.instance?.connectedPhone}
          />

          <CampaignStats stats={stats} />

          <section className="campaign-panel" aria-labelledby="campaign-list-title">
            <CampaignToolbar
              total={pagination.total}
              search={search}
              statusFilter={statusFilter}
              selectedCount={selectedIds.length}
              refreshing={listFetching}
              onSearch={setSearch}
              onStatusFilter={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
              onRefresh={() => refetchCampaigns()}
              onBulkDelete={handleBulkDelete}
              onClearSelection={() => setSelectedIds([])}
            />

            {listLoading ? (
              <CampaignTableSkeleton />
            ) : listError ? (
              <CampaignErrorState onRetry={() => refetchCampaigns()} />
            ) : campaigns.length === 0 && !search ? (
              <CampaignEmptyState
                onCreate={() => setShowWizard(true)}
                disabled={!isWhatsappConnected}
              />
            ) : visibleCampaigns.length === 0 ? (
              <CampaignSearchEmptyState onClear={clearFilters} />
            ) : (
              <>
                <CampaignTable
                  campaigns={visibleCampaigns}
                  selectedIds={selectedIds}
                  allVisibleSelected={allVisibleSelected}
                  openMenuId={openMenuId}
                  actionLoading={actionLoading}
                  onToggleSelect={toggleSelect}
                  onToggleSelectAll={toggleSelectAll}
                  onOpenDetail={openDetail}
                  onToggleMenu={(id) => setOpenMenuId((current) => (current === id ? null : id))}
                  onDelete={handleDeleteCampaign}
                />

                <CampaignMobileList
                  campaigns={visibleCampaigns}
                  selectedIds={selectedIds}
                  openMenuId={openMenuId}
                  actionLoading={actionLoading}
                  onToggleSelect={toggleSelect}
                  onOpenDetail={openDetail}
                  onToggleMenu={(id) => setOpenMenuId((current) => (current === id ? null : id))}
                  onDelete={handleDeleteCampaign}
                />

                <CampaignPagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  limit={rowsPerPage}
                  total={pagination.total}
                  shown={visibleCampaigns.length}
                  searchActive={search.trim().length > 0}
                  onPageChange={setPage}
                  onRowsPerPageChange={(limit) => {
                    setRowsPerPage(limit);
                    setPage(1);
                  }}
                />
              </>
            )}
          </section>
        </>
      )}

      {view === "detail" && detail && (
        <CampaignDetail
          detail={detail}
          recipients={recipients}
          recipientPage={recipientPage}
          recipientTotal={recipientTotal}
          actionLoading={actionLoading}
          canSend={isWhatsappConnected}
          onAction={handleAction}
          onDelete={handleDeleteCampaign}
          onRefresh={() => refetchDetail()}
          onRecipientPage={setRecipientPage}
          onConfirm={setConfirmModal}
        />
      )}

      {/* Creation Wizard Modal */}
      {showWizard && (
        <WhatsAppCampaignWizard
          onClose={() => setShowWizard(false)}
          onCreated={(newId) => {
            refetchCampaigns();
            if (newId) {
              openDetail(newId);
            }
          }}
          isWhatsappConnected={isWhatsappConnected}
          connectedPhone={whatsappData?.instance?.connectedPhone}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {confirmModal && (
        <DeleteCampaignDialog
          modal={confirmModal}
          onClose={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function CampaignPageHeader({
  view,
  canCreate,
  onBack,
  onNewCampaign,
}: {
  view: ViewMode;
  canCreate: boolean;
  onBack: () => void;
  onNewCampaign: () => void;
}) {
  return (
    <header className="campaign-page-header">
      <div className="campaign-page-header__copy">
        {view !== "list" && (
          <button className="campaign-btn campaign-btn--secondary campaign-btn--sm" onClick={onBack} style={{ marginBottom: "8px" }}>
            <ArrowLeftIcon /> Back to campaigns
          </button>
        )}
        <h1>WhatsApp Campaigns</h1>
        <p>Create, send and track WhatsApp review campaigns.</p>
      </div>
      {view === "list" && (
        <button
          className="campaign-btn campaign-btn--primary"
          onClick={onNewCampaign}
          disabled={!canCreate}
        >
          <PlusIcon /> New Campaign
        </button>
      )}
    </header>
  );
}

function WhatsAppConnectionCard({
  status,
  checking,
  instancePhone,
}: {
  status: string;
  checking: boolean;
  instancePhone?: string;
}) {
  const connected = status === "open" || status === "connected";
  const connecting = checking || status === "connecting" || status === "qr_generated";
  const tone = connected ? "connected" : connecting ? "connecting" : "disconnected";
  const label = connected ? "Connected" : connecting ? "Connecting" : "Disconnected";
  const body = connected
    ? instancePhone
      ? `Connected number: +${instancePhone}`
      : "Your WhatsApp account is ready for campaign sending."
    : connecting
      ? "Checking current WhatsApp session..."
      : "Connect your account to create and send campaigns.";

  return (
    <section className={`campaign-connection campaign-connection--${tone}`} aria-label="WhatsApp connection status">
      <div className="campaign-connection__main">
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            background: connected ? "#25D366" : "#F3F2EE",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: connected ? "0 2px 8px rgba(37, 211, 102, 0.3)" : "none",
          }}
          aria-hidden="true"
        >
          <WhatsAppBrandIcon size={26} color={connected ? "#FFFFFF" : "#6B6B63"} />
        </div>
        <div>
          <div className="campaign-connection__eyebrow">
            <span className="campaign-status-dot" />
            WhatsApp Account
          </div>
          <h2>{label}</h2>
          <p>{body}</p>
        </div>
      </div>
      <Link to="/whatsapp" className="campaign-btn campaign-btn--dark">
        {connected ? "Manage connection" : "Connect WhatsApp"}
      </Link>
    </section>
  );
}

function CampaignStats({ stats }: { stats: { total: number; running: number; sent: number; failed: number } }) {
  return (
    <section className="campaign-stat-grid" aria-label="Campaign summary">
      <CampaignStatCard label="Total Campaigns" value={stats.total} hint="All time" icon={<InboxIcon />} />
      <CampaignStatCard label="Active / Running" value={stats.running} hint="Currently sending" icon={<ActivityIcon />} />
      <CampaignStatCard label="Messages Sent" value={stats.sent} hint="Delivered" icon={<SendIcon />} />
      <CampaignStatCard label="Failed Deliveries" value={stats.failed} hint="Errors" icon={<AlertIcon />} danger={stats.failed > 0} />
    </section>
  );
}

function CampaignStatCard({
  label,
  value,
  hint,
  icon,
  danger = false,
}: {
  label: string;
  value: number;
  hint: string;
  icon: ReactNode;
  danger?: boolean;
}) {
  return (
    <article className={`campaign-stat-card${danger ? " campaign-stat-card--danger" : ""}`}>
      <div className="campaign-stat-card__icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <p className="campaign-stat-card__label">{label}</p>
        <strong>{value.toLocaleString()}</strong>
        <span>{hint}</span>
      </div>
    </article>
  );
}

function CampaignToolbar({
  total,
  search,
  statusFilter,
  selectedCount,
  refreshing,
  onSearch,
  onStatusFilter,
  onRefresh,
  onBulkDelete,
  onClearSelection,
}: {
  total: number;
  search: string;
  statusFilter: string;
  selectedCount: number;
  refreshing: boolean;
  onSearch: (value: string) => void;
  onStatusFilter: (value: string) => void;
  onRefresh: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}) {
  return (
    <div className="campaign-panel__header">
      <div className="campaign-panel__title-row">
        <div>
          <h2 id="campaign-list-title">All Campaigns</h2>
          <p>{total.toLocaleString()} campaigns</p>
        </div>
      </div>

      {selectedCount > 0 ? (
        <div className="campaign-bulk-bar" role="region" aria-label="Bulk campaign actions">
          <span>{selectedCount} campaign{selectedCount === 1 ? "" : "s"} selected</span>
          <button className="campaign-btn campaign-btn--danger campaign-btn--sm" onClick={onBulkDelete}>
            Delete
          </button>
          <button className="campaign-btn campaign-btn--secondary campaign-btn--sm" onClick={onClearSelection}>
            Clear selection
          </button>
        </div>
      ) : (
        <div className="campaign-toolbar">
          <label className="campaign-search">
            <SearchIcon />
            <span className="sr-only">Search campaigns</span>
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search campaigns..."
            />
            {search && (
              <button type="button" aria-label="Clear search" onClick={() => onSearch("")}>
                <XIcon />
              </button>
            )}
          </label>
          <label className="campaign-select-wrap">
            <span className="sr-only">Filter by status</span>
            <select value={statusFilter} onChange={(event) => onStatusFilter(event.target.value)}>
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button className="campaign-btn campaign-btn--secondary campaign-btn--sm" onClick={onRefresh}>
            <RefreshIcon className={refreshing ? "is-spinning" : ""} /> Refresh
          </button>
        </div>
      )}
    </div>
  );
}

function CampaignTable({
  campaigns,
  selectedIds,
  allVisibleSelected,
  openMenuId,
  actionLoading,
  onToggleSelect,
  onToggleSelectAll,
  onOpenDetail,
  onToggleMenu,
  onDelete,
}: {
  campaigns: CampaignSummary[];
  selectedIds: string[];
  allVisibleSelected: boolean;
  openMenuId: string | null;
  actionLoading: string;
  onToggleSelect: (id: string, event: { stopPropagation: () => void }) => void;
  onToggleSelectAll: () => void;
  onOpenDetail: (id: string) => void;
  onToggleMenu: (id: string) => void;
  onDelete: (id: string, name: string, event?: MouseEvent) => void;
}) {
  return (
    <div className="campaign-table-wrap">
      <table className="campaign-table">
        <thead>
          <tr>
            <th className="campaign-table__check">
              <input
                className="campaign-checkbox"
                type="checkbox"
                aria-label="Select all visible campaigns"
                checked={allVisibleSelected}
                onChange={onToggleSelectAll}
              />
            </th>
            <th>Campaign</th>
            <th>Status</th>
            <th>Recipients</th>
            <th>Delivery Progress</th>
            <th>Created</th>
            <th className="campaign-table__actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => (
            <tr key={campaign._id} onClick={() => onOpenDetail(campaign._id)}>
              <td className="campaign-table__check" onClick={(event) => onToggleSelect(campaign._id, event)}>
                <input
                  className="campaign-checkbox"
                  type="checkbox"
                  aria-label={`Select campaign ${campaign.name}`}
                  checked={selectedIds.includes(campaign._id)}
                  onChange={() => undefined}
                />
              </td>
              <td>
                <span className="campaign-name">{campaign.name}</span>
                <span className="campaign-template">
                  {formatTemplate(campaign.templateKey)}
                </span>
              </td>
              <td>
                <CampaignStatusBadge status={campaign.status} />
              </td>
              <td className="campaign-number">{campaign.totalRecipients.toLocaleString()}</td>
              <td>
                <DeliverySummary campaign={campaign} />
              </td>
              <td className="campaign-date" title={formatDateTime(campaign.createdAt)}>
                {formatDate(campaign.createdAt)}
              </td>
              <td className="campaign-table__actions" onClick={(event) => event.stopPropagation()}>
                <div className="campaign-row-actions">
                  <button className="campaign-btn campaign-btn--secondary campaign-btn--sm" onClick={() => onOpenDetail(campaign._id)}>
                    View
                  </button>
                  <CampaignActionsMenu
                    campaign={campaign}
                    isOpen={openMenuId === campaign._id}
                    loading={actionLoading === `delete-${campaign._id}`}
                    onToggle={() => onToggleMenu(campaign._id)}
                    onOpenDetail={() => onOpenDetail(campaign._id)}
                    onDelete={(event) => onDelete(campaign._id, campaign.name, event)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CampaignMobileList({
  campaigns,
  selectedIds,
  openMenuId,
  actionLoading,
  onToggleSelect,
  onOpenDetail,
  onToggleMenu,
  onDelete,
}: {
  campaigns: CampaignSummary[];
  selectedIds: string[];
  openMenuId: string | null;
  actionLoading: string;
  onToggleSelect: (id: string, event: { stopPropagation: () => void }) => void;
  onOpenDetail: (id: string) => void;
  onToggleMenu: (id: string) => void;
  onDelete: (id: string, name: string, event?: MouseEvent) => void;
}) {
  return (
    <div className="campaign-mobile-list">
      {campaigns.map((campaign) => (
        <article className="campaign-mobile-card" key={campaign._id} onClick={() => onOpenDetail(campaign._id)}>
          <div className="campaign-mobile-card__top">
            <label onClick={(event) => event.stopPropagation()}>
              <input
                className="campaign-checkbox"
                type="checkbox"
                aria-label={`Select campaign ${campaign.name}`}
                checked={selectedIds.includes(campaign._id)}
                onChange={(event) => onToggleSelect(campaign._id, event)}
              />
            </label>
            <div>
              <h3>{campaign.name}</h3>
              <span>{formatDate(campaign.createdAt)}</span>
            </div>
            <CampaignStatusBadge status={campaign.status} />
          </div>
          <div className="campaign-mobile-card__metrics">
            <span>
              <strong>{campaign.totalRecipients}</strong> Recipients
            </span>
            <span>
              <strong>{campaign.successCount}</strong> Sent
            </span>
            <span>
              <strong>{campaign.failedCount}</strong> Failed
            </span>
          </div>
          <div className="campaign-mobile-card__footer" onClick={(event) => event.stopPropagation()}>
            <DeliverySummary campaign={campaign} />
            <CampaignActionsMenu
              campaign={campaign}
              isOpen={openMenuId === campaign._id}
              loading={actionLoading === `delete-${campaign._id}`}
              onToggle={() => onToggleMenu(campaign._id)}
              onOpenDetail={() => onOpenDetail(campaign._id)}
              onDelete={(event) => onDelete(campaign._id, campaign.name, event)}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

function CampaignActionsMenu({
  campaign,
  isOpen,
  loading,
  onToggle,
  onOpenDetail,
  onDelete,
}: {
  campaign: CampaignSummary;
  isOpen: boolean;
  loading: boolean;
  onToggle: () => void;
  onOpenDetail: () => void;
  onDelete: (event: MouseEvent) => void;
}) {
  return (
    <div className="campaign-actions-menu">
      <button
        className="campaign-icon-btn"
        type="button"
        aria-label={`Open actions for ${campaign.name}`}
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <MoreIcon />
      </button>
      {isOpen && (
        <div className="campaign-menu" role="menu">
          <button type="button" role="menuitem" onClick={onOpenDetail}>
            View details
          </button>
          <button
            type="button"
            role="menuitem"
            className="campaign-menu__danger"
            disabled={loading}
            onClick={onDelete}
          >
            {loading ? "Deleting..." : "Delete campaign"}
          </button>
        </div>
      )}
    </div>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  return (
    <span className={`campaign-status-badge campaign-status-badge--${status}`}>
      <span />
      {statusLabel(status)}
    </span>
  );
}

function DeliverySummary({ campaign }: { campaign: CampaignSummary }) {
  const total = Math.max(campaign.totalRecipients || 0, 0);
  const percent = total > 0 ? Math.round(((campaign.successCount || 0) / total) * 100) : 0;
  return (
    <div className="campaign-delivery">
      <div className="campaign-delivery__meta">
        <span>
          {campaign.successCount} / {total} sent
        </span>
        <span>{percent}%</span>
      </div>
      <div className="campaign-delivery__track" aria-hidden="true">
        <span className="campaign-delivery__success" style={{ width: `${percent}%` }} />
      </div>
      {campaign.failedCount > 0 && <span className="campaign-delivery__failed">{campaign.failedCount} failed</span>}
    </div>
  );
}

function CampaignPagination({
  page,
  totalPages,
  limit,
  total,
  shown,
  searchActive,
  onPageChange,
  onRowsPerPageChange,
}: {
  page: number;
  totalPages: number;
  limit: number;
  total: number;
  shown: number;
  searchActive: boolean;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (limit: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return (
    <footer className="campaign-pagination">
      <p>
        {searchActive
          ? `Showing ${shown} matching campaign${shown === 1 ? "" : "s"} on this page`
          : `Showing ${start}-${end} of ${total} campaigns`}
      </p>
      <div className="campaign-pagination__controls">
        <label>
          Rows per page
          <select value={limit} onChange={(event) => onRowsPerPageChange(Number(event.target.value))}>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </label>
        <button className="campaign-btn campaign-btn--secondary campaign-btn--sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </button>
        <span className="campaign-pagination__page">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <button className="campaign-btn campaign-btn--secondary campaign-btn--sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </button>
      </div>
    </footer>
  );
}

function CampaignDetail({
  detail,
  recipients,
  recipientPage,
  recipientTotal,
  actionLoading,
  canSend,
  onAction,
  onDelete,
  onRefresh,
  onRecipientPage,
  onConfirm,
}: {
  detail: CampaignSummary;
  recipients: any[];
  recipientPage: number;
  recipientTotal: number;
  actionLoading: string;
  canSend: boolean;
  onAction: (id: string, action: "start" | "pause" | "resume" | "cancel") => void;
  onDelete: (id: string, name: string, event?: MouseEvent) => void;
  onRefresh: () => void;
  onRecipientPage: (page: number) => void;
  onConfirm: (modal: ConfirmModal) => void;
}) {
  return (
    <>
      <section className="campaign-panel">
        <div className="campaign-detail-header">
          <div>
            <h2>{detail.name}</h2>
            <p>Template: {formatTemplate(detail.templateKey)}</p>
          </div>
          <CampaignStatusBadge status={detail.status} />
        </div>

        {detail.pauseReason && <CampaignPauseBanner reason={detail.pauseReason} />}

        <div className="campaign-preview-grid">
          <PreviewStat label="Total" value={detail.totalRecipients} />
          <PreviewStat label="Sent" value={detail.successCount} tone="success" />
          <PreviewStat label="Failed" value={detail.failedCount} tone="danger" />
          <PreviewStat label="Pending" value={detail.pendingCount} />
        </div>

        <DeliverySummary campaign={detail} />

        <div className="campaign-detail-actions">
          {["draft", "paused", "scheduled"].includes(detail.status) && (
            <button className="campaign-btn campaign-btn--primary" disabled={!!actionLoading || !canSend} onClick={() => onAction(detail._id, "start")}>
              {actionLoading === "start" ? "Starting..." : "Start Campaign"}
            </button>
          )}
          {detail.status === "running" && (
            <button className="campaign-btn campaign-btn--secondary" disabled={!!actionLoading} onClick={() => onAction(detail._id, "pause")}>
              {actionLoading === "pause" ? "Pausing..." : "Pause"}
            </button>
          )}
          {detail.status === "paused" && (
            <button className="campaign-btn campaign-btn--primary" disabled={!!actionLoading || !canSend} onClick={() => onAction(detail._id, "resume")}>
              {actionLoading === "resume" ? "Resuming..." : "Resume"}
            </button>
          )}
          {!["completed", "cancelled"].includes(detail.status) && (
            <button
              className="campaign-btn campaign-btn--danger"
              disabled={!!actionLoading}
              onClick={() =>
                onConfirm({
                  title: "Cancel campaign?",
                  message: "Any unsent messages will be stopped immediately.",
                  confirmText: "Cancel campaign",
                  onConfirm: () => onAction(detail._id, "cancel"),
                })
              }
            >
              {actionLoading === "cancel" ? "Cancelling..." : "Cancel"}
            </button>
          )}
          <button className="campaign-btn campaign-btn--danger" disabled={!!actionLoading} onClick={() => onDelete(detail._id, detail.name)}>
            {actionLoading === `delete-${detail._id}` ? "Deleting..." : "Delete campaign"}
          </button>
          <button className="campaign-btn campaign-btn--secondary campaign-btn--sm" onClick={onRefresh}>
            <RefreshIcon /> Refresh
          </button>
        </div>
      </section>

      <section className="campaign-panel">
        <div className="campaign-panel__header">
          <div>
            <h2>Recipients</h2>
            <p>{recipientTotal.toLocaleString()} total</p>
          </div>
        </div>
        {recipients.length === 0 ? (
          <p className="campaign-muted-empty" style={{ padding: "32px 24px", textAlign: "center", color: "#6B6B63", fontSize: "14px" }}>
            No recipients found.
          </p>
        ) : (
          <>
            <div className="campaign-table-wrap">
              <table className="campaign-table campaign-table--compact">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Sent</th>
                    <th>Delivered</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {recipients.map((recipient) => (
                    <tr key={recipient._id}>
                      <td>{recipient.customerId?.name || "-"}</td>
                      <td className="campaign-mono">{recipient.phoneNormalized}</td>
                      <td>
                        <CampaignStatusBadge status={recipient.status} />
                      </td>
                      <td className="campaign-date">{recipient.sentAt ? formatTime(recipient.sentAt) : "-"}</td>
                      <td className="campaign-date">
                        {recipient.readAt
                          ? `Read ${formatTime(recipient.readAt)}`
                          : recipient.deliveredAt
                          ? `Delivered ${formatTime(recipient.deliveredAt)}`
                          : "-"}
                      </td>
                      <td className="campaign-error-text" style={{ color: "#C0392B", fontSize: "12px" }}>
                        {formatRecipientError(recipient.lastError || recipient.skipReason || "")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {recipientTotal > 20 && (
              <div className="campaign-pagination">
                <button
                  className="campaign-btn campaign-btn--secondary campaign-btn--sm"
                  disabled={recipientPage <= 1}
                  onClick={() => onRecipientPage(recipientPage - 1)}
                >
                  Previous
                </button>
                <span className="campaign-pagination__page">
                  Page {recipientPage} of {Math.ceil(recipientTotal / 20)}
                </span>
                <button
                  className="campaign-btn campaign-btn--secondary campaign-btn--sm"
                  disabled={recipientPage >= Math.ceil(recipientTotal / 20)}
                  onClick={() => onRecipientPage(recipientPage + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

function PreviewStat({ label, value, tone }: { label: string; value: number; tone?: "success" | "warning" | "danger" }) {
  return (
    <div className={`campaign-preview-stat${tone ? ` campaign-preview-stat--${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DeleteCampaignDialog({ modal, onClose }: { modal: NonNullable<ConfirmModal>; onClose: () => void }) {
  return (
    <div className="campaign-dialog-overlay" onClick={onClose}>
      <div className="campaign-dialog" role="dialog" aria-modal="true" aria-labelledby="campaign-delete-title" onClick={(event) => event.stopPropagation()}>
        <div className="campaign-dialog__icon">
          <AlertIcon />
        </div>
        <h2 id="campaign-delete-title">{modal.title}</h2>
        <p>{modal.message}</p>
        <div className="campaign-dialog__actions">
          <button className="campaign-btn campaign-btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="campaign-btn campaign-btn--danger"
            onClick={() => {
              const onConfirm = modal.onConfirm;
              onClose();
              onConfirm();
            }}
          >
            {modal.confirmText || "Delete campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CampaignTableSkeleton() {
  return (
    <div className="campaign-skeleton" aria-label="Loading campaigns">
      <div className="campaign-skeleton__toolbar" />
      {Array.from({ length: 7 }).map((_, index) => (
        <div className="campaign-skeleton__row" key={index}>
          <span />
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function CampaignEmptyState({ onCreate, disabled }: { onCreate: () => void; disabled: boolean }) {
  return (
    <div className="campaign-empty">
      <div className="campaign-empty__icon">
        <InboxIcon />
      </div>
      <h2>No WhatsApp campaigns yet</h2>
      <p>Create your first campaign to start collecting customer reviews via WhatsApp.</p>
      <button className="campaign-btn campaign-btn--primary" disabled={disabled} onClick={onCreate}>
        <PlusIcon /> Create WhatsApp Campaign
      </button>
    </div>
  );
}

function CampaignSearchEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="campaign-empty">
      <div className="campaign-empty__icon">
        <SearchIcon />
      </div>
      <h2>No campaigns found</h2>
      <p>Try changing your search query or status filter.</p>
      <button className="campaign-btn campaign-btn--secondary" onClick={onClear}>
        Clear filters
      </button>
    </div>
  );
}

function CampaignErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="campaign-empty campaign-empty--error">
      <div className="campaign-empty__icon">
        <AlertIcon />
      </div>
      <h2>Unable to load campaigns</h2>
      <p>We could not retrieve your campaigns.</p>
      <button className="campaign-btn campaign-btn--primary" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

function PlanBlockedCard() {
  return (
    <div className="campaigns-page animate-fade-in">
      <header className="campaign-page-header">
        <div className="campaign-page-header__copy">
          <h1>WhatsApp Campaigns</h1>
          <p>Send bulk review requests to your customers.</p>
        </div>
      </header>
      <section className="campaign-panel campaign-plan-card">
        <div className="campaign-empty__icon">
          <LockIcon />
        </div>
        <h2>Campaigns require a paid plan</h2>
        <p>WhatsApp campaign management is available on the Starter plan and above.</p>
        <Link to="/billing" className="campaign-btn campaign-btn--primary">
          View Plans & Upgrade
        </Link>
      </section>
    </div>
  );
}

function formatTemplate(template: string) {
  const map: Record<string, string> = {
    warm: "Friendly & Warm",
    review_request: "Clean & Professional",
    direct: "Quick & Direct",
    thank_you: "Customer Appreciation",
  };
  return map[template] || template.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function CampaignPauseBanner({ reason }: { reason: string }) {
  const lower = reason.toLowerCase();
  const isConnection = lower.includes("connection") || lower.includes("disconnected") || lower.includes("offline");
  const isLimit = lower.includes("limit") || lower.includes("quota");

  let title = "Campaign Paused";
  let description = reason;
  let action: ReactNode = null;

  if (isConnection) {
    title = "Campaign Paused — WhatsApp Connection Lost";
    description = "The WhatsApp session was disconnected during sending. Please check your connection state and resume the campaign.";
    action = (
      <Link to="/whatsapp" className="campaign-btn campaign-btn--sm campaign-btn--secondary" style={{ marginTop: "8px", display: "inline-flex" }}>
        Check WhatsApp Connection →
      </Link>
    );
  } else if (isLimit) {
    title = "Campaign Paused — Daily Limit Reached";
    description = "You have reached your daily send limit. Paused messages will resume when your limit resets.";
    action = (
      <Link to="/billing" className="campaign-btn campaign-btn--sm campaign-btn--secondary" style={{ marginTop: "8px", display: "inline-flex" }}>
        View Plan & Limits →
      </Link>
    );
  }

  return (
    <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "10px", padding: "14px 16px", marginBottom: "16px", color: "#991B1B" }}>
      <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>⚠️ {title}</div>
      <div style={{ fontSize: "13px", opacity: 0.9 }}>{description}</div>
      {action}
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatRecipientError(raw: string) {
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (raw.includes("[object Object]")) return "Send failed - invalid phone format";
  if (raw.toLowerCase().includes("phone") && raw.includes("400")) return "Invalid phone number - include country code";
  return raw;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function WhatsAppBrandIcon({ size = 26, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        fill={color}
        d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.04 3.67C14.24 3.67 16.31 4.53 17.87 6.08C19.42 7.64 20.28 9.71 20.28 11.92C20.28 16.46 16.58 20.16 12.04 20.16C10.66 20.16 9.31 19.8 8.12 19.09L7.84 18.92L4.72 19.74L5.55 16.7L5.36 16.4C4.58 15.15 4.17 13.56 4.17 11.91C4.17 7.37 7.87 3.67 12.04 3.67ZM8.84 6.84C8.66 6.84 8.36 6.91 8.12 7.17C7.88 7.43 7.2 8.07 7.2 9.36C7.2 10.66 8.15 11.91 8.28 12.08C8.42 12.26 10.13 14.9 12.78 16.04C15.42 17.17 15.42 16.79 15.89 16.75C16.36 16.71 17.41 16.13 17.63 15.51C17.85 14.89 17.85 14.36 17.78 14.25C17.72 14.14 17.54 14.07 17.27 13.94C17 13.81 15.69 13.16 15.45 13.07C15.21 12.98 15.03 12.94 14.86 13.2C14.68 13.46 14.18 14.07 14.03 14.25C13.88 14.43 13.73 14.45 13.47 14.32C13.2 14.19 12.35 13.91 11.34 13.01C10.55 12.31 10.02 11.44 9.87 11.18C9.72 10.92 9.85 10.78 9.99 10.65C10.11 10.53 10.26 10.33 10.39 10.18C10.52 10.03 10.57 9.92 10.65 9.75C10.74 9.57 10.69 9.42 10.63 9.29C10.57 9.16 10.04 7.86 9.82 7.33C9.61 6.82 9.39 6.89 9.23 6.88C9.07 6.87 8.9 6.84 8.84 6.84Z"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function RefreshIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 12a9 9 0 0 1-15.4 6.4L3 16M3 12A9 9 0 0 1 18.4 5.6L21 8M3 21v-5h5M21 3v5h-5" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h16v16H4z" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12h4l3-7 4 14 3-7h2" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 4.3 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
