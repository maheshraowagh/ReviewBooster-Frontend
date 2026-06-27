/**
 * Shared TypeScript types for the ReviewBoost frontend.
 * Mirrors the backend models.
 */

export type UserRole = 'owner' | 'staff' | 'admin';

export interface AppUser {
  _id: string;
  clerkUserId: string;
  email: string;
  name: string;
  role: UserRole;
  businessId: string | null;
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
  createdAt: string;
}
