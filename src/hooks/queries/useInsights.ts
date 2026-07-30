import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { insightsService, type Period } from '../../services/insightsService';
import { queryKeys } from '../../lib/queryKeys';


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
