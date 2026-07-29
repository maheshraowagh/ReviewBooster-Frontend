import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import NetworkError from "../../components/NetworkError";
import "./public.css";

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
  sessionId: string;
  positiveTags: string[];
  negativeTags: string[];
}

type Step = "landing" | "details" | "review" | "redirect";

// Must match MAX_TAGS in backend/src/services/aiReviewService.js
const MAX_TAGS = 4;

// Dynamic labels per business type for Section A
const SECTION_A_CONFIG: Record<string, { label: string; placeholder: string }> = {
  restaurant: { label: 'What did you order?',           placeholder: 'e.g. Paneer Tikka, Cold Coffee' },
  cafe:       { label: 'What did you order?',           placeholder: 'e.g. Cappuccino, Sandwich' },
  bakery:     { label: 'What did you get?',             placeholder: 'e.g. Croissant, Brownie' },
  salon:      { label: 'What did you have done?',       placeholder: 'e.g. Haircut, Hair Colour' },
  spa:        { label: 'What treatment did you have?',  placeholder: 'e.g. Deep Tissue Massage' },
  gym:        { label: 'What did you use?',             placeholder: 'e.g. Treadmill, Yoga Class' },
  clinic:     { label: 'What was your visit for?',      placeholder: 'e.g. Dental Cleaning, Eye Checkup' },
  hotel:      { label: 'What room type did you stay in?', placeholder: 'e.g. Deluxe Room, Suite' },
  retail:     { label: 'What did you buy?',             placeholder: 'e.g. Shoes, Electronics' },
};
const DEFAULT_SECTION_A = { label: 'What service did you use?', placeholder: 'e.g. SEO Package, Consulting' };

// Above this many menu items, switch from inline chips to a searchable
// modal so the list doesn't overwhelm the screen.
const MENU_MODAL_THRESHOLD = 6;

const GROUP_SIZES = ['Solo', 'Couple', 'Family', 'Friends', 'Work'] as const;

// Only show the group size question for hospitality / leisure businesses
const SHOW_GROUP_SIZE_FOR = new Set(['restaurant', 'cafe', 'bakery', 'hotel', 'spa']);

