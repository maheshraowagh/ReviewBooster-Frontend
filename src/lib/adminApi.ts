import api from "./api";
import { AppUser, Business } from "../types";

export interface AdminStats {
  totalUsers: number;
  totalBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  totalFeedback: number;
  totalQRCodeScans: number;
  averagePlatformRating: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export interface AdminBusiness extends Omit<Business, 'ownerId'> {
  ownerId: {
    _id: string;
    name: string;
    email: string;
  };
}

export const adminApi = {
  getStats: () => api.get<{ success: boolean; data: AdminStats }>("/admin/stats"),
  
  getBusinesses: (page = 1, limit = 10, search = "") => 
    api.get<{ success: boolean; data: PaginatedResponse<AdminBusiness> }>(`/admin/businesses?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`),
  
  updateBusinessStatus: (id: string, isActive: boolean) => 
    api.patch<{ success: boolean; data: { business: AdminBusiness } }>(`/admin/businesses/${id}/status`, { isActive }),
    
  getUsers: (page = 1, limit = 10, search = "") => 
    api.get<{ success: boolean; data: PaginatedResponse<AppUser> }>(`/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`),
};
