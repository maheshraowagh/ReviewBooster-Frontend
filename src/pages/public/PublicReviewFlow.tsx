import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import NetworkError from "../../components/NetworkError";
import "./public.css";

import { getCategoryConfig } from "../../config/businessCategoryConfig";

const API_URL = import.meta.env.VITE_API_URL || "/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface BusinessData {
  businessId: string;
  name: string;
  logoUrl: string;
  businessType: string;
  googleReviewUrl: string;
  menuItems: string[];
  reviewToken: string;
  reviewSessionExpiresAt: string;
  aiGenerationsRemaining: number;
  existingFeedback: {
    _id: string;
    rating: number;
    reviewText: string;
  } | null;
  positiveTags: string[];
  negativeTags: string[];
}

type Step = "landing" | "details" | "review" | "redirect";

// Must match MAX_TAGS in backend/src/services/aiReviewService.js
const MAX_TAGS = 4;

// Above this many menu items, switch from inline chips to a searchable
// modal so the list doesn't overwhelm the screen.
const MENU_MODAL_THRESHOLD = 6;

const GROUP_OPTIONS = [
  { key: "Solo", label: "Solo", icon: "👤" },
  { key: "Couple", label: "Couple", icon: "❤️" },
  { key: "Family", label: "Family", icon: "👨‍👩‍👧" },
  { key: "Friends", label: "Friends", icon: "👥" },
  { key: "Work", label: "Work", icon: "💼" },
] as const;