// Only show menu items for restaurants, cafes, and bakeries
const SHOW_MENU_FOR = new Set(['restaurant', 'cafe', 'bakery']);

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

  // Step 2 state — dishes ordered, what stood out, note
  const [selectedDishes, setSelectedDishes] = useState<string[]>([]);
  const [dishFreeText, setDishFreeText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagSeverities, setTagSeverities] = useState<Record<string, "a_bit" | "moderate" | "extremely">>({});
  const [note, setNote] = useState("");
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [groupSize, setGroupSize] = useState<string | null>(null);

  // Step 3 state
  const [feedbackId, setFeedbackId] = useState("");
  const [reviewText, setReviewText] = useState("");
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
      const data = await apiGet<BusinessData>(
        `/public/business/${businessCode}`,
        { "x-client-id": clientId.current },
      );
      setBusiness(data);
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

    const finalTags = rating <= 2
      ? selectedTags.map((tag) => `${tag}:${tagSeverities[tag] || "moderate"}`)
      : selectedTags;

    try {
      const result = await apiPost<{ _id: string }>("/public/feedback", {
        rating,
        businessId: business.businessId,
        sessionId: business.sessionId,
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
        }>("/public/ai/review-suggestion", { feedbackEventId: result._id });
        if (aiResult.draft) {
          setReviewText(aiResult.draft);
        }
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
    if (!feedbackId) return;
    setIsAiLoading(true);
    try {
      const aiResult = await apiPost<{
        draft: string | null;
        error: string | null;
      }>("/public/ai/review-suggestion", { feedbackEventId: feedbackId });
      if (aiResult.draft) {
        setReviewText(aiResult.draft);
      }
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
        finalText: text,
      });
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
              style={{ color: "#1A1A1A", fontSize: "1.25rem", fontWeight: 600 }}
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
              style={{ color: "#1A1A1A", fontSize: "1.25rem", fontWeight: 600 }}
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

  // Determine which tags to show based on the star rating:
  // 1-2 stars: Only negative
  // 3 stars: Both negative and positive
  // 4-5 stars: Only positive
  const positiveTags = business.positiveTags || [];
  const negativeTags = business.negativeTags || [];
  
  let orderedTags: string[] = [];
  if (rating <= 2) {
    orderedTags = [...negativeTags];
  } else if (rating === 3) {
    orderedTags = [...negativeTags, ...positiveTags];
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
            Step 1: Landing + Star Rating
            ================================================================ */}
        {step === "landing" && (
          <>
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

            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className={`star-btn ${star <= rating ? "filled" : ""}`}
                  onClick={() => setRating(star)}
                  aria-label={`${star} star${star > 1 ? "s" : ""}`}
                >
                  ★
                </button>
              ))}
            </div>

            {error && <p className="public-error">{error}</p>}

            <button
              className="public-btn-primary"
              disabled={rating === 0}
              onClick={() => {
                setError("");
                setSelectedDishes([]);
                setDishFreeText("");
                setSelectedTags([]);
                setNote("");
                setGroupSize(null);
                setStep("details");
              }}
            >
              Continue →
            </button>
          </>
        )}

        {/* ================================================================
            Step 2: Dishes ordered + what stood out
            ================================================================ */}
        {step === "details" && (
          <>
            <h2 className="tags-header">Tell us a bit more</h2>

            {rating <= 2 ? (
              // ---- 1-2 Star Reviews Flow (Reordered) ----
              <>
                {/* 1. What went wrong? (Required) */}
                <div className="detail-section">
                  <p className="detail-section-label">
                    What went wrong?{" "}
                    <span className="detail-optional">(pick up to {MAX_TAGS})</span>
                  </p>
                  <div className="tags-list-horizontal tags-list-scroll">
                    {orderedTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      const isNegative = negativeTagSet.has(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          className={`tag-chip ${isSelected ? "selected" : ""} ${isNegative ? "tag-chip--negative" : ""}`}
                          onClick={() => toggleTag(tag)}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                  <p className="detail-required-hint">
                    Select at least one, or tell us in your own words below
                  </p>
                </div>

                {/* 1.5. Severity selector for selected tags */}
                {selectedTags.length > 0 && (
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
                                onClick={() => setTagSeverities(prev => ({ ...prev, [tag]: sev }))}
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

                {/* 2. Anything else? (Optional, Dimmed) */}
                <div className="detail-section detail-section--optional">
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

                {/* 3. What did you get? (Optional, Dimmed, Food only) */}
                {SHOW_MENU_FOR.has(business.businessType?.toLowerCase()) && (
                  <div className="detail-section detail-section--optional">
                    <p className="detail-section-label">
                      {(SECTION_A_CONFIG[business.businessType?.toLowerCase()] || DEFAULT_SECTION_A).label}{" "}
                      <span className="detail-optional">(optional)</span>
                    </p>
                    {business.menuItems.length === 0 ? (
                      <input
                        type="text"
                        className="dish-text-input"
                        placeholder={(SECTION_A_CONFIG[business.businessType?.toLowerCase()] || DEFAULT_SECTION_A).placeholder}
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
                          🔍 Select from menu ({business.menuItems.length} items)
                        </button>
                        {selectedDishes.length > 0 && (
                          <div className="tags-list-horizontal" style={{ marginTop: "0.625rem" }}>
                            {selectedDishes.map((dish) => (
                              <span key={dish} className="tag-chip selected">
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
                        {business.menuItems.map((dish) => {
                          const isSelected = selectedDishes.includes(dish);
                          return (
                            <button
                              key={dish}
                              type="button"
                              className={`tag-chip ${isSelected ? "selected" : ""}`}
                              onClick={() => toggleDish(dish)}
                            >
                              {dish}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Who did you visit with? (Optional, Dimmed, Hospitality only) */}
                {business.businessType && SHOW_GROUP_SIZE_FOR.has(business.businessType.toLowerCase()) && (
                  <div className="detail-section detail-section--optional">
                    <p className="detail-section-label">
                      Who did you visit with? <span className="detail-optional">(optional)</span>
                    </p>
                    <div className="tags-list-horizontal">
                      {GROUP_SIZES.map((size) => {
                        const isSelected = groupSize === size;
                        return (
                          <button
                            key={size}
                            type="button"
                            className={`tag-chip ${isSelected ? "selected" : ""}`}
                            onClick={() => setGroupSize(isSelected ? null : size)}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              // ---- 3-5 Star Reviews Flow (Standard Order) ----
              <>
                {/* 1. What did you get? (Optional, Food only) */}
                {SHOW_MENU_FOR.has(business.businessType?.toLowerCase()) && (
                  <div className="detail-section detail-section--optional">
                    <p className="detail-section-label">
                      {(SECTION_A_CONFIG[business.businessType?.toLowerCase()] || DEFAULT_SECTION_A).label}{" "}
                      <span className="detail-optional">(optional)</span>
                    </p>
                    {business.menuItems.length === 0 ? (
                      <input
                        type="text"
                        className="dish-text-input"
                        placeholder={(SECTION_A_CONFIG[business.businessType?.toLowerCase()] || DEFAULT_SECTION_A).placeholder}
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
                          🔍 Select from menu ({business.menuItems.length} items)
                        </button>
                        {selectedDishes.length > 0 && (
                          <div className="tags-list-horizontal" style={{ marginTop: "0.625rem" }}>
                            {selectedDishes.map((dish) => (
                              <span key={dish} className="tag-chip selected">
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
                        {business.menuItems.map((dish) => {
                          const isSelected = selectedDishes.includes(dish);
                          return (
                            <button
                              key={dish}
                              type="button"
                              className={`tag-chip ${isSelected ? "selected" : ""}`}
                              onClick={() => toggleDish(dish)}
                            >
                              {dish}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. What went well? (Required) */}
                <div className="detail-section">
                  <p className="detail-section-label">
                    {rating === 3 ? "What went well / wrong?" : "What went well?"}{" "}
                    <span className="detail-optional">(pick up to {MAX_TAGS})</span>
                  </p>
                  <div className="tags-list-horizontal tags-list-scroll">
                    {orderedTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      const isNegative = negativeTagSet.has(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          className={`tag-chip ${isSelected ? "selected" : ""} ${isNegative ? "tag-chip--negative" : ""}`}
                          onClick={() => toggleTag(tag)}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                  <p className="detail-required-hint">
                    Select at least one, or tell us in your own words below
                  </p>
                </div>

                {/* 3. Anything else? (Optional, Dimmed) */}
                <div className="detail-section detail-section--optional">
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

                {/* 4. Who did you visit with? (Optional, Dimmed, Hospitality only) */}
                {business.businessType && SHOW_GROUP_SIZE_FOR.has(business.businessType.toLowerCase()) && (
                  <div className="detail-section detail-section--optional">
                    <p className="detail-section-label">
                      Who did you visit with? <span className="detail-optional">(optional)</span>
                    </p>
                    <div className="tags-list-horizontal">
                      {GROUP_SIZES.map((size) => {
                        const isSelected = groupSize === size;
                        return (
                          <button
                            key={size}
                            type="button"
                            className={`tag-chip ${isSelected ? "selected" : ""}`}
                            onClick={() => setGroupSize(isSelected ? null : size)}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {error && <p className="public-error">{error}</p>}

            <button
              className="public-btn-primary"
              disabled={!hasStoodOutInput || isSubmitting}
              onClick={submitFeedback}
            >
              {isSubmitting ? "Submitting..." : "Continue →"}
            </button>
          </>
        )}

        {/* ================================================================
            Step 3: AI Review Draft
            ================================================================ */}
        {step === "review" && (
          <>
            {isAiLoading ? (
              <div className="ai-loading">
                <div className="ai-loading-spinner" />
                <p className="ai-loading-text">Crafting your review…</p>
              </div>
            ) : (
              <>
                <h2 className="review-header">
                  <span>✨</span>
                  Here's a draft based on your visit — it's yours to edit
                </h2>

                <textarea
                  className="review-textarea"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Type your Google review here..."
                  rows={6}
                />

                <button
                  className="regenerate-btn"
                  onClick={regenerate}
                  disabled={isAiLoading}
                >
                  ↻ Regenerate
                </button>

                <p className="copied-hint">
                  Feel free to rewrite it in your own words
                </p>

                {error && <p className="public-error">{error}</p>}

                <button
                  className="public-btn-primary"
                  onClick={copyAndRedirect}
                >
                  Copy & continue to Google →
                </button>
              </>
            )}
          </>
        )}

        {/* ================================================================
            Step 4: Google Redirect
            ================================================================ */}
        {step === "redirect" && (
          <div className="redirect-screen">
            <div className="redirect-check">✓</div>
            <h2 className="redirect-title">Review copied to clipboard</h2>

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
              Open Google & Post →
            </button>
          </div>
        )}
      </div>

      <p className="privacy-footer">
        We use a device identifier to improve your experience. No personal data
        is collected.
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
