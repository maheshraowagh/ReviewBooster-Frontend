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

export interface AdminBusiness extends Omit<Business, "ownerId"> {
  ownerId: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface AdminBusinessStats {
  feedbackCount: number;
  qrScans: number;
  copiedToGoogle: number;
  averageRating: number;
}

export interface AdminBusinessDetail {
  business: AdminBusiness;
  stats: AdminBusinessStats;
}

export interface MonthlyReportMonth {
  month: string; // "YYYY-MM"
  scans: number;
  feedbackCount: number;
  googleClicks: number;
  avgRating: number;
  isCurrentMonth?: boolean;
}

export interface MonthlyReportTotals {
  scans: number;
  feedbackCount: number;
  googleClicks: number;
}

export interface MonthlyReport {
  business: {
    name: string;
    businessCode: string;
    businessType: string;
    owner: { name: string; email: string } | null;
  };
  months: MonthlyReportMonth[];
  totals: MonthlyReportTotals;
}

export interface AuditLogEntry {
  _id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: {
    businessName?: string;
    businessCode?: string;
    previousStatus?: boolean;
    newStatus?: boolean;
    [key: string]: unknown;
  };
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  actorUserId: { _id: string; name: string; email: string } | null;
  businessId: { _id: string; name: string; businessCode: string } | null;
}

export const adminApi = {
  getStats: () =>
    api.get<{ success: boolean; data: AdminStats }>("/admin/stats"),

  getBusinesses: (page = 1, limit = 10, search = "") =>
    api.get<{ success: boolean; data: PaginatedResponse<AdminBusiness> }>(
      `/admin/businesses?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`
    ),

  getBusiness: (id: string) =>
    api.get<{ success: boolean; data: AdminBusinessDetail }>(
      `/admin/businesses/${id}`
    ),

  updateBusinessStatus: (id: string, isActive: boolean) =>
    api.patch<{ success: boolean; data: { business: AdminBusiness } }>(
      `/admin/businesses/${id}/status`,
      { isActive }
    ),

  getBusinessReport: (id: string) =>
    api.get<{ success: boolean; data: MonthlyReport }>(
      `/admin/businesses/${id}/report`
    ),

  getUsers: (page = 1, limit = 10, search = "") =>
    api.get<{ success: boolean; data: PaginatedResponse<AppUser> }>(
      `/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`
    ),

  getActivity: (page = 1, limit = 20) =>
    api.get<{ success: boolean; data: PaginatedResponse<AuditLogEntry> }>(
      `/admin/activity?page=${page}&limit=${limit}`
    ),
};
