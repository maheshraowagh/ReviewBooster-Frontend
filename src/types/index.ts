/**
 * Shared TypeScript types for the ReviewBoost frontend.
 * Mirrors the backend models.
 */

export type UserRole = "owner" | "staff" | "admin";

export interface AdminUserBusiness {
  _id: string;
  name: string;
  businessCode: string;
  plan: string;
  planStatus: string;
  whatsappMsgQuota: number;
  whatsappMsgUsed: number;
  razorpaySubscriptionId?: string | null;
}

export interface AppUser {
  _id: string;
  clerkUserId: string;
  email: string;
  name: string;
  role: UserRole;
  businessId: string | AdminUserBusiness | null;
  createdAt: string;
}

export interface Business {
  _id: string;
  ownerId: string;
  name: string;
  businessType: string;
  businessCode: string;
  googleReviewUrl: string;
  logoUrl: string;
  timezone: string;
  city: string;
  isActive: boolean;
  menuItems: string[];
  plan?: string;
  planStatus?: string;
  whatsappMsgQuota?: number;
  whatsappMsgUsed?: number;
  razorpaySubscriptionId?: string | null;
  contactEmail?: string;
  gmailConnected?: boolean;
  gmailEmail?: string | null;
  gmailConnectedAt?: string | null;
  createdAt: string;
}

