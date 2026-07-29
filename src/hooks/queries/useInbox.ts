import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inboxService, type InboxQueryParams } from '../../services/inboxService';
import { queryKeys } from '../../lib/queryKeys';

export function useInbox(params: InboxQueryParams) {
  return useQuery({
    queryKey: queryKeys.inbox.list(params.page, params.limit, {
      sort: params.sort,
      search: params.search,
      rating: params.rating,
      status: params.status,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }),
    queryFn: () => inboxService.getInbox(params),
  });
}

export function useResolveInboxItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => inboxService.resolveItem(id),
    onSuccess: () => {
      // Invalidate both inbox list and dashboard overview stats
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useBulkResolveInboxItems() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (ids: string[]) => inboxService.bulkResolve(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useInboxReplySuggestion() {
  return useMutation({
    mutationFn: (id: string) => inboxService.getReplySuggestion(id),
  });
}
