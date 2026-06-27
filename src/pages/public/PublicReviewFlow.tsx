import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import NetworkError from '../../components/NetworkError';
import './public.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface BusinessData {
  businessId: string;
  name: string;
  logoUrl: string;
  businessType: string;
  googleReviewUrl: string;
  sessionId: string;
}

type Step = 'landing' | 'tags' | 'review' | 'redirect';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getClientId(): string {
  let id = localStorage.getItem('rb_client_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('rb_client_id', id);
  }
  return id;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

async function apiGet<T>(path: string, headers?: Record<string, string>): Promise<T> {
  const res = await axios.get(`${API_URL}${path}`, { headers });
  if (!res.data.success) throw new Error(res.data.error?.message || 'Request failed');
  return res.data.data;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await axios.post(`${API_URL}${path}`, body);
  if (!res.data.success) throw new Error(res.data.error?.message || 'Request failed');
  return res.data.data;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PublicReviewFlow() {
  const { businessCode } = useParams<{ businessCode: string }>();
  const clientId = useRef(getClientId());

  // State
  const [step, setStep] = useState<Step>('landing');
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [feedbackId, setFeedbackId] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [clipboardFailed, setClipboardFailed] = useState(false);

  // Loading / error
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [networkError, setNetworkError] = useState(false);
  const [pageError, setPageError] = useState<'not_found' | 'inactive' | null>(null);

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
        { 'x-client-id': clientId.current }
      );
      setBusiness(data);
    } catch (err) {
      if (axios.isAxiosError(err) && !err.response) {
        setNetworkError(true);
      } else {
        const status = axios.isAxiosError(err) ? err.response?.status : null;
        if (status === 404) setPageError('not_found');
        else if (status === 403) setPageError('inactive');
        else setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [businessCode]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  // ---- Fetch tags when rating is selected ----
  const fetchTags = useCallback(async () => {
    if (!business) return;
    const sentiment = rating <= 3 ? 'negative' : 'positive';
    try {
      const tagList = await apiGet<string[]>(
        `/public/tags/${business.businessType}?sentiment=${sentiment}`
      );
      setAvailableTags(tagList);
    } catch (err) {
      if (axios.isAxiosError(err) && !err.response) {
        setNetworkError(true);
      }
      setAvailableTags([]);
    }
  }, [business, rating]);

  // ---- Submit feedback + request AI draft ----
  const submitFeedback = async () => {
    if (!business) return;
    setIsSubmitting(true);
    setError('');

    try {
      const result = await apiPost<{ _id: string }>('/public/feedback', {
        rating,
        businessId: business.businessId,
        sessionId: business.sessionId,
        clientId: clientId.current,
        tags: selectedTags,
        note: note.trim(),
      });

      setFeedbackId(result._id);
      setStep('review');
      setIsAiLoading(true);

      // Request AI draft (non-blocking — graceful degradation)
      try {
        const aiResult = await apiPost<{ draft: string | null; error: string | null }>(
          '/public/ai/review-suggestion',
          { feedbackEventId: result._id }
        );
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
        setError(axiosErr.message || 'Failed to submit feedback');
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
      const aiResult = await apiPost<{ draft: string | null; error: string | null }>(
        '/public/ai/review-suggestion',
        { feedbackEventId: feedbackId }
      );
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
      setError('Please write or generate a review before continuing.');
      return;
    }

    // Try clipboard
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setClipboardFailed(true);
      // Don't block — show fallback UI but still record the event
    }

    // Record copy event
    try {
      await apiPost(`/public/feedback/${feedbackId}/copy-event`, { finalText: text });
    } catch {
      // Non-critical — don't block the redirect
    }

    setStep('redirect');
  };

  // ---- Redirect countdown ----
  useEffect(() => {
    if (step !== 'redirect' || !business) return;
    if (countdown <= 0) {
      window.location.href = business.googleReviewUrl;
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
          else if (step === 'tags') fetchTags();
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
  if (pageError === 'not_found') {
    return (
      <div className="public-flow">
        <div className="public-card">
          <div className="public-error-screen">
            <div className="public-error-screen-icon">🔍</div>
            <h2 style={{ color: 'var(--color-text-primary)', fontSize: '1.25rem', fontWeight: 600 }}>
              Business not found
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              This QR code may be invalid or the business no longer exists.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (pageError === 'inactive') {
    return (
      <div className="public-flow">
        <div className="public-card">
          <div className="public-error-screen">
            <div className="public-error-screen-icon">⏸️</div>
            <h2 style={{ color: 'var(--color-text-primary)', fontSize: '1.25rem', fontWeight: 600 }}>
              Currently unavailable
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              This business is temporarily not accepting reviews.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!business) return null;

  // ---- Render steps ----
  return (
    <div className="public-flow">
      <div className="public-card">
        {/* ================================================================
            Step 1: Landing + Star Rating
            ================================================================ */}
        {step === 'landing' && (
          <>
            <div className="public-business-info">
              {business.logoUrl ? (
                <img src={business.logoUrl} alt={business.name} className="public-logo" />
              ) : (
                <div className="public-logo-placeholder">{getInitials(business.name)}</div>
              )}
              <h1 className="public-business-name">{business.name}</h1>
              <p className="public-prompt">How was your experience today?</p>
            </div>

            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className={`star-btn ${star <= rating ? 'filled' : ''}`}
                  onClick={() => setRating(star)}
                  aria-label={`${star} star${star > 1 ? 's' : ''}`}
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
                setError('');
                setSelectedTags([]);
                setNote('');
                fetchTags();
                setStep('tags');
              }}
            >
              Continue →
            </button>
          </>
        )}

        {/* ================================================================
            Step 2: Tags + Note
            ================================================================ */}
        {step === 'tags' && (
          <>
            <h2 className="tags-header">
              {rating <= 3 ? 'Sorry to hear that. What went wrong?' : 'What did you love?'}
            </h2>
            <p className="tags-subtext">select all that apply</p>

            {rating <= 3 ? (
              /* Low rating: vertical list with checkmarks */
              <div className="tags-list-vertical">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      className={`tag-pill ${isSelected ? 'selected' : ''}`}
                      onClick={() =>
                        setSelectedTags((prev) =>
                          isSelected ? prev.filter((t) => t !== tag) : [...prev, tag]
                        )
                      }
                    >
                      <span className="tag-check">✓</span>
                      {tag}
                    </button>
                  );
                })}
              </div>
            ) : (
              /* High rating: horizontal wrap chips */
              <div className="tags-list-horizontal">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      className={`tag-chip ${isSelected ? 'selected' : ''}`}
                      onClick={() =>
                        setSelectedTags((prev) =>
                          isSelected ? prev.filter((t) => t !== tag) : [...prev, tag]
                        )
                      }
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            )}

            <textarea
              className="note-textarea"
              placeholder="Anything else? (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              rows={2}
            />
            <p className="note-count">{note.length}/500</p>

            {error && <p className="public-error">{error}</p>}

            <button
              className="public-btn-primary"
              disabled={isSubmitting}
              onClick={submitFeedback}
            >
              {isSubmitting ? 'Submitting...' : 'Continue →'}
            </button>
          </>
        )}

        {/* ================================================================
            Step 3: AI Review Draft
            ================================================================ */}
        {step === 'review' && (
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
                  {reviewText
                    ? "Here's a draft, edit as you like"
                    : 'Write your own review below'}
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
                  📋 Copied automatically — just paste on the next screen
                </p>

                {error && <p className="public-error">{error}</p>}

                <button className="public-btn-primary" onClick={copyAndRedirect}>
                  Copy & continue to Google →
                </button>
              </>
            )}
          </>
        )}

        {/* ================================================================
            Step 4: Google Redirect
            ================================================================ */}
        {step === 'redirect' && (
          <div className="redirect-screen">
            <div className="google-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>

            <h2 className="redirect-title">Your review is on your clipboard</h2>
            <p className="redirect-subtitle">
              Tap the review box below and paste, then post
            </p>

            {clipboardFailed ? (
              <>
                <div className="clipboard-fallback">
                  ⚠️ Couldn't copy automatically — tap the text below and select all
                </div>
                <div className="clipboard-fallback-text">{reviewText}</div>
              </>
            ) : (
              <div className="paste-hint-box">
                Tap here and paste (long-press → paste)
              </div>
            )}

            <p className="redirect-countdown">
              Redirecting to Google in {countdown}s…
            </p>

            <button
              className="public-btn-primary"
              onClick={() => {
                if (business) window.location.href = business.googleReviewUrl;
              }}
            >
              Go to Google now →
            </button>
          </div>
        )}
      </div>

      <p className="privacy-footer">
        We use a device identifier to improve your experience. No personal data is collected.
      </p>
    </div>
  );
}
