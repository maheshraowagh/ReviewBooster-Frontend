import api, { type ApiResponse } from '../lib/api';

export interface Recipient { email: string; name: string; }

export interface ValidationResult {
  valid: Recipient[];
  skipped: { row?: number; email?: string; reason: string }[];
  errors:  { row?: number; email?: string; reason: string }[];
  totalRows: number;
  source: string;
}

export interface EmailCampaign {
  _id: string;
  name: string;
  emailSubject: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  totalRecipients: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  pendingCount: number;
  sendingConfig?: { provider: 'platform' | 'gmail'; fromEmail?: string; fromName?: string };
  templateConfig?: { templateKey: string; greeting?: string; customMessage?: string; buttonText?: string };
  createdAt: string;
  completedAt?: string;
  pauseReason?: string;
}

export interface DetailRecipient {
  _id: string;
  email: string;
  status: string;
  customerId?: { name?: string; email?: string };
  sentAt?: string;
  failedAt?: string;
  lastError?: string;
}

export interface EmailCampaignDetail {
  campaign: EmailCampaign;
  statusBreakdown: Record<string, number>;
  recipients: DetailRecipient[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const emailCampaignService = {
  getCampaigns: async ({
    page = 1,
    limit = 10,
    status,
  }: { page?: number; limit?: number; status?: string } = {}): Promise<{ campaigns: EmailCampaign[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (status && status !== 'all') params.set('status', status);

    const res = await api.get<ApiResponse<{ campaigns: EmailCampaign[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>>(`/email-campaigns?${params.toString()}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to load email campaigns');
    }
    return {
      campaigns: res.data.data.campaigns,
      pagination: res.data.data.pagination,
    };
  },

  getCampaign: async (id: string): Promise<EmailCampaignDetail> => {
    const res = await api.get<ApiResponse<EmailCampaignDetail>>(`/email-campaigns/${id}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to load email campaign');
    }
    return res.data.data;
  },

  importCsv: async (file?: File, googleSheetUrl?: string, manualList?: string, manualRecipients?: { name: string; email: string }[]): Promise<ValidationResult> => {
    let res;
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      res = await api.post<ApiResponse<ValidationResult>>('/email-campaigns/import-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } else {
      res = await api.post<ApiResponse<ValidationResult>>('/email-campaigns/import-csv', { googleSheetUrl, manualList, manualRecipients });
    }
    
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Import failed');
    }
    return res.data.data;
  },

  createCampaign: async (data: {
    name: string;
    emailSubject: string;
    recipients: Recipient[];
    provider?: 'platform' | 'gmail';
    templateKey?: string;
    greeting?: string;
    customMessage?: string;
    buttonText?: string;
    replyTo?: string;
  }): Promise<{ campaign: EmailCampaign }> => {
    const res = await api.post<ApiResponse<{ campaign: EmailCampaign }>>('/email-campaigns', data);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to create campaign');
    }
    return res.data.data;
  },

  campaignAction: async (id: string, action: 'start' | 'pause'): Promise<void> => {
    const res = await api.post<ApiResponse<any>>(`/email-campaigns/${id}/${action}`);
    if (!res.data.success) {
      throw new Error(res.data.error?.message || `Failed to ${action} campaign`);
    }
  },
};

