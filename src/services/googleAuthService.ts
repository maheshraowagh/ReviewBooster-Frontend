/**
 * googleAuthService.ts — Frontend client for Google OAuth & Gmail integration.
 */
import api, { type ApiResponse } from '../lib/api';

export interface GmailStatus {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
  reason?: string | null;
}

export async function getGoogleAuthUrl(): Promise<string> {
  const res = await api.get<ApiResponse<{ url: string }>>('/auth/google/url');
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.error?.message || 'Failed to get Google Auth URL');
  }
  return res.data.data.url;
}

export async function getGmailStatus(): Promise<GmailStatus> {
  const res = await api.get<ApiResponse<GmailStatus>>('/auth/google/status');
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.error?.message || 'Failed to get Gmail status');
  }
  return res.data.data;
}

export async function disconnectGmail(): Promise<void> {
  const res = await api.post<ApiResponse<{ message: string }>>('/auth/google/disconnect', {});
  if (!res.data.success) {
    throw new Error(res.data.error?.message || 'Failed to disconnect Gmail');
  }
}
