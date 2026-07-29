import api, { type ApiResponse } from '../lib/api';

export type Period = 'week' | 'month' | 'year';

export interface TagData {
  tag: string;
  currentCount: number;
  previousPeriodCount: number;
  delta: number;
  sentiment: 'positive' | 'negative';
}

export interface InsightsData {
  period: string;
  tagList: TagData[];
}

export interface AtRiskCustomer {
  feedbackId: string;
  rating: number;
  tags: string[];
  note: string;
  createdAt: string;
  daysSince: number;
}

export interface AtRiskData {
  atRiskList: AtRiskCustomer[];
  count: number;
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
  getInsights: async (period: Period): Promise<InsightsData> => {
    const res = await api.get<ApiResponse<InsightsData>>(`/dashboard/insights?period=${period}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to load insights");
    }
    return res.data.data;
  },

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
};
