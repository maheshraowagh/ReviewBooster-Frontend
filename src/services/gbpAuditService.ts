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

export interface GbpAuditResponse {
  audit: GbpAudit | null;
  status: 'ready' | 'processing' | 'failed' | 'none';
  stale?: boolean;
  cachedAt?: string;
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
