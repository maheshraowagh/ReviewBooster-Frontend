import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';

export interface FeatureRequestItem {
  _id: string;
  title: string;
  category: string;
  description: string;
  upvotes: string[];
  status: 'pending' | 'in-review' | 'planned' | 'completed' | 'declined';
  createdAt: string;
}

export interface CreateFeatureRequestPayload {
  title: string;
  category: string;
  description: string;
}

export function useFeatureRequests() {
  return useQuery<FeatureRequestItem[]>({
    queryKey: queryKeys.featureRequests.mine(),
    queryFn: async () => {
      const res = await api.get('/feature-requests');
      if (res.data?.success) {
        return res.data.data.myRequests || [];
      }
      return [];
    },
  });
}

export function useCreateFeatureRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateFeatureRequestPayload) => {
      const res = await api.post('/feature-requests', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.featureRequests.all });
    },
  });
}

export function useUpvoteFeatureRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/feature-requests/${id}/upvote`);
      return res.data?.data as FeatureRequestItem;
    },
    onSuccess: (updatedItem) => {
      if (!updatedItem) return;
      queryClient.setQueryData<FeatureRequestItem[]>(
        queryKeys.featureRequests.mine(),
        (old) => {
          if (!old) return [updatedItem];
          return old.map((item) => (item._id === updatedItem._id ? updatedItem : item));
        }
      );
    },
  });
}
