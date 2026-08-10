import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentBusiness, useUpdateMenuItems } from "../hooks/queries/useBusiness";
import { GmailConnectCard } from "../components/GmailConnectCard";
import { queryKeys } from "../lib/queryKeys";
import api from "../lib/api";

const MAX_ITEMS = 20;
const MAX_LENGTH = 50;

// Dynamic labels for the items section based on business type
const ITEMS_LABELS: Record<string, { heading: string; hint: string; placeholder: string; footnote: string }> = {
  salon:      { heading: 'Services offered', hint: 'Add your services so customers can mention them in reviews.', placeholder: 'e.g. Haircut, Hair Colour', footnote: 'These appear as tap-to-select chips in your customer review flow.' },
  spa:        { heading: 'Treatments offered', hint: 'Add your treatments so customers can mention them in reviews.', placeholder: 'e.g. Deep Tissue Massage', footnote: 'These appear as tap-to-select chips in your customer review flow.' },
  gym:        { heading: 'Facilities / Classes', hint: 'Add your facilities or classes so customers can mention them.', placeholder: 'e.g. Yoga Class, Swimming Pool', footnote: 'These appear as tap-to-select chips in your customer review flow.' },
  clinic:     { heading: 'Services offered', hint: 'Add your services so patients can mention them in reviews.', placeholder: 'e.g. Dental Cleaning, Eye Checkup', footnote: 'These appear as tap-to-select chips in your customer review flow.' },
  hotel:      { heading: 'Room types / Amenities', hint: 'Add room types or amenities so guests can mention them.', placeholder: 'e.g. Deluxe Room, Rooftop Pool', footnote: 'These appear as tap-to-select chips in your customer review flow.' },
  retail:     { heading: 'Product categories', hint: 'Add your product categories so customers can mention them.', placeholder: 'e.g. Electronics, Clothing', footnote: 'These appear as tap-to-select chips in your customer review flow.' },
};

