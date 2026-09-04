import api, { type ApiResponse } from '../lib/api';

export type Period = 'week' | 'month' | 'year' | 'custom';

export interface AtRiskCustomer {
  feedbackId: string;
  rating: number;
  tags: string[];
  note: string;
  createdAt: string;
  daysSince: number;
  recoveryStatus: 'unhandled' | 'handled';
  recoveryNote: string;
  recoveryHandledAt: string | null;
}

export interface AtRiskData {
  atRiskList: AtRiskCustomer[];
  count: number;
  businessType: string;
}

export interface TrendPoint {
  date: string;
  label: string;
  positiveCount: number;
  negativeCount: number;
  avgRating: number;
  feedbackCount: number;
}

export interface TopicItem {
  tag: string;
  sentiment: 'positive' | 'negative';
  count: number;
  prevCount: number;
  pctPositive: number;
}

export interface RatingBand {
  min: number;
  max: number;
  count: number;
  pct: number;
}

export interface PreviousPeriodData {
  totalFeedback: number;
  positiveRate: number;
  averageRating: number;
}

export interface SentimentData {
  period: string;
  overallTrend: TrendPoint[];
  topicBreakdown: TopicItem[];
  byRatingBand: Record<string, RatingBand>;
  totalFeedback: number;
}

export interface SentimentCompareResponse {
  current: SentimentData;
  previous: PreviousPeriodData;
}

export interface ReviewVelocityData {
  thisWeek: number;
  lastWeek: number;
  weeklyAvgLast30Days: number;
  trend: 'up' | 'down' | 'stable';
}

export const insightsService = {

  getSentiment: async (period: Period, startDate?: string, endDate?: string): Promise<SentimentData> => {
    const params = new URLSearchParams({ period });
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    const res = await api.get<ApiResponse<SentimentData>>(`/dashboard/sentiment?${params.toString()}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to load sentiment data");
    }
    return res.data.data;
  },

  getSentimentCompare: async (period: Period, startDate?: string, endDate?: string): Promise<SentimentCompareResponse> => {
    const params = new URLSearchParams({ period });
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    const res = await api.get<ApiResponse<SentimentCompareResponse>>(`/dashboard/sentiment-compare?${params.toString()}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to load sentiment comparison data");
    }
    return res.data.data;
  },

  getReviewVelocity: async (): Promise<ReviewVelocityData> => {
    const res = await api.get<ApiResponse<{ reviewVelocity: ReviewVelocityData }>>('/dashboard/overview?period=week');
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to load review velocity");
    }
    return res.data.data.reviewVelocity;
  },

  getAtRisk: async (): Promise<AtRiskData> => {
    const res = await api.get<ApiResponse<AtRiskData>>('/dashboard/at-risk');
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to load at-risk customers");
    }
    return res.data.data;
  },

  handleAtRiskCustomer: async (id: string, recoveryNote?: string, recoveryStatus: 'handled' | 'unhandled' = 'handled') => {
    const res = await api.patch<ApiResponse<any>>(`/dashboard/at-risk/${id}/handle`, {
      recoveryNote,
      recoveryStatus,
    });
    if (!res.data.success) {
      throw new Error(res.data.error?.message || "Failed to update status");
    }
    return res.data.data;
  },
};
