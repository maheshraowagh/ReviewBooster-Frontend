import api from "./api";
import { AppUser, Business } from "../types";

export interface AdminStats {
  totalUsers: number;
  totalBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  totalFeedback: number;
  todayReviews: number;
  totalQRCodeScans: number;
  averagePlatformRating: number;
  googleRedirects: number;
  activeSubscriptions: number;
  periodRevenuePaise: number;
  lifetimeRevenuePaise: number;
  todayRevenuePaise: number;
  successfulPayments: number;
  reviewTrend: Array<{
    date: string;
    reviews: number;
    averageRating: number;
  }>;
  revenueTrend: Array<{
    date: string;
    revenuePaise: number;
    payments: number;
  }>;
  recentPayments: Array<{
    paymentId: string;
    amountPaidPaise: number;
    currency: string;
    revenueDate: string;
    plan: string;
    businessId: string;
    businessName: string;
    businessCode: string;
  }>;
  appliedFilters: {
    range: AdminStatsRange;
    from: string | null;
    to: string | null;
    businessId: string | null;
    plan: string | null;
    timezone: string;
  };
  filterOptions: {
    businesses: Array<{
      id: string;
      name: string;
      businessCode: string;
      plan: string;
    }>;
    plans: string[];
  };
}

export type AdminStatsRange =
  | "today"
  | "7d"
  | "30d"
  | "this_month"
  | "all"
  | "custom";

export interface AdminStatsFilters {
  range: AdminStatsRange;
  businessId?: string;
  plan?: string;
  from?: string;
  to?: string;
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

export interface AdminFeatureRequest {
  _id: string;
  userId: string;
  businessId: { _id: string; name: string; businessCode: string } | null;
  title: string;
  category: string;
  description: string;
  upvotes: string[];
  status: 'pending' | 'in-review' | 'planned' | 'completed' | 'declined';
  adminNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminFeatureRequestsResponse extends PaginatedResponse<AdminFeatureRequest> {
  statusCounts: Record<string, number>;
}

export const adminApi = {
  getStats: (filters: AdminStatsFilters = { range: "30d" }) => {
    const params = new URLSearchParams({ range: filters.range });
    if (filters.businessId) params.set("businessId", filters.businessId);
    if (filters.plan) params.set("plan", filters.plan);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    return api.get<{ success: boolean; data: AdminStats }>(
      `/admin/stats?${params.toString()}`,
    );
  },

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

  updateBusinessPlan: (
    id: string,
    data: { plan?: string; planStatus?: string; forceOverride?: boolean }
  ) =>
    api.patch<{ success: boolean; data: { business: AdminBusiness } }>(
      `/admin/businesses/${id}/plan`,
      data
    ),

  getBusinessReport: (id: string) =>
    api.get<{ success: boolean; data: MonthlyReport }>(
      `/admin/businesses/${id}/report`
    ),

  getUsers: (page = 1, limit = 10, search = "", plan = "") => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    if (plan) params.set("plan", plan);
    return api.get<{ success: boolean; data: PaginatedResponse<AppUser> }>(
      `/admin/users?${params.toString()}`
    );
  },

  getActivity: (page = 1, limit = 20) =>
    api.get<{ success: boolean; data: PaginatedResponse<AuditLogEntry> }>(
      `/admin/activity?page=${page}&limit=${limit}`
    ),

  getFeatureRequests: (page = 1, limit = 20, status = "", search = "") => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    return api.get<{ success: boolean; data: AdminFeatureRequestsResponse }>(
      `/admin/feature-requests?${params.toString()}`
    );
  },

  updateFeatureRequest: (id: string, data: { status?: string; adminNote?: string }) =>
    api.patch<{ success: boolean; data: AdminFeatureRequest }>(
      `/admin/feature-requests/${id}`,
      data
    ),
};
