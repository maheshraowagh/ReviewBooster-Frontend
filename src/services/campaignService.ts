import api, { type ApiResponse } from '../lib/api';

export interface CampaignSummary {
  _id: string;
  name: string;
  templateKey: string;
  status: string;
  totalRecipients: number;
  pendingCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  pausedAt: string | null;
  pauseReason: string | null;
}

export interface CampaignPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Recipient {
  _id: string;
  phoneNormalized: string;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  lastError: string | null;
  skipReason: string | null;
  retryCount: number;
  customerId?: { name: string; phoneNormalized: string } | null;
}

export interface CsvPreview {
  totalRows: number;
  valid: number;
  skipped: number;
  invalid: number;
  duplicate: number;
  validRecords: { phoneNormalized: string; name: string; customerId: string | null; isNew: boolean }[];
  reasons: { row: number; phone: string; reason: string }[];
}

export const campaignService = {
  getCampaigns: async ({
    page = 1,
    limit = 10,
    status,
  }: { page?: number; limit?: number; status?: string } = {}): Promise<{ campaigns: CampaignSummary[]; pagination: CampaignPagination }> => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (status && status !== 'all') params.set('status', status);

    const res = await api.get<ApiResponse<{ campaigns: CampaignSummary[]; pagination: CampaignPagination }>>(`/campaigns?${params.toString()}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to load campaigns');
    }
    return {
      campaigns: res.data.data.campaigns,
      pagination: res.data.data.pagination,
    };
  },

  getCampaign: async (id: string): Promise<CampaignSummary> => {
    const res = await api.get<ApiResponse<{ campaign: CampaignSummary }>>(`/campaigns/${id}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to load campaign');
    }
    return res.data.data.campaign;
  },

  getRecipients: async (id: string, page: number = 1, limit: number = 20): Promise<{ recipients: Recipient[]; total: number }> => {
    const res = await api.get<ApiResponse<{ recipients: Recipient[]; pagination: { total: number } }>>(`/campaigns/${id}/recipients?page=${page}&limit=${limit}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to load recipients');
    }
    return {
      recipients: res.data.data.recipients,
      total: res.data.data.pagination.total,
    };
  },

  importCsv: async (file: File): Promise<CsvPreview> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<ApiResponse<CsvPreview>>('/campaigns/import-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Upload failed');
    }
    return res.data.data;
  },

  validateManual: async (numbers: string[]): Promise<CsvPreview> => {
    const res = await api.post<ApiResponse<CsvPreview>>('/campaigns/validate-manual', { numbers });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Validation failed');
    }
    return res.data.data;
  },

  createCampaign: async (data: { name: string; templateKey: string; recipients: any[] }): Promise<CampaignSummary> => {
    const res = await api.post<ApiResponse<{ campaign: CampaignSummary }>>('/campaigns', data);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to create campaign');
    }
    return res.data.data.campaign;
  },

  campaignAction: async (id: string, action: 'start' | 'pause' | 'resume' | 'cancel'): Promise<CampaignSummary> => {
    const res = await api.post<ApiResponse<{ campaign: CampaignSummary }>>(`/campaigns/${id}/${action}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || `Failed to ${action} campaign`);
    }
    return res.data.data.campaign;
  },

  deleteCampaign: async (id: string): Promise<void> => {
    const res = await api.delete<ApiResponse<any>>(`/campaigns/${id}`);
    if (!res.data.success) {
      throw new Error(res.data.error?.message || 'Failed to delete campaign');
    }
  },

  bulkDeleteCampaigns: async (ids: string[]): Promise<void> => {
    const res = await api.post<ApiResponse<any>>('/campaigns/bulk-delete', { ids });
    if (!res.data.success) {
      throw new Error(res.data.error?.message || 'Failed to bulk delete campaigns');
    }
  },
};
