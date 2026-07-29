import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { whatsappService } from '../../services/whatsappService';
import { queryKeys } from '../../lib/queryKeys';

export function useWhatsappStatusRaw() {
  return useQuery({
    queryKey: queryKeys.whatsapp.status(),
    queryFn: () => whatsappService.getStatusRaw(),
    retry: false, // Don't retry status checks on failure
    refetchInterval: 30000,
  });
}

export function useWhatsappStatus() {
  return useQuery({
    queryKey: ['whatsapp', 'status-string'],
    queryFn: () => whatsappService.getStatus(),
    retry: false,
  });
}

export function useWhatsappUsage() {
  return useQuery({
    queryKey: ['whatsapp', 'usage'],
    queryFn: () => whatsappService.getUsage(),
  });
}

export function useWhatsappMessages(page: number, limit: number = 10) {
  return useQuery({
    queryKey: ['whatsapp', 'messages', page, limit],
    queryFn: () => whatsappService.getMessages(page, limit),
  });
}

export function useWhatsappQr() {
  return useQuery({
    queryKey: ['whatsapp', 'qr'],
    queryFn: () => whatsappService.getQr(),
    retry: false,
  });
}

export function useConnectWhatsapp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => whatsappService.connect(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.whatsapp.all });
    },
  });
}

export function useDisconnectWhatsapp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => whatsappService.disconnect(),
    onSuccess: (data) => {
      // Optimistically set disconnected state — do NOT invalidate/refetch,
      // as Evolution may still report 'open' briefly after logout.
      queryClient.setQueryData(queryKeys.whatsapp.status(), (old: any) => ({
        ...old,
        status: 'disconnected',
        instance: data?.instance || { status: 'disconnected' },
      }));
    },
  });
}

export function usePauseMessaging() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => whatsappService.pauseMessaging(reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'usage'] });
    },
  });
}

export function useResumeMessaging() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => whatsappService.resumeMessaging(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'usage'] });
    },
  });
}

export function useSendReviewRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ phone, customerName }: { phone: string; customerName?: string }) => 
      whatsappService.sendReviewRequest(phone, customerName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'usage'] });
    },
  });
}

export function useSendTestMessage() {
  return useMutation({
    mutationFn: ({ phone, message }: { phone: string; message: string }) => 
      whatsappService.sendTestMessage(phone, message),
  });
}
