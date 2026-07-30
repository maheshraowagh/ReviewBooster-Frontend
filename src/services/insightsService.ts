import api, { type ApiResponse } from '../lib/api';

export type Period = 'week' | 'month' | 'year';

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

export interface SentimentData {
  period: string;
  overallTrend: TrendPoint[];
  topicBreakdown: TopicItem[];
  byRatingBand: Record<string, RatingBand>;
  totalFeedback: number;
}

export const insightsService = {

  getSentiment: async (period: Period): Promise<SentimentData> => {
    const res = await api.get<ApiResponse<SentimentData>>(`/dashboard/sentiment?period=${period}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to load sentiment data");
    }
    return res.data.data;
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
