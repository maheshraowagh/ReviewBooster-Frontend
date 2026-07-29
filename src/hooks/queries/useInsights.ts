import { useQuery } from '@tanstack/react-query';
import { insightsService, type Period } from '../../services/insightsService';
import { queryKeys } from '../../lib/queryKeys';

export function useInsightsData(period: Period) {
  return useQuery({
    queryKey: queryKeys.insights.stats(`insights-${period}`),
    queryFn: () => insightsService.getInsights(period),
  });
}

export function useSentimentData(period: Period) {
  return useQuery({
    queryKey: queryKeys.insights.stats(`sentiment-${period}`),
    queryFn: () => insightsService.getSentiment(period),
  });
}

export function useAtRiskData() {
  return useQuery({
    queryKey: queryKeys.insights.stats('at-risk'),
    queryFn: () => insightsService.getAtRisk(),
  });
}
