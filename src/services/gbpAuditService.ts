/**
 * GBP Audit service — API calls for Google Business Profile Health Audit.
 */
import api, { type ApiResponse } from '../lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AuditActionItem {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  actionType: string;
  projectedUplift: number;
}

export interface AuditDetails {
  hasWebsite: boolean;
  hasPhone: boolean;
  hasHours: boolean;
  hasDescription: boolean;
  photoCount: number;
  totalReviews: number;
  avgRating: number;
  recentUnrepliedCount: number;
  recentUnrepliedRatio: number;
  estimatedReviewVelocity30d: number;
  daysSinceLastReview: number | null;
  reviewSampleSize: number;
}

export interface GbpAudit {
  _id: string;
  businessId: string;
  healthScore: number;
  projectedScore: number;
  auditDetails: AuditDetails;
  actionItems: AuditActionItem[];
  scoreHistory: { score: number; scrapedAt: string }[];
  status: 'ready' | 'processing' | 'failed';
  lastScrapedAt: string | null;
  lastError: string | null;
}

export interface GbpAuditPlanEntitlements {
  enabled: boolean;
  refreshCooldownDays: number;
  aiSummary: boolean;
  reviewThemes: boolean;
  scoreHistoryDays: number;
}

export interface GbpAuditResponse {
  audit: GbpAudit | null;
  status: 'ready' | 'processing' | 'failed' | 'none';
  stale?: boolean;
  cachedAt?: string;
  plan?: string;
  isFrozen?: boolean;
  planEntitlements?: GbpAuditPlanEntitlements;
}

export interface RefreshResponse {
  status: 'processing';
  message: string;
  jobId: string;
}

export interface HistoryResponse {
  history: { score: number; scrapedAt: string }[];
}

// ── API Calls ────────────────────────────────────────────────────────────────

export async function fetchGbpAudit(): Promise<GbpAuditResponse> {
  const res = await api.get<ApiResponse<GbpAuditResponse>>('/gbp-audit');
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.error?.message || 'Failed to load GBP audit');
  }
  return res.data.data;
}

export async function refreshGbpAudit(): Promise<RefreshResponse> {
  const res = await api.post<ApiResponse<RefreshResponse>>('/gbp-audit/refresh');
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.error?.message || 'Failed to start audit refresh');
  }
  return res.data.data;
}

export async function fetchGbpAuditHistory(): Promise<HistoryResponse> {
  const res = await api.get<ApiResponse<HistoryResponse>>('/gbp-audit/history');
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.error?.message || 'Failed to load audit history');
  }
  return res.data.data;
}

// ── Tone Profile Types ──────────────────────────────────────────────────────

export interface ToneProfile {
  dominantTone: string;
  commonPhrases: string[];
  keyEntities: string[];
  topKeywords: string[];
  avgReviewLength: number;
  writingStyle: string;
}

export interface NegativePatterns {
  recurringComplaints: string[];
  complaintFrequency: Record<string, number>;
  suggestedFixes: string[];
}

export interface OwnerReplyProfile {
  avgReplyLength: number;
  replyTone: string;
  bestReplySamples: string[];
}

export interface ReviewToneProfileData {
  _id: string;
  businessId: string;
  sampleReviews: { text: string; stars: number; publishedAt: string }[];
  toneProfile: ToneProfile;
  negativePatterns: NegativePatterns;
  ownerReplyProfile: OwnerReplyProfile;
  ratingDistribution: Record<string, number>;
  lastExtractedAt: string | null;
}

export interface ToneProfileResponse {
  profile: ReviewToneProfileData | null;
}

export async function fetchToneProfile(): Promise<ToneProfileResponse> {
  const res = await api.get<ApiResponse<ToneProfileResponse>>('/gbp-audit/tone-profile');
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.error?.message || 'Failed to load tone profile');
  }
  return res.data.data;
}
