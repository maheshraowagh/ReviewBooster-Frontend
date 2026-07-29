import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailCampaignService, type Recipient } from '../../services/emailCampaignService';
import { useSocket } from '../../providers/SocketProvider';

export function useEmailCampaigns() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      if (data.campaignId) {
        queryClient.invalidateQueries({ queryKey: ['email-campaign', data.campaignId] });
      }
    };
    socket.on('email-campaign:update', handleUpdate);
    return () => {
      socket.off('email-campaign:update', handleUpdate);
    };
  }, [socket, queryClient]);

  return useQuery({
    queryKey: ['email-campaigns'],
    queryFn: () => emailCampaignService.getCampaigns(),
    refetchInterval: 30000,
  });
}

export function useEmailCampaign(id: string) {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !id) return;
    const handleUpdate = (data: any) => {
      if (data.campaignId === id) {
        queryClient.invalidateQueries({ queryKey: ['email-campaign', id] });
        queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      }
    };
    socket.on('email-campaign:update', handleUpdate);
    return () => {
      socket.off('email-campaign:update', handleUpdate);
    };
  }, [socket, queryClient, id]);

  return useQuery({
    queryKey: ['email-campaign', id],
    queryFn: () => emailCampaignService.getCampaign(id),
    enabled: !!id,
    refetchInterval: 30000,
  });
}

export function useEmailCampaignImportCsv() {
  return useMutation({
    mutationFn: ({ file, googleSheetUrl, manualList }: { file?: File; googleSheetUrl?: string; manualList?: string }) => 
      emailCampaignService.importCsv(file, googleSheetUrl, manualList),
  });
}

export function useCreateEmailCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; emailSubject: string; recipients: Recipient[] }) => 
      emailCampaignService.createCampaign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
    },
  });
}

export function useEmailCampaignAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'start' | 'pause' }) => 
      emailCampaignService.campaignAction(id, action),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['email-campaign', variables.id] });
    },
  });
}
