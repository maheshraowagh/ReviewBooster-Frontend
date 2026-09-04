import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { insightsService, type Period } from '../../services/insightsService';
import { queryKeys } from '../../lib/queryKeys';


export function useSentimentData(period: Period, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: queryKeys.insights.stats(`sentiment-${period}`, startDate, endDate),
    queryFn: () => insightsService.getSentiment(period, startDate, endDate),
    enabled: period !== 'custom' || (Boolean(startDate) && Boolean(endDate)),
  });
}

export function useSentimentCompare(period: Period, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: queryKeys.insights.stats(`sentiment-compare-${period}`, startDate, endDate),
    queryFn: () => insightsService.getSentimentCompare(period, startDate, endDate),
    enabled: period !== 'custom' || (Boolean(startDate) && Boolean(endDate)),
  });
}

export function useReviewVelocity() {
  return useQuery({
    queryKey: queryKeys.insights.stats('review-velocity'),
    queryFn: () => insightsService.getReviewVelocity(),
  });
}

export function useAtRiskData() {
  return useQuery({
    queryKey: queryKeys.insights.stats('at-risk'),
    queryFn: () => insightsService.getAtRisk(),
  });
}

export function useHandleAtRiskCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, recoveryNote, recoveryStatus }: { id: string, recoveryNote?: string, recoveryStatus?: 'handled' | 'unhandled' }) => 
      insightsService.handleAtRiskCustomer(id, recoveryNote, recoveryStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.insights.stats('at-risk') });
    },
  });
}
