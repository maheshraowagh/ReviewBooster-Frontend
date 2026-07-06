import { useState, useEffect } from "react";
import api, { type ApiResponse } from "../lib/api";
import type { Business } from "../types";

const MAX_ITEMS = 20;
const MAX_LENGTH = 50;

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [menuItems, setMenuItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<ApiResponse<Business>>("/business/me");
        if (res.data.success && res.data.data) {
          setBusiness(res.data.data);
          setMenuItems(res.data.data.menuItems || []);
        } else {
          setError(res.data.error?.message || "Failed to load business data");
        }
      } catch {
        setError("Could not connect to server. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, []);

  const saveMenuItems = async (
    updated: string[],
    successMessage = "Menu items updated",
  ) => {
    setSaving(true);
    setError(null);
    setSuccessMsg("");
    try {
      const res = await api.patch<ApiResponse<Business>>(
        "/business/menu-items",
        { menuItems: updated },
      );
      if (res.data.success && res.data.data) {
        setMenuItems(res.data.data.menuItems || []);
        setSuccessMsg(successMessage);
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setError(res.data.error?.message || "Failed to save menu items");
      }
    } catch {
      setError("Could not save changes. Please try again.");
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
      setError(`Menu item must be ${MAX_LENGTH} characters or fewer`);
      return;
    }
    if (menuItems.length >= MAX_ITEMS) {
      setError(`You can add up to ${MAX_ITEMS} menu items`);
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
    setError(null);
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
      setError(
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

  return (
    <div className="db-page animate-fade-in">
      {/* ---- Top bar ---- */}
      <div className="db-topbar">
        <div>
          <h1 className="db-title">Settings</h1>
          <p className="db-subtitle">Manage your business profile</p>
        </div>
      </div>

      {/* ---- Error state ---- */}
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

      {/* ---- Loading state ---- */}
      {loading && (
        <div className="db-loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}

      {/* ---- Content ---- */}
      {!loading && business && (
        <div className="db-card">
          <h2 className="db-card-title">Menu items</h2>
          <p className="settings-menu-hint">
            Add your dishes so customers can tap to recommend them when leaving
            a review.
          </p>

          {!bulkMode ? (
            <>
              <div className="settings-menu-input-row">
                <input
                  type="text"
                  className="settings-menu-input"
                  placeholder="e.g. KitKat Shake"
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
                  + Add dish
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
                    setError(null);
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

          {successMsg && <p className="settings-menu-success">{successMsg}</p>}

          <div className="settings-menu-chip-list">
            {menuItems.length === 0 && (
              <p className="db-empty" style={{ padding: "1.5rem 0" }}>
                No menu items added yet.
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
            These appear as tap-to-select chips in your customer review flow.
          </p>
        </div>
      )}
    </div>
  );
}
