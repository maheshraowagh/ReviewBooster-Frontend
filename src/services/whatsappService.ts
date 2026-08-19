import api, { type ApiResponse } from '../lib/api';

export interface WhatsappInstance {
  _id: string;
  businessId: string;
  instanceName: string;
  provider: string;
  mode: string;
  status: 'pending' | 'connecting' | 'qr_generated' | 'connected' | 'disconnected' | 'error';
  connectedPhone: string;
  connectedAt: string | null;
  firstConnectedAt: string | null;
  messagingPausedAt: string | null;
  messagingPauseReason: string | null;
}

export interface StatusResponse {
  status: string;
  instance: WhatsappInstance | null;
  liveStatus?: any;
}

export interface ConnectResponse {
  qr?: { base64?: string; code?: string; pairingCode?: string };
  instance: WhatsappInstance;
  message?: string;
}

export interface UsageData {
  configured: boolean;
  status?: string;
  provider?: string;
  messagingPaused?: boolean;
  messagingPauseReason?: string;
  plan?: string;
  planDisplayName?: string;
  warming?: { ageDays: number; warmupComplete: boolean; currentWarmupLimit: number | null };
  daily?: { sentToday: number; failedToday: number; limit: number; remaining: number };
  monthly?: { used: number; limit: number; remaining: number };
  quietHours?: { isQuiet: boolean; currentHour: number; nextAllowedHour: number };
}

export interface MessageLogEntry {
  _id: string;
  messageType: string;
  message: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedReason: string | null;
  providerMessageId: string | null;
  customerId?: { name: string; phoneNormalized: string } | null;
}

export const whatsappService = {
  getStatusRaw: async (): Promise<StatusResponse> => {
    const res = await api.get<ApiResponse<StatusResponse>>('/whatsapp/status');
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to get status');
    }
    return res.data.data;
  },
  getStatus: async (): Promise<string> => {
    const data = await whatsappService.getStatusRaw();
    const state = data.liveStatus?.instance?.state || data.liveStatus?.state || data.status || 'disconnected';
    return state;
  },
  getUsage: async (): Promise<UsageData> => {
    const res = await api.get<ApiResponse<UsageData>>('/whatsapp/usage');
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to get usage');
    }
    return res.data.data;
  },
  getMessages: async (page = 1, limit = 10): Promise<{ messages: MessageLogEntry[]; total: number }> => {
    const res = await api.get<ApiResponse<{ messages: MessageLogEntry[]; pagination: { total: number } }>>(
      `/whatsapp/messages?page=${page}&limit=${limit}`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to get messages');
    }
    return { messages: res.data.data.messages, total: res.data.data.pagination.total };
  },
  getQr: async (): Promise<{ qr?: { base64?: string }; needsQr: boolean }> => {
    const res = await api.get<ApiResponse<{ qr?: { base64?: string }; needsQr: boolean }>>('/whatsapp/qr');
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to get QR');
    }
    return res.data.data;
  },
  connect: async (): Promise<ConnectResponse> => {
    const res = await api.post<ApiResponse<ConnectResponse>>('/whatsapp/connect');
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to connect');
    }
    return res.data.data;
  },
  disconnect: async (): Promise<{ instance: WhatsappInstance }> => {
    const res = await api.post<ApiResponse<{ instance: WhatsappInstance }>>('/whatsapp/disconnect');
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to disconnect');
    }
    return res.data.data;
  },
  pauseMessaging: async (reason?: string): Promise<void> => {
    const res = await api.post<ApiResponse<any>>('/whatsapp/pause', { reason });
    if (!res.data.success) {
      throw new Error(res.data.error?.message || 'Failed to pause messaging');
    }
  },
  resumeMessaging: async (): Promise<void> => {
    const res = await api.post<ApiResponse<any>>('/whatsapp/resume');
    if (!res.data.success) {
      throw new Error(res.data.error?.message || 'Failed to resume messaging');
    }
  },
  sendReviewRequest: async (phone: string, customerName?: string): Promise<{ messageLogId: string }> => {
    const res = await api.post<ApiResponse<{ messageLogId: string }>>('/whatsapp/send-review-request', { phone, customerName });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to send review request');
    }
    return res.data.data;
  },
  sendTestMessage: async (phone: string, message: string): Promise<{ message: string }> => {
    const res = await api.post<ApiResponse<{ message: string }>>('/whatsapp/send-test', { phone, message });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to send test message');
    }
    return res.data.data;
  },
};
