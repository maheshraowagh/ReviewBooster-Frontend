import api, { type ApiResponse } from '../lib/api';

export interface Business {
  _id: string;
  name: string;
  businessCode: string;
  logoUrl?: string;
  businessType?: string;
  menuItems?: string[];
  contactEmail?: string;
  googleReviewUrl?: string;
  googleReviewLink?: string;
  gmailConnected?: boolean;
  gmailEmail?: string | null;
  gmailConnectedAt?: string | null;
}


export const businessService = {
  getMe: async (): Promise<Business> => {
    const res = await api.get<ApiResponse<Business>>('/business/me');
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to load business data');
    }
    return res.data.data;
  },
  
  updateMenuItems: async (menuItems: string[]): Promise<Business> => {
    const res = await api.patch<ApiResponse<Business>>('/business/menu-items', { menuItems });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to save menu items');
    }
    return res.data.data;
  },

  updateProfile: async (data: { contactEmail?: string; name?: string; city?: string; businessType?: string }): Promise<Business> => {
    const res = await api.patch<ApiResponse<Business>>('/business/profile', data);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to update business profile');
    }
    return res.data.data;
  }
};
