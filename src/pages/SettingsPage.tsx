import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCurrentBusiness,
  useUpdateMenuItems,
  useUpdateBusinessProfile,
} from "../hooks/queries/useBusiness";
import { GmailConnectCard } from "../components/GmailConnectCard";
import { queryKeys } from "../lib/queryKeys";
import api from "../lib/api";
import {
  getCategoryConfig,
  ALL_CATEGORY_LIST,
} from "../config/businessCategoryConfig";

const MAX_ITEMS = 20;
const MAX_LENGTH = 50;

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: businessData, isLoading: loading, error: queryError } = useCurrentBusiness();
  const business = businessData || null;
  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Could not connect to server. Please try again."
    : null;

  const [menuItems, setMenuItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactEmailSaving, setContactEmailSaving] = useState(false);

  // Category change modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const updateProfileMut = useUpdateBusinessProfile();
  const updateMenuItemsMut = useUpdateMenuItems();

  useEffect(() => {
    if (business) {
      setMenuItems(business.menuItems || []);
      setContactEmail(business.contactEmail || "");
    }
  }, [business]);

  // Check URL params for gmail callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailStatus = params.get("gmail");
    if (gmailStatus === "connected") {
      setSuccessMsg("Gmail account connected successfully!");
      setTimeout(() => setSuccessMsg(""), 5000);
      queryClient.invalidateQueries({ queryKey: queryKeys.business.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.googleAuth.all });
      window.history.replaceState({}, "", "/settings");
    } else if (gmailStatus === "error") {
      setSubmitError(
        `Gmail connection failed: ${params.get("reason") || "unknown error"}`
      );
      window.history.replaceState({}, "", "/settings");
    }
  }, [queryClient]);

  // Dynamic category config auto-detected from onboarding
  const categoryConfig = useMemo(
    () => getCategoryConfig(business?.businessType),
    [business?.businessType]
  );

  const saveMenuItems = async (
    updated: string[],
    successMessage = "Items updated"
  ) => {
    setSaving(true);
    setSubmitError(null);
    setSuccessMsg("");
    try {
      await updateMenuItemsMut.mutateAsync(updated);
      setMenuItems(updated);
      setSuccessMsg(successMessage);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setSubmitError(err.message || "Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const isDuplicate = (item: string, against: string[]) =>
    against.some((i) => i.toLowerCase() === item.toLowerCase());

  const handleAdd = (itemToAdd?: string) => {
    const target = itemToAdd || newItem;
    const trimmed = target.trim();
    if (!trimmed) return;

    if (trimmed.length > MAX_LENGTH) {
      setSubmitError(`Item must be ${MAX_LENGTH} characters or fewer`);
      return;
    }
    if (menuItems.length >= MAX_ITEMS) {
      setSubmitError(`You can add up to ${MAX_ITEMS} items`);
      return;
    }
    if (isDuplicate(trimmed, menuItems)) {
      if (!itemToAdd) setNewItem("");
      return;
    }

    const updated = [...menuItems, trimmed];
    setMenuItems(updated);
    if (!itemToAdd) setNewItem("");
    saveMenuItems(updated, `Added "${trimmed}"`);
  };

  const handleBulkAdd = () => {
    setSubmitError(null);
    const rawItems = bulkText
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (rawItems.length === 0) return;

    const accepted: string[] = [];
    let skippedTooLong = 0;
    let skippedDuplicate = 0;

    for (const item of rawItems) {
      if (item.length > MAX_LENGTH) {
        skippedTooLong += 1;
        continue;
      }
      if (isDuplicate(item, menuItems) || isDuplicate(item, accepted)) {
        skippedDuplicate += 1;
        continue;
      }
      accepted.push(item);
    }

    const availableSlots = Math.max(0, MAX_ITEMS - menuItems.length);
    const skippedOverLimit = Math.max(0, accepted.length - availableSlots);
    const toAdd = accepted.slice(0, availableSlots);

    if (toAdd.length === 0) {
      setSubmitError(
        availableSlots === 0
          ? `You've reached the ${MAX_ITEMS} item limit — remove some items first.`
          : "No new items to add — they may already be on your list or too long (max 50 characters each)."
      );
      return;
    }

    const skippedTotal = skippedTooLong + skippedDuplicate + skippedOverLimit;
    const message =
      skippedTotal > 0
        ? `${toAdd.length} item${toAdd.length !== 1 ? "s" : ""} added, ${skippedTotal} skipped`
        : `${toAdd.length} item${toAdd.length !== 1 ? "s" : ""} added`;

    const updated = [...menuItems, ...toAdd];
    setMenuItems(updated);
    setBulkText("");
    setBulkMode(false);
    saveMenuItems(updated, message);
  };

  const handleRemove = (item: string) => {
    const updated = menuItems.filter((i) => i !== item);
    setMenuItems(updated);
    saveMenuItems(updated, `Removed "${item}"`);
  };

  const handleSaveContactEmail = async () => {
    const val = contactEmail.trim();
    setContactEmailSaving(true);
    try {
      await api.patch("/business/profile", { contactEmail: val });
      queryClient.invalidateQueries({ queryKey: queryKeys.business.all });
      setSuccessMsg("Reply-To email saved");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Failed to save contactEmail", err);
      setSubmitError("Failed to save reply-to email");
    } finally {
      setContactEmailSaving(false);
    }
  };

  const handleChangeBusinessType = async (newType: string) => {
    try {
      await updateProfileMut.mutateAsync({ businessType: newType });
      setShowCategoryModal(false);
      setSuccessMsg(`Business category updated to ${getCategoryConfig(newType).displayName}`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to update business type");
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchFilter.trim()) return menuItems;
    return menuItems.filter((item) =>
      item.toLowerCase().includes(searchFilter.toLowerCase().trim())
    );
  }, [menuItems, searchFilter]);

  const capacityPercent = (menuItems.length / MAX_ITEMS) * 100;
  const capacityColor =
    capacityPercent >= 90
      ? "#dc2626"
      : capacityPercent >= 70
      ? "#d97706"
      : "#3f7d45";

  return (
    <div className="db-page animate-fade-in">
      {/* ---- Top bar ---- */}
      <div className="db-topbar">
        <div>
          <h1 className="db-title">Settings</h1>
          <p className="db-subtitle">
            Manage your business profile, services, and integrations
          </p>
        </div>
      </div>

      {/* ---- Error state ---- */}
      {(error || submitError) && (
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
          {error || submitError}
        </div>
      )}

      {/* ---- Success message ---- */}
      {successMsg && (
        <div
          style={{
            padding: "12px 16px",
            background: "#E9F2E7",
            border: "1px solid #C6E6C0",
            borderRadius: "10px",
            color: "#2D6030",
            fontSize: "13px",
            fontWeight: 600,
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>✓</span> {successMsg}
        </div>
      )}

      {/* ---- Loading state ---- */}
      {loading && (
        <div className="db-loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}

      {/* ---- Content ---- */}
      {!loading && business && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* ══════════════════════════════════════════════════════════════
              SECTION 1: Email Sending Configuration (Gmail Connect at top)
              ══════════════════════════════════════════════════════════════ */}
          <div className="db-card" style={{ padding: 0, overflow: "hidden" }}>
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #E3E1D9",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "#F3F2EE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6B6B63"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <div>
                <h2
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#1A1A1A",
                    margin: 0,
                  }}
                >
                  Email Sending
                </h2>
                <p style={{ fontSize: "12px", color: "#6B6B63", margin: "2px 0 0" }}>
                  Configure how review request emails are sent to your customers
                </p>
              </div>
            </div>

            <div style={{ padding: "24px" }}>
              <GmailConnectCard />
            </div>

            {/* Reply-To Email Address section (always visible) */}
            <div
              style={{
                padding: "20px 24px",
                borderTop: "1px solid #E3E1D9",
                background: "#FAFAF7",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: "280px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#1A1A1A",
                      marginBottom: "4px",
                    }}
                  >
                    Reply-To Email Address
                  </label>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#6B6B63",
                      margin: "0 0 10px",
                      lineHeight: 1.5,
                    }}
                  >
                    Customer replies to review request emails will land in this inbox. Applies to ReviewBooster Mail and custom Gmail campaigns.
                  </p>
                  <div style={{ display: "flex", gap: "8px", maxWidth: "480px" }}>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      style={{
                        flex: 1,
                        padding: "9px 14px",
                        border: "1px solid #E3E1D9",
                        borderRadius: "8px",
                        fontSize: "14px",
                        color: "#1A1A1A",
                        background: "#fff",
                        boxSizing: "border-box" as const,
                        fontFamily: "inherit",
                      }}
                      placeholder="e.g. contact@yourbusiness.com"
                    />
                    <button
                      type="button"
                      onClick={handleSaveContactEmail}
                      disabled={
                        contactEmailSaving ||
                        contactEmail.trim() === (business.contactEmail || "")
                      }
                      style={{
                        padding: "9px 16px",
                        background: "#1A1A1A",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        opacity:
                          contactEmailSaving ||
                          contactEmail.trim() === (business.contactEmail || "")
                            ? 0.4
                            : 1,
                      }}
                    >
                      {contactEmailSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 2: Dynamic Services & Offerings (Auto-adapts to Business Nature)
              ══════════════════════════════════════════════════════════════ */}
          <div className="db-card" style={{ padding: 0, overflow: "hidden" }}>
            {/* Section Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #E3E1D9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "#F3F2EE",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: "16px",
                  }}
                >
                  {categoryConfig.icon}
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      color: "#1A1A1A",
                      margin: 0,
                    }}
                  >
                    {categoryConfig.settings.sectionTitle}
                  </h2>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#6B6B63",
                      margin: "2px 0 0",
                    }}
                  >
                    {categoryConfig.settings.hint}
                  </p>
                </div>
              </div>

              {/* Onboarding Business Category Badge */}
              <div className="settings-category-badge">
                <span>{categoryConfig.icon} {categoryConfig.displayName}</span>
                <button
                  type="button"
                  className="settings-category-change-btn"
                  onClick={() => setShowCategoryModal(true)}
                >
                  Change
                </button>
              </div>
            </div>

            {/* Section Body */}
            <div style={{ padding: "24px" }}>
              {/* 1. Industry Quick-Add Presets Bar */}
              <div className="settings-preset-section">
                <p className="settings-preset-title">
                  Popular for {categoryConfig.displayName} (1-Tap Quick Add)
                </p>
                <div className="settings-preset-list">
                  {categoryConfig.presets.map((preset) => {
                    const added = isDuplicate(preset, menuItems);
                    return (
                      <button
                        key={preset}
                        type="button"
                        disabled={added || saving || menuItems.length >= MAX_ITEMS}
                        onClick={() => handleAdd(preset)}
                        className={`settings-preset-chip ${
                          added ? "settings-preset-chip--added" : ""
                        }`}
                      >
                        {added ? "✓" : "+"} {preset}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Custom Item Add / Bulk Paste */}
              {!bulkMode ? (
                <>
                  <div className="settings-menu-input-row">
                    <input
                      type="text"
                      className="settings-menu-input"
                      placeholder={categoryConfig.settings.inputPlaceholder}
                      value={newItem}
                      maxLength={MAX_LENGTH}
                      onChange={(e) => setNewItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAdd();
                        }
                      }}
                      disabled={saving || menuItems.length >= MAX_ITEMS}
                    />
                    <button
                      className="settings-menu-add-btn"
                      onClick={() => handleAdd()}
                      disabled={
                        saving || !newItem.trim() || menuItems.length >= MAX_ITEMS
                      }
                    >
                      + Add
                    </button>
                  </div>

                  <button
                    type="button"
                    className="settings-menu-bulk-toggle"
                    onClick={() => setBulkMode(true)}
                    disabled={menuItems.length >= MAX_ITEMS}
                  >
                    Paste whole list at once →
                  </button>
                </>
              ) : (
                <div className="settings-menu-bulk-box">
                  <p className="settings-menu-bulk-label">
                    Paste your list — one per line, or separated by commas
                  </p>
                  <textarea
                    className="settings-menu-bulk-textarea"
                    placeholder={categoryConfig.settings.bulkPlaceholder}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    rows={5}
                    autoFocus
                  />
                  <div className="settings-menu-bulk-actions">
                    <button
                      className="settings-menu-add-btn"
                      onClick={handleBulkAdd}
                      disabled={saving || !bulkText.trim()}
                    >
                      Add all
                    </button>
                    <button
                      type="button"
                      className="settings-menu-bulk-cancel"
                      onClick={() => {
                        setBulkMode(false);
                        setBulkText("");
                        setSubmitError(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Visual Capacity Progress Bar */}
              <div className="settings-capacity-container">
                <div className="settings-capacity-header">
                  <span>
                    Capacity: {menuItems.length} / {MAX_ITEMS} items added
                  </span>
                  <span>{MAX_ITEMS - menuItems.length} slots left</span>
                </div>
                <div className="settings-capacity-bar-bg">
                  <div
                    className="settings-capacity-bar-fill"
                    style={{
                      width: `${capacityPercent}%`,
                      backgroundColor: capacityColor,
                    }}
                  />
                </div>
              </div>

              {/* 4. Filter / Search Bar if items > 5 */}
              {menuItems.length > 5 && (
                <div style={{ marginTop: "16px", maxWidth: "480px" }}>
                  <input
                    type="text"
                    className="settings-menu-input"
                    style={{ padding: "6px 12px", fontSize: "13px" }}
                    placeholder="🔍 Filter added items..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                  />
                </div>
              )}

              {/* 5. Active Items Chip List */}
              <div className="settings-menu-chip-list">
                {menuItems.length === 0 && (
                  <p className="db-empty" style={{ padding: "1.5rem 0" }}>
                    No items added yet. Click any quick-add preset above or add a custom item.
                  </p>
                )}
                {filteredItems.map((item) => (
                  <span key={item} className="settings-menu-chip">
                    {item}
                    <button
                      className="settings-menu-chip-remove"
                      onClick={() => handleRemove(item)}
                      disabled={saving}
                      aria-label={`Remove ${item}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <p className="settings-menu-footnote">
                {categoryConfig.settings.footnote}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          Category Change Modal
          ══════════════════════════════════════════════════════════════ */}
      {showCategoryModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setShowCategoryModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              maxWidth: "500px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#1A1A1A",
                margin: "0 0 8px",
              }}
            >
              Change Business Category
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "#6B6B63",
                margin: "0 0 20px",
                lineHeight: 1.5,
              }}
            >
              Select your business nature to update review questions and service recommendations. Your current items will be kept.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                gap: "10px",
                maxHeight: "300px",
                overflowY: "auto",
                marginBottom: "20px",
              }}
            >
              {ALL_CATEGORY_LIST.map((cat) => {
                const selected = categoryConfig.key === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => handleChangeBusinessType(cat.key)}
                    style={{
                      border: `1.5px solid ${selected ? "#1A1A1A" : "#E3E1D9"}`,
                      borderRadius: "10px",
                      padding: "12px 8px",
                      textAlign: "center",
                      background: selected ? "#F3F2EE" : "#fff",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ fontSize: "20px", display: "block", marginBottom: "4px" }}>
                      {cat.icon}
                    </span>
                    {cat.displayName}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="settings-menu-bulk-cancel"
                onClick={() => setShowCategoryModal(false)}
                style={{ padding: "8px 16px", cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