const RATING_REACTIONS: Record<number, { emoji: string; text: string }> = {
  1: { emoji: "😞", text: "We'll do better" },
  2: { emoji: "😐", text: "We hear you" },
  3: { emoji: "🙂", text: "Thanks for sharing" },
  4: { emoji: "😊", text: "Glad you enjoyed it!" },
  5: { emoji: "🤩", text: "Fantastic!" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getClientId(): string {
  let id = localStorage.getItem("rb_client_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("rb_client_id", id);
  }
  return id;
}

function reviewTokenStorageKey(businessCode: string): string {
  return `rb_review_session_${businessCode.toLowerCase()}`;
}

function getStoredReviewToken(businessCode: string): string {
  try {
    return sessionStorage.getItem(reviewTokenStorageKey(businessCode)) || "";
  } catch {
    return "";
  }
}

function storeReviewToken(businessCode: string, token: string): void {
  try {
    sessionStorage.setItem(reviewTokenStorageKey(businessCode), token);
  } catch {
    // Private browsing/storage restrictions should not break the flow.
  }
}

function clearStoredReviewToken(businessCode: string): void {
  try {
    sessionStorage.removeItem(reviewTokenStorageKey(businessCode));
  } catch {
    // Best-effort cleanup.
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function ensureProtocol(url: string): string {
  if (!/^https?:\/\//i.test(url)) return "https://" + url;
  return url;
}

async function apiGet<T>(
  path: string,
  headers?: Record<string, string>,
): Promise<T> {
  const res = await axios.get(`${API_URL}${path}`, { headers });
  if (!res.data.success)
    throw new Error(res.data.error?.message || "Request failed");
  return res.data.data;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await axios.post(`${API_URL}${path}`, body);
  if (!res.data.success)
    throw new Error(res.data.error?.message || "Request failed");
  return res.data.data;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PublicReviewFlow() {
  const { businessCode } = useParams<{ businessCode: string }>();
  const clientId = useRef(getClientId());

  // Step 1 state
  const [step, setStep] = useState<Step>("landing");
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  // Step 2 state — dishes ordered, what stood out, note
  const [selectedDishes, setSelectedDishes] = useState<string[]>([]);
  const [dishFreeText, setDishFreeText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagSeverities, setTagSeverities] = useState<Record<string, "a_bit" | "moderate" | "extremely">>({});
  const [note, setNote] = useState("");
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [groupSize, setGroupSize] = useState<string | null>(null);

  // Step 3 state
  const [feedbackId, setFeedbackId] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [aiGenerationsRemaining, setAiGenerationsRemaining] = useState(3);
  const [clipboardFailed, setClipboardFailed] = useState(false);

  // Loading / error
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [error, setError] = useState("");
  const [networkError, setNetworkError] = useState(false);
  const [pageError, setPageError] = useState<"not_found" | "inactive" | null>(
    null,
  );

  // Redirect countdown
  const [countdown, setCountdown] = useState(3);

  // ---- Fetch business on mount ----
  const fetchBusiness = useCallback(async () => {
    if (!businessCode) return;
    setIsLoading(true);
    setNetworkError(false);
    setPageError(null);

    try {
      const storedReviewToken = getStoredReviewToken(businessCode);
      const data = await apiGet<BusinessData>(
        `/public/business/${businessCode}`,
        {
          "x-client-id": clientId.current,
          ...(storedReviewToken
            ? { "x-review-session-token": storedReviewToken }
            : {}),
        },
      );
      storeReviewToken(businessCode, data.reviewToken);
      setBusiness(data);
      setAiGenerationsRemaining(data.aiGenerationsRemaining);
      if (data.existingFeedback) {
        setFeedbackId(data.existingFeedback._id);
        setRating(data.existingFeedback.rating);
        setReviewText(data.existingFeedback.reviewText);
        setStep("review");
      }
    } catch (err) {
      if (axios.isAxiosError(err) && !err.response) {
        setNetworkError(true);
      } else {
        const status = axios.isAxiosError(err) ? err.response?.status : null;
        if (status === 404) setPageError("not_found");
        else if (status === 403) setPageError("inactive");
        else setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [businessCode]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  // ---- Toggle helpers ----
  const toggleDish = (dish: string) => {
    setSelectedDishes((prev) =>
      prev.includes(dish) ? prev.filter((d) => d !== dish) : [...prev, dish],
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        setTagSeverities((s) => {
          const next = { ...s };
          delete next[tag];
          return next;
        });
        return prev.filter((t) => t !== tag);
      }
      if (prev.length >= MAX_TAGS) return prev; // cap at MAX_TAGS
      return [...prev, tag];
    });
  };

  const filteredMenuItems = useMemo(() => {
    if (!business) return [];
    const query = menuSearch.trim().toLowerCase();
    if (!query) return business.menuItems;
    return business.menuItems.filter((item) =>
      item.toLowerCase().includes(query),
    );
  }, [business, menuSearch]);

  // "What stood out" is the core signal the AI draft is built from — it's
  // not literally required, but the customer must either pick at least one
  // chip OR write something in the note box, otherwise there's nothing
  // specific for the review to be built on.
  const hasStoodOutInput = selectedTags.length > 0 || note.trim().length > 0;

  // ---- Submit feedback + request AI draft ----
  const submitFeedback = async () => {
    if (!business) return;
    if (!hasStoodOutInput) {
      setError(
        "Please select at least one thing that stood out, or add a note below.",
      );
      return;
    }
    setIsSubmitting(true);
    setError("");

    const dishesOrdered =
      business.menuItems.length > 0
        ? selectedDishes
        : dishFreeText.trim()
          ? [dishFreeText.trim()]
          : [];

    const finalTags = rating === 1
      ? selectedTags.map((tag) => `${tag}:${tagSeverities[tag] || "moderate"}`)
      : selectedTags;

    try {
      const result = await apiPost<{ _id: string }>("/public/feedback", {
        rating,
        reviewToken: business.reviewToken,
        clientId: clientId.current,
        tags: finalTags,
        note: note.trim(),
        dishesOrdered,
        groupSize: groupSize ? (groupSize.toLowerCase() as string) : undefined,
      });

      setFeedbackId(result._id);
      setStep("review");
      setIsAiLoading(true);

      // Request AI draft (non-blocking — graceful degradation)
      try {
        const aiResult = await apiPost<{
          draft: string | null;
          error: string | null;
          remainingGenerations: number;
        }>("/public/ai/review-suggestion", {
          feedbackEventId: result._id,
          reviewToken: business.reviewToken,
        });
        if (aiResult.draft) {
          setReviewText(aiResult.draft);
        }
        setAiGenerationsRemaining(aiResult.remainingGenerations);
      } catch {
        // AI failed — user writes their own
      }
      setIsAiLoading(false);
    } catch (err) {
      if (axios.isAxiosError(err) && !err.response) {
        setNetworkError(true);
      } else {
        const axiosErr = err as { message?: string };
        setError(axiosErr.message || "Failed to submit feedback");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Regenerate AI draft ----
  const regenerate = async () => {
    if (!feedbackId || !business || aiGenerationsRemaining <= 0) return;
    setIsAiLoading(true);
    try {
      const aiResult = await apiPost<{
        draft: string | null;
        error: string | null;
        remainingGenerations: number;
      }>("/public/ai/review-suggestion", {
        feedbackEventId: feedbackId,
        reviewToken: business.reviewToken,
      });
      if (aiResult.draft) {
        setReviewText(aiResult.draft);
      }
      setAiGenerationsRemaining(aiResult.remainingGenerations);
    } catch {
      // keep existing text
    }
    setIsAiLoading(false);
  };

  // ---- Copy & continue to Google ----
  const copyAndRedirect = async () => {
    if (!business) return;
    const text = reviewText.trim();
    if (!text) {
      setError("Please write or generate a review before continuing.");
      return;
    }

    // Try clipboard
    try {
      await navigator.clipboard.writeText(text);
      setClipboardFailed(false);
    } catch {
      setClipboardFailed(true);
      // Don't block — show fallback UI but still record the event
    }

    // Record copy event
    try {
      await apiPost(`/public/feedback/${feedbackId}/copy-event`, {
        reviewToken: business.reviewToken,
        finalText: text,
      });
      if (businessCode) clearStoredReviewToken(businessCode);
    } catch {
      // Non-critical — don't block the redirect
    }

    setStep("redirect");
  };

  // ---- Redirect countdown ----
  useEffect(() => {
    if (step !== "redirect" || !business) return;
    if (countdown <= 0) {
      window.location.href = ensureProtocol(business.googleReviewUrl);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, countdown, business]);

  // ---- Network error overlay ----
  if (networkError) {
    return (
      <NetworkError
        onRetry={() => {
          setNetworkError(false);
          if (!business) fetchBusiness();
        }}
      />
    );
  }

  // ---- Loading ----
  if (isLoading) {
    return (
      <div className="public-flow">
        <div className="public-card">
          <div className="ai-loading">
            <div className="ai-loading-spinner" />
            <p className="ai-loading-text">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // ---- Error screens ----
  if (pageError === "not_found") {
    return (
      <div className="public-flow">
        <div className="public-card">
          <div className="public-error-screen">
            <div className="public-error-screen-icon">🔍</div>
            <h2
              style={{ color: "#1A1A1A", fontSize: "1.25rem", fontWeight: 700 }}
            >
              Business not found
            </h2>
            <p style={{ color: "#6B6B63", fontSize: "0.875rem" }}>
              This QR code may be invalid or the business no longer exists.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (pageError === "inactive") {
    return (
      <div className="public-flow">
        <div className="public-card">
          <div className="public-error-screen">
            <div className="public-error-screen-icon">⏸️</div>
            <h2
              style={{ color: "#1A1A1A", fontSize: "1.25rem", fontWeight: 700 }}
            >
              Currently unavailable
            </h2>
            <p style={{ color: "#6B6B63", fontSize: "0.875rem" }}>
              This business is temporarily not accepting reviews.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!business) return null;

  const categoryConfig = getCategoryConfig(business.businessType);
  const positiveTags = business.positiveTags || [];
  const negativeTags = business.negativeTags || [];
  
  // Mid-level / constructive negative tags suitable for a balanced 3-star review
  const MID_LEVEL_NEGATIVE_TAGS = new Set([
    "Slow service",
    "Overpriced",
    "Small portions",
    "Average coffee",
    "Noisy",
    "Long wait",
    "Long wait time",
    "Limited variety",
    "Limited stock",
    "Below expectations",
    "Food was cold",
    "Not as expected",
    "Equipment issues",
    "Rushed appointment",
    "Rushed service",
    "Rushed treatment",
    "Noisy room",
    "Uncomfortable seating",
    "Slow response",
    "Communication",
    "Poor communication",
    "Poor advice",
    "Poor ventilation",
    "Overcrowded",
    "Delayed delivery",
  ]);

  let orderedTags: string[] = [];
  if (rating <= 2) {
    orderedTags = [...negativeTags];
  } else if (rating === 3) {
    // 3 stars: mild/solid positive points first, and 1 or 2 mid-level negative points at the end
    const midNegatives = negativeTags
      .filter((tag) => MID_LEVEL_NEGATIVE_TAGS.has(tag))
      .slice(0, 2);
    const finalNegatives = midNegatives.length > 0 ? midNegatives : negativeTags.slice(0, 2);
    orderedTags = [...positiveTags, ...finalNegatives];
  } else {
    orderedTags = [...positiveTags];
  }
  
  const negativeTagSet = new Set(negativeTags);
  const useMenuModal = business.menuItems.length > MENU_MODAL_THRESHOLD;

  // ---- Render steps ----
  return (
    <div className="public-flow">
      <div className="public-card">
        {/* ================================================================
            3-Step Progress Stepper (Clickable for Easy Back Navigation)
            ================================================================ */}
        <div className="review-progress-container" aria-label="Review Progress">
          <div className="review-progress-bar-bg">
            <div
              className="review-progress-bar-fill"
              style={{
                width:
                  step === "landing"
                    ? "0%"
                    : step === "details"
                    ? "50%"
                    : "100%",
              }}
            />
          </div>
          <div className="review-progress-steps">
            <button
              type="button"
              className={`progress-step-item clickable ${step === "landing" ? "active" : "completed"}`}
              onClick={() => {
                setError("");
                setStep("landing");
              }}
              title="Go to Rating"
            >
              <div className="progress-step-dot">
                {step !== "landing" ? "✓" : "1"}
              </div>
              <span className="progress-step-label">Rate</span>
            </button>

            <button
              type="button"
              disabled={rating === 0}
              className={`progress-step-item ${rating > 0 ? "clickable" : ""} ${step === "details" ? "active" : step === "review" || step === "redirect" ? "completed" : ""}`}
              onClick={() => {
                if (rating > 0) {
                  setError("");
                  setStep("details");
                }
              }}
              title="Go to Details"
            >
              <div className="progress-step-dot">
                {step === "review" || step === "redirect" ? "✓" : "2"}
              </div>
              <span className="progress-step-label">Details</span>
            </button>

            <button
              type="button"
              disabled={!feedbackId && step !== "review" && step !== "redirect"}
              className={`progress-step-item ${feedbackId ? "clickable" : ""} ${step === "review" || step === "redirect" ? "active" : ""}`}
              onClick={() => {
                if (feedbackId) {
                  setError("");
                  setStep("review");
                }
              }}
              title="Go to Review"
            >
              <div className="progress-step-dot">
                {step === "redirect" ? "✓" : "3"}
              </div>
              <span className="progress-step-label">Review</span>
            </button>
          </div>
        </div>

        {/* ================================================================
            Step 1: Landing + Star Rating
            ================================================================ */}
        {step === "landing" && (
          <div className="step-enter">
            <div className="public-business-info">
              {business.logoUrl ? (
                <img
                  src={business.logoUrl}
                  alt={business.name}
                  className="public-logo"
                />
              ) : (
                <div className="public-logo-placeholder">
                  {getInitials(business.name)}
                </div>
              )}
              <h1 className="public-business-name">{business.name}</h1>
              <p className="public-prompt">How was your experience today?</p>
            </div>

            <div className="star-rating-container">
              <div
                className="star-rating"
                onMouseLeave={() => setHoverRating(0)}
              >
                {[1, 2, 3, 4, 5].map((star) => {
                  const activeRating = hoverRating || rating;
                  const isFilled = star <= activeRating;
                  return (
                    <button
                      key={star}
                      className={`star-btn ${isFilled ? "filled" : ""} ${hoverRating > 0 && star <= hoverRating ? "hovered" : ""}`}
                      onClick={() => {
                        // When rating band changes, previously selected tags
                        // from a different tag set (positive vs negative) would
                        // silently persist in the submission. Clear any tags
                        // that won't be visible in the new rating's tag list.
                        if (star !== rating) {
                          const prevBand = rating <= 2 ? 'neg' : rating === 3 ? 'mix' : 'pos';
                          const nextBand = star <= 2 ? 'neg' : star === 3 ? 'mix' : 'pos';
                          if (prevBand !== nextBand) {
                            setSelectedTags([]);
                            setTagSeverities({});
                          }
                        }
                        setRating(star);
                        setHoverRating(0);
                      }}
                      onMouseEnter={() => setHoverRating(star)}
                      aria-label={`${star} star${star > 1 ? "s" : ""}`}
                    >
                      ★
                    </button>
                  );
                })}
              </div>

              <div className="rating-reaction-box">
                {(hoverRating || rating) > 0 && RATING_REACTIONS[hoverRating || rating] && (
                  <div key={hoverRating || rating} className="rating-reaction-text">
                    <span>{RATING_REACTIONS[hoverRating || rating].emoji}</span>
                    <span>{RATING_REACTIONS[hoverRating || rating].text}</span>
                  </div>
                )}
              </div>
            </div>

            {error && <p className="public-error">{error}</p>}

            <button
              className="public-btn-primary"
              disabled={rating === 0}
              onClick={() => {
                setError("");
                setStep("details");
              }}
            >
              <span>Continue</span>
              <span className="btn-arrow">→</span>
            </button>
          </div>
        )}

        {/* ================================================================
            Step 2: Simplified Unified Feedback + Optional Extra Details
            ================================================================ */}
        {step === "details" && (
          <div className="step-enter">
            <div className="step-nav-bar">
              <button
                type="button"
                className="step-nav-back"
                onClick={() => {
                  setError("");
                  setStep("landing");
                }}
              >
                ← Back to Rating
              </button>
            </div>

            <div className="step-header-group">
              <h2 className="tags-header">
                {rating <= 2
                  ? "What went wrong?"
                  : rating === 3
                  ? "What stood out?"
                  : "What went well?"}
              </h2>
              <p className="step-subheader">
                Select up to {MAX_TAGS} tags to personalize your review
              </p>
            </div>

            {/* Primary Tag Chips */}
            <div className="detail-section">
              <div className="tags-list-horizontal tags-list-scroll">
                {orderedTags.map((tag, index) => {
                  const isSelected = selectedTags.includes(tag);
                  const isNegative = negativeTagSet.has(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={`tag-chip ${isSelected ? "selected" : ""} ${isNegative ? "tag-chip--negative" : ""}`}
                      onClick={() => toggleTag(tag)}
                      style={{ animationDelay: `${index * 25}ms` }}
                    >
                      {isSelected && <span className="tag-check-icon">✓</span>}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 1-Star Severity Selector */}
            {rating === 1 && selectedTags.length > 0 && (
              <div className="selected-tags-severity-section">
                <p className="severity-title">How bad was it? <span className="detail-optional">(optional)</span></p>
                {selectedTags.map((tag) => (
                  <div key={tag} className="selected-tag-severity-row">
                    <span className="selected-tag-name">{tag}</span>
                    <div className="severity-pills">
                      {(["a_bit", "moderate", "extremely"] as const).map((sev) => {
                        const labelMap = { a_bit: "a bit", moderate: "very", extremely: "extremely" };
                        const isActive = (tagSeverities[tag] || "moderate") === sev;
                        return (
                          <button
                            key={sev}
                            type="button"
                            className={`severity-pill ${isActive ? "active" : ""}`}
                            onClick={() => setTagSeverities((prev) => ({ ...prev, [tag]: sev }))}
                          >
                            {labelMap[sev]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Dishes / Services Ordered (Directly visible) */}
            <div className="detail-section">
              <h2 className="tags-header" style={{ marginTop: "0.25rem" }}>
                <span>{categoryConfig.review.promptLabel}</span>
                <span className="detail-optional">(optional)</span>
              </h2>
              {business.menuItems.length === 0 ? (
                <input
                  type="text"
                  className="dish-text-input"
                  placeholder={categoryConfig.review.promptPlaceholder}
                  value={dishFreeText}
                  onChange={(e) => setDishFreeText(e.target.value.slice(0, 200))}
                />
              ) : useMenuModal ? (
                <>
                  <button
                    type="button"
                    className="menu-select-btn"
                    onClick={() => {
                      setMenuSearch("");
                      setShowMenuModal(true);
                    }}
                  >
                    🔍 Select items/services ({business.menuItems.length} available)
                  </button>
                  {selectedDishes.length > 0 && (
                    <div className="tags-list-horizontal" style={{ marginTop: "0.4rem" }}>
                      {selectedDishes.map((dish) => (
                        <span key={dish} className="tag-chip selected">
                          <span className="tag-check-icon">✓</span>
                          {dish}
                          <button
                            type="button"
                            className="dish-chip-remove"
                            onClick={() => toggleDish(dish)}
                            aria-label={`Remove ${dish}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="tags-list-horizontal tags-list-scroll">
                  {business.menuItems.map((dish, index) => {
                    const isSelected = selectedDishes.includes(dish);
                    return (
                      <button
                        key={dish}
                        type="button"
                        className={`tag-chip ${isSelected ? "selected" : ""}`}
                        onClick={() => toggleDish(dish)}
                        style={{ animationDelay: `${index * 20}ms` }}
                      >
                        {isSelected && <span className="tag-check-icon">✓</span>}
                        {dish}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Live Feedback Summary */}
            {(selectedTags.length > 0 || selectedDishes.length > 0) && (
              <div className="feedback-live-summary">
                <span className="summary-label">
                  {rating >= 4 ? "You enjoyed:" : rating <= 2 ? "You noted:" : "Selected:"}
                </span>
                <span className="summary-tags">
                  {[...selectedTags, ...selectedDishes].map((item, idx) => (
                    <span key={item} className="summary-tag-item">
                      {idx > 0 && <span className="summary-separator">·</span>}
                      {rating >= 4 ? "✨ " : rating <= 2 ? "⚠️ " : "✓ "}
                      {item}
                    </span>
                  ))}
                </span>
              </div>
            )}

            {/* Collapsible Extra Details Drawer for Note & Group Size */}
            <div className="extra-details-wrapper">
              {!isNoteExpanded ? (
                <button
                  type="button"
                  className="extra-details-toggle-btn"
                  onClick={() => setIsNoteExpanded(true)}
                >
                  <div className="extra-details-btn-left">
                    <span className="extra-details-icon">
                      {note || groupSize ? "✓" : "＋"}
                    </span>
                    <span>
                      {note || groupSize
                        ? "Extra details added"
                        : "Add note or party details"}
                    </span>
                  </div>
                  <span className="extra-details-badge">
                    {note || groupSize ? "Edit" : "Optional"}
                  </span>
                </button>
              ) : (
                <div className="extra-details-drawer">
                  <div className="extra-details-drawer-header">
                    <span className="extra-details-drawer-title">Optional Details</span>
                    <button
                      type="button"
                      className="extra-details-close-btn"
                      onClick={() => setIsNoteExpanded(false)}
                    >
                      Done ✓
                    </button>
                  </div>

                  {/* 1. Custom Note */}
                  <div className="detail-section">
                    <p className="detail-section-label">
                      Anything else? <span className="detail-optional">(optional)</span>
                    </p>
                    <textarea
                      className="note-textarea"
                      placeholder="Tell us in your own words (optional)..."
                      value={note}
                      onChange={(e) => setNote(e.target.value.slice(0, 500))}
                      rows={2}
                    />
                    <p className="note-count">{note.length}/500</p>
                  </div>

                  {/* 2. Who did you visit with */}
                  {categoryConfig.showGroupSize && (
                    <div className="detail-section">
                      <p className="detail-section-label">
                        Who did you visit with? <span className="detail-optional">(optional)</span>
                      </p>
                      <div className="tags-list-horizontal">
                        {GROUP_OPTIONS.map((opt, index) => {
                          const isSelected = groupSize === opt.label;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              className={`tag-chip ${isSelected ? "selected" : ""}`}
                              onClick={() => setGroupSize(isSelected ? null : opt.label)}
                              style={{ animationDelay: `${index * 20}ms` }}
                            >
                              {isSelected && <span className="tag-check-icon">✓</span>}
                              <span className="companion-icon">{opt.icon}</span>
                              <span>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && <p className="public-error">{error}</p>}

            <button
              className="public-btn-primary"
              disabled={!hasStoodOutInput || isSubmitting}
              onClick={submitFeedback}
            >
              <span>{isSubmitting ? "Submitting..." : "Continue"}</span>
              <span className="btn-arrow">→</span>
            </button>
          </div>
        )}

        {/* ================================================================
            Step 3: AI Review Draft
            ================================================================ */}
        {step === "review" && (
          <div className="step-enter">
            <div className="step-nav-bar">
              <button
                type="button"
                className="step-nav-back"
                onClick={() => {
                  setError("");
                  setStep("details");
                }}
              >
                ← Edit details & tags
              </button>
            </div>

            {isAiLoading ? (
              <div className="ai-loading">
                <div className="ai-loading-spinner" />
                <p className="ai-loading-text">Crafting your review…</p>
              </div>
            ) : (
              <>
                <h2 className="review-header">
                  <span>✨</span>
                  <span>Here's a draft based on your visit — it's yours to edit</span>
                </h2>

                <textarea
                  className="review-textarea"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value.slice(0, 5000))}
                  placeholder="Type your Google review here..."
                  maxLength={5000}
                  rows={6}
                />

                <button
                  className="regenerate-btn"
                  onClick={regenerate}
                  disabled={isAiLoading || aiGenerationsRemaining <= 0}
                >
                  ↻ Regenerate
                </button>

                <p className="copied-hint">
                  {aiGenerationsRemaining > 0
                    ? `${aiGenerationsRemaining} AI generation${aiGenerationsRemaining === 1 ? "" : "s"} remaining`
                    : "You can continue editing this draft manually"}
                </p>

                <p className="copied-hint">
                  Feel free to rewrite it in your own words
                </p>

                {error && <p className="public-error">{error}</p>}

                <button
                  className="public-btn-primary"
                  onClick={copyAndRedirect}
                >
                  <span>Copy & continue to Google</span>
                  <span className="btn-arrow">→</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* ================================================================
            Step 4: Google Redirect
            ================================================================ */}
        {step === "redirect" && (
          <div className="redirect-screen step-enter">
            <div className="animated-success-checkmark">
              <svg className="checkmark-svg" viewBox="0 0 52 52">
                <circle className="checkmark-circle" cx="26" cy="26" r="23" fill="none" />
                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
              <div className="success-particles">
                <span className="particle p1"></span>
                <span className="particle p2"></span>
                <span className="particle p3"></span>
                <span className="particle p4"></span>
                <span className="particle p5"></span>
                <span className="particle p6"></span>
                <span className="particle p7"></span>
                <span className="particle p8"></span>
              </div>
            </div>

            <h2 className="redirect-title">Review copied to clipboard!</h2>

            <div className="review-readonly-box">{reviewText}</div>

            {clipboardFailed && (
              <div className="clipboard-fallback">
                ⚠️ Couldn't copy automatically — tap the text above and select
                all
              </div>
            )}

            <div className="redirect-steps">
              <p className="redirect-steps-label">On Google:</p>
              <div className="redirect-step">
                <span className="redirect-step-num">1</span>
                <span>
                  Tap the review box and <strong>paste</strong> (long press →
                  paste)
                </span>
              </div>
              <div className="redirect-step">
                <span className="redirect-step-num">2</span>
                <span>
                  <strong>Stars and extra questions are optional</strong> — you
                  can skip them
                </span>
              </div>
              <div className="redirect-step">
                <span className="redirect-step-num">3</span>
                <span>
                  Tap <strong>Post</strong>
                </span>
              </div>
            </div>

            <p className="redirect-countdown">
              Redirecting to Google in {countdown}s…
            </p>

            <button
              className="public-btn-primary"
              onClick={() => {
                if (business)
                  window.location.href = ensureProtocol(
                    business.googleReviewUrl,
                  );
              }}
            >
              <span>Open Google & Post</span>
              <span className="btn-arrow">→</span>
            </button>
          </div>
        )}
      </div>

      <p className="privacy-footer">
        Powered by ReviewBooster ·{' '}
        <Link to="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
          Privacy
        </Link>{' '}
        ·{' '}
        <Link to="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
          Terms
        </Link>
      </p>

      {/* ================================================================
          Menu search modal — shown when the business has many menu items
          ================================================================ */}
      {showMenuModal && (
        <div
          className="menu-modal-overlay"
          onClick={() => setShowMenuModal(false)}
        >
          <div className="menu-modal" onClick={(e) => e.stopPropagation()}>
            <div className="menu-modal-header">
              <h3 className="menu-modal-title">Select what you ordered</h3>
              <button
                type="button"
                className="menu-modal-close"
                onClick={() => setShowMenuModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <input
              type="text"
              className="menu-modal-search"
              placeholder="Type to search…"
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              autoFocus
            />

            <div className="menu-modal-list">
              {filteredMenuItems.length === 0 && (
                <p className="menu-modal-empty">
                  No items match "{menuSearch}"
                </p>
              )}
              {filteredMenuItems.map((dish) => {
                const isSelected = selectedDishes.includes(dish);
                return (
                  <button
                    key={dish}
                    type="button"
                    className={`menu-modal-item ${isSelected ? "selected" : ""}`}
                    onClick={() => toggleDish(dish)}
                  >
                    <span
                      className={`menu-modal-check ${isSelected ? "checked" : ""}`}
                    >
                      {isSelected ? "✓" : ""}
                    </span>
                    {dish}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="public-btn-primary"
              style={{ marginTop: "1rem" }}
              onClick={() => setShowMenuModal(false)}
            >
              Done{" "}
              {selectedDishes.length > 0
                ? `(${selectedDishes.length} selected)`
                : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