const DEFAULT_LABELS = {
  heading: 'Menu items',
  hint: 'Add your dishes so customers can tap to recommend them when leaving a review.',
  placeholder: 'e.g. KitKat Shake',
  footnote: 'These appear as tap-to-select chips in your customer review flow.',
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: businessData, isLoading: loading, error: queryError } = useCurrentBusiness();
  const business = businessData || null;
  const error = queryError ? (queryError instanceof Error ? queryError.message : "Could not connect to server. Please try again.") : null;

  const [menuItems, setMenuItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [gmailConnected, setGmailConnected] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [contactEmailSaving, setContactEmailSaving] = useState(false);

  useEffect(() => {
    if (business) {
      setMenuItems(business.menuItems || []);
      setGmailConnected(!!business.gmailConnected);
      setContactEmail(business.contactEmail || '');
    }
  }, [business]);

  // Check URL params for gmail callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailStatus = params.get('gmail');
    if (gmailStatus === 'connected') {
      setSuccessMsg('Gmail account connected successfully!');
      setTimeout(() => setSuccessMsg(''), 5000);
      // Refetch business data to reflect new gmail status
      queryClient.invalidateQueries({ queryKey: queryKeys.business.all });
      // Clean URL
      window.history.replaceState({}, '', '/settings');
    } else if (gmailStatus === 'error') {
      setSubmitError(`Gmail connection failed: ${params.get('reason') || 'unknown error'}`);
      window.history.replaceState({}, '', '/settings');
    }
  }, [queryClient]);

  const updateMenuItemsMut = useUpdateMenuItems();

  const saveMenuItems = async (
    updated: string[],
    successMessage = "Menu items updated",
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

  const handleAdd = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_LENGTH) {
      setSubmitError(`Menu item must be ${MAX_LENGTH} characters or fewer`);
      return;
    }
    if (menuItems.length >= MAX_ITEMS) {
      setSubmitError(`You can add up to ${MAX_ITEMS} menu items`);
      return;
    }
    if (isDuplicate(trimmed, menuItems)) {
      setNewItem("");
      return;
    }

    const updated = [...menuItems, trimmed];
    setMenuItems(updated);
    setNewItem("");
    saveMenuItems(updated);
  };

  // ---- Bulk add: paste a whole menu at once (comma or newline separated) ----
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
          : "No new items to add — they may already be on your list or too long (max 50 characters each).",
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
    saveMenuItems(updated);
  };

  const handleSaveContactEmail = async () => {
    const val = contactEmail.trim();
    setContactEmailSaving(true);
    try {
      await api.patch('/business/profile', { contactEmail: val });
      queryClient.invalidateQueries({ queryKey: queryKeys.business.all });
      setSuccessMsg('Reply-To email saved');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to save contactEmail', err);
      setSubmitError('Failed to save reply-to email');
    } finally {
      setContactEmailSaving(false);
    }
  };

  const labels = business
    ? (ITEMS_LABELS[business.businessType?.toLowerCase() || ''] || DEFAULT_LABELS)
    : DEFAULT_LABELS;

  return (
    <div className="db-page animate-fade-in">
      {/* ---- Top bar ---- */}
      <div className="db-topbar">
        <div>
          <h1 className="db-title">Settings</h1>
          <p className="db-subtitle">Manage your business profile and integrations</p>
        </div>
      </div>

      {/* ---- Error state ---- */}
      {(error || submitError) && (
        <div className="db-error" role="alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error || submitError}
        </div>
      )}

      {/* ---- Success message ---- */}
      {successMsg && (
        <div style={{
          padding: '12px 16px',
          background: '#E9F2E7',
          border: '1px solid #C6E6C0',
          borderRadius: '10px',
          color: '#2D6030',
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 1: Email Sending Configuration (Gmail Connect at top)
              ══════════════════════════════════════════════════════════════ */}
          <div className="db-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Section Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #E3E1D9',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: '#F3F2EE', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B63" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
              </div>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Email Sending</h2>
                <p style={{ fontSize: '12px', color: '#6B6B63', margin: '2px 0 0' }}>Configure how review request emails are sent to your customers</p>
              </div>
            </div>

            {/* Gmail Connect Card — embedded inside section */}
            <div style={{ padding: '24px' }}>
              <GmailConnectCard onStatusChange={(s) => {
                setGmailConnected(s.connected);
                // Refetch business data when gmail status changes
                queryClient.invalidateQueries({ queryKey: queryKeys.business.all });
              }} />
            </div>

            {/* Reply-To Address — ONLY shown when Gmail is NOT connected */}
            {!gmailConnected && (
              <div style={{
                padding: '20px 24px',
                borderTop: '1px solid #E3E1D9',
                background: '#FAFAF7',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1A1A1A', marginBottom: '4px' }}>
                      Reply-To Email Address
                    </label>
                    <p style={{ fontSize: '12px', color: '#6B6B63', margin: '0 0 10px', lineHeight: 1.5 }}>
                      When using the Default Server, customer replies will go to this email address instead of noreply.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', maxWidth: '480px' }}>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '9px 14px',
                          border: '1px solid #E3E1D9',
                          borderRadius: '8px',
                          fontSize: '14px',
                          color: '#1A1A1A',
                          background: '#fff',
                          boxSizing: 'border-box' as const,
                          fontFamily: 'inherit',
                        }}
                        placeholder="e.g. contact@yourbusiness.com"
                      />
                      <button
                        type="button"
                        onClick={handleSaveContactEmail}
                        disabled={contactEmailSaving || contactEmail.trim() === (business.contactEmail || '')}
                        style={{
                          padding: '9px 16px',
                          background: '#1A1A1A',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          opacity: contactEmailSaving || contactEmail.trim() === (business.contactEmail || '') ? 0.4 : 1,
                        }}
                      >
                        {contactEmailSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}


          </div>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 2: Menu Items / Services
              ══════════════════════════════════════════════════════════════ */}
          <div className="db-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Section Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #E3E1D9',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: '#F3F2EE', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B63" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              </div>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A1A', margin: 0 }}>{labels.heading}</h2>
                <p style={{ fontSize: '12px', color: '#6B6B63', margin: '2px 0 0' }}>{labels.hint}</p>
              </div>
            </div>

            {/* Menu Items Body */}
            <div style={{ padding: '24px' }}>
              {!bulkMode ? (
                <>
                  <div className="settings-menu-input-row">
                    <input
                      type="text"
                      className="settings-menu-input"
                      placeholder={labels.placeholder}
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
                      onClick={handleAdd}
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
                    Paste your whole menu at once →
                  </button>
                </>
              ) : (
                <div className="settings-menu-bulk-box">
                  <p className="settings-menu-bulk-label">
                    Paste your menu — one item per line, or separated by commas
                  </p>
                  <textarea
                    className="settings-menu-bulk-textarea"
                    placeholder={
                      "KitKat Shake\nCheesy Crunch Fries\nMasala Maggi\n\n...or: KitKat Shake, Cheesy Crunch Fries, Masala Maggi"
                    }
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    rows={6}
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

              <p className="settings-menu-count">
                {menuItems.length}/{MAX_ITEMS} items
              </p>

              <div className="settings-menu-chip-list">
                {menuItems.length === 0 && (
                  <p className="db-empty" style={{ padding: "1.5rem 0" }}>
                    No items added yet.
                  </p>
                )}
                {menuItems.map((item) => (
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
                {labels.footnote}
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
