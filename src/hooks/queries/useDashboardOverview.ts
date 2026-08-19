/**
 * React Query hook for dashboard overview data.
 *
 * Replaces the manual useState/useEffect/useCallback pattern in DashboardPage
 * with automatic caching, retry, stale-while-revalidate, and devtools support.
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { fetchDashboardOverview, type Period } from '../../services/dashboardService';

export function useDashboardOverview(period: Period, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: queryKeys.dashboard.overview(period, startDate, endDate),
    queryFn: () => fetchDashboardOverview(period, startDate, endDate),
    staleTime: 60_000,        // 1 minute before refetch
    enabled: period !== 'custom' || (Boolean(startDate) && Boolean(endDate)),
    placeholderData: (prev) => prev, // keep previous data while switching periods (no flash)
  });
}
