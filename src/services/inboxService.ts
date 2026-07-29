import api, { type ApiResponse } from '../lib/api';

export interface FeedbackItem {
  _id: string;
  rating: number;
  tags: string[];
  note: string;
  aiDraftText: string;
  finalText: string;
  status: "draft" | "copied_to_google" | "resolved";
  createdAt: string;
  sessionId: string;
}

export interface InboxResponse {
  items: FeedbackItem[];
  total: number;
  page: number;
  totalPages: number;
  atRiskCount: number;
}

export interface InboxQueryParams {
  page: number;
  limit: number;
  sort: string;
  search?: string;
  rating?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const inboxService = {
  getInbox: async (params: InboxQueryParams): Promise<InboxResponse> => {
    const searchParams = new URLSearchParams();
    searchParams.set("page", String(params.page));
    searchParams.set("limit", String(params.limit));
    searchParams.set("sort", params.sort);
    
    if (params.search) searchParams.set("search", params.search);
    if (params.rating) searchParams.set("rating", params.rating);
    if (params.status) searchParams.set("status", params.status);
    if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
    if (params.dateTo) searchParams.set("dateTo", params.dateTo);

    const res = await api.get<ApiResponse<InboxResponse>>(`/inbox?${searchParams.toString()}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to load inbox");
    }
    return res.data.data;
  },

  resolveItem: async (id: string): Promise<void> => {
    const res = await api.patch(`/inbox/${id}/resolve`);
    if (!res.data.success) {
      throw new Error(res.data.error?.message || "Failed to resolve item");
    }
  },

  bulkResolve: async (ids: string[]): Promise<void> => {
    const res = await api.patch('/inbox/bulk-resolve', { ids });
    if (!res.data.success) {
      throw new Error(res.data.error?.message || "Failed to bulk resolve items");
    }
  },

  getReplySuggestion: async (id: string): Promise<string> => {
    const res = await api.post<ApiResponse<{ draft: string }>>(`/inbox/${id}/reply-suggestion`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to generate a reply");
    }
    return res.data.data.draft;
  }
};
