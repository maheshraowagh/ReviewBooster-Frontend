import api, { type ApiResponse } from '../lib/api';

export interface PlanEntitlements {
  campaigns: boolean;
  whatsappMsgQuota: number;
  maxLocations: number;
  insights: boolean;
  advancedAnalytics: boolean;
}

export interface PlanDefinition {
  id: string;
  name: string;
  displayName: string;
  priceInr: number | null;
  billing: string;
  entitlements: PlanEntitlements;
  checkoutAvailable: boolean;
}

export interface Invoice {
  _id: string;
  plan: string;
  status: string;
  razorpayPaymentId: string | null;
  amountPaidPaise: number;
  currency: string;
  paidAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  webhookEvent: string | null;
  createdAt: string;
  invoiceUrl: string | null;
}

export interface SubscriptionState {
  plan: string;
  planStatus: string;
  pendingPlan: string | null;
  cancelAtPeriodEnd: boolean;
  razorpaySubscriptionId: string | null;
  whatsappMsgQuota: number;
  whatsappMsgUsed: number;
  planCurrentPeriodStart: string | null;
  planCurrentPeriodEnd: string | null;
  invoices: Invoice[];
}

export interface RazorpaySubscriptionCheckoutResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

export interface CheckoutVerificationResult {
  status: 'processed' | 'duplicate' | 'pending' | 'ignored';
  plan?: string;
  planStatus?: string;
  paymentStatus?: string;
  subscriptionStatus?: string;
}

export const billingService = {
  getSubscription: async (): Promise<SubscriptionState> => {
    const res = await api.get<ApiResponse<SubscriptionState>>('/billing/subscription');
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to load subscription details');
    }
    return res.data.data;
  },

  getPlans: async (): Promise<PlanDefinition[]> => {
    const res = await api.get<ApiResponse<PlanDefinition[]>>('/billing/plans');
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to load plans');
    }
    return res.data.data;
  },

  createSubscription: async (planId: string): Promise<{ subscriptionId: string; razorpayKeyId: string; planName: string; amountPaise: number }> => {
    const res = await api.post<ApiResponse<{ subscriptionId: string; razorpayKeyId: string; planName: string; amountPaise: number }>>('/billing/create-subscription', { planId });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to create subscription');
    }
    return res.data.data;
  },

  verifySubscription: async (
    response: RazorpaySubscriptionCheckoutResponse,
  ): Promise<CheckoutVerificationResult> => {
    const res = await api.post<ApiResponse<CheckoutVerificationResult>>(
      '/billing/verify-subscription',
      response,
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(
        res.data.error?.message || 'Failed to verify subscription payment',
      );
    }
    return res.data.data;
  },

  reconcileSubscription: async (): Promise<void> => {
    const res = await api.post<ApiResponse<unknown>>('/billing/reconcile');
    if (!res.data.success) {
      throw new Error(
        res.data.error?.message || 'Failed to refresh subscription',
      );
    }
  },

  changePlan: async (
    planId: string,
  ): Promise<{ pendingPlan: string; effectiveAt: string | null; message: string }> => {
    const res = await api.post<
      ApiResponse<{
        pendingPlan: string;
        effectiveAt: string | null;
        message: string;
      }>
    >('/billing/change-plan', { planId });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to change plan');
    }
    return res.data.data;
  },

  cancelSubscription: async (): Promise<void> => {
    const res = await api.post<ApiResponse<any>>('/billing/cancel');
    if (!res.data.success) {
      throw new Error(res.data.error?.message || 'Failed to cancel subscription');
    }
  },
};
