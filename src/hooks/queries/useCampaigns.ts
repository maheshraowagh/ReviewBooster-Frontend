import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignService } from '../../services/campaignService';
import { queryKeys } from '../../lib/queryKeys';
import { useSocket } from '../../providers/SocketProvider';

export function useCampaigns({
  page = 1,
  limit = 10,
  status = 'all',
}: { page?: number; limit?: number; status?: string } = {}) {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (data: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all });
      if (data.campaignId) {
        queryClient.invalidateQueries({ queryKey: ['campaign', data.campaignId] });
      }
    };
    socket.on('wa-campaign:update', handleUpdate);
    return () => {
      socket.off('wa-campaign:update', handleUpdate);
    };
  }, [socket, queryClient]);

  return useQuery({
    queryKey: queryKeys.campaigns.list(page, limit, status),
    queryFn: () => campaignService.getCampaigns({ page, limit, status }),
    refetchInterval: 30000,
  });
}

export function useCampaign(id: string, isRunning: boolean) {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !id) return;
    const handleUpdate = (data: any) => {
      if (data.campaignId === id) {
        queryClient.invalidateQueries({ queryKey: ['campaign', id] });
        queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all });
      }
    };
    socket.on('wa-campaign:update', handleUpdate);
    return () => {
      socket.off('wa-campaign:update', handleUpdate);
    };
  }, [socket, queryClient, id]);

  return useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignService.getCampaign(id),
    enabled: !!id && isRunning,
    refetchInterval: 30000,
  });
}

export function useRecipients(id: string, page: number) {
  return useQuery({
    queryKey: ['campaign', id, 'recipients', page],
    queryFn: () => campaignService.getRecipients(id, page),
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; templateKey: string; recipients: any[] }) => campaignService.createCampaign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all });
    },
  });
}

export function useCampaignAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'start' | 'pause' | 'resume' | 'cancel' }) => campaignService.campaignAction(id, action),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all });
      queryClient.invalidateQueries({ queryKey: ['campaign', variables.id] });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => campaignService.deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all });
    },
  });
}

export function useBulkDeleteCampaigns() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => campaignService.bulkDeleteCampaigns(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all });
    },
  });
}

export function useImportCsv() {
  return useMutation({
    mutationFn: (file: File) => campaignService.importCsv(file),
  });
}

export function useValidateManual() {
  return useMutation({
    mutationFn: (numbers: string[]) => campaignService.validateManual(numbers),
  });
}
