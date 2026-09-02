import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGmailStatus, disconnectGmail, type GmailStatus } from '../../services/googleAuthService';
import { queryKeys } from '../../lib/queryKeys';

export function useGmailStatus() {
  return useQuery<GmailStatus>({
    queryKey: queryKeys.googleAuth.status(),
    queryFn: () => getGmailStatus(),
  });
}

export function useDisconnectGmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => disconnectGmail(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.googleAuth.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.business.all });
    },
  });
}
