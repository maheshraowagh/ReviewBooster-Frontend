import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { businessService, type Business } from '../../services/businessService';
import { queryKeys } from '../../lib/queryKeys';

export type { Business };

export function useCurrentBusiness() {
  return useQuery({
    queryKey: queryKeys.business.all,
    queryFn: () => businessService.getMe(),
  });
}

export function useUpdateMenuItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (menuItems: string[]) => businessService.updateMenuItems(menuItems),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.business.all, data);
    },
  });
}

export function useUpdateBusinessProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { contactEmail?: string; name?: string; city?: string; businessType?: string }) =>
      businessService.updateProfile(data),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.business.all, data);
    },
  });
}
