/**
 * Dashboard service — thin wrapper around API calls for the dashboard.
 *
 * These functions are consumed by React Query hooks (useDashboardOverview, etc.)
 * and should never be called directly from components.
 */
import api, { type ApiResponse } from '../lib/api';

// ---- Types (re-exported so hooks & components can import from one place) ----

export type Period = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

export interface TrendPoint {
  label: string;
  avgRating: number;
  count: number;
}

export interface OverviewData {
  period: string;
  scans: number;
  avgRating: number;
  googleClicks: number;
  atRiskCount: number;
  insight: string | null;
  ratingTrend: TrendPoint[];
  ratingDistribution: Record<string, number>;
  reviewVelocity: {
    thisWeek: number;
    lastWeek: number;
    weeklyAvgLast30Days: number;
    trend: 'up' | 'down' | 'stable';
  };
  businessName: string;
  businessCode: string;
}

// ---- API calls --------------------------------------------------------------

export async function fetchDashboardOverview(
  period: Period,
  startDate?: string,
  endDate?: string,
): Promise<OverviewData> {
  const params = new URLSearchParams({ period });
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  const res = await api.get<ApiResponse<OverviewData>>(`/dashboard/overview?${params.toString()}`);
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.error?.message || 'Failed to load dashboard data');
  }
  return res.data.data;
}
