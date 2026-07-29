/**
 * React Query hook for dashboard overview data.
 *
 * Replaces the manual useState/useEffect/useCallback pattern in DashboardPage
 * with automatic caching, retry, stale-while-revalidate, and devtools support.
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { fetchDashboardOverview, type Period } from '../../services/dashboardService';

export function useDashboardOverview(period: Period) {
  return useQuery({
    queryKey: queryKeys.dashboard.overview(period),
    queryFn: () => fetchDashboardOverview(period),
    staleTime: 60_000,        // 1 minute before refetch
    placeholderData: (prev) => prev, // keep previous data while switching periods (no flash)
  });
}
