/**
 * React Query hooks for GBP Health Audit data.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { fetchGbpAudit, refreshGbpAudit, fetchToneProfile } from '../../services/gbpAuditService';

export function useGbpAudit() {
  return useQuery({
    queryKey: queryKeys.gbpAudit.current(),
    queryFn: fetchGbpAudit,
    staleTime: 5 * 60_000, // 5 minutes — data rarely changes
    refetchOnWindowFocus: false,
  });
}

export function useRefreshGbpAudit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: refreshGbpAudit,
    onSuccess: () => {
      // Invalidate immediately so GET /api/gbp-audit reflects processing state
      queryClient.invalidateQueries({ queryKey: queryKeys.gbpAudit.all });
    },
  });
}

export function useToneProfile() {
  return useQuery({
    queryKey: queryKeys.gbpAudit.toneProfile(),
    queryFn: fetchToneProfile,
    staleTime: 30 * 60_000, // 30 minutes — tone profile rarely changes
    refetchOnWindowFocus: false,
  });
}
