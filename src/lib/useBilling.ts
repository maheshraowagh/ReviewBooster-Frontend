import { useState, useEffect, useCallback } from 'react';
import api from './api';

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
}

export interface Invoice {
  _id: string;
  plan: string;
  status: string;
  razorpayPaymentId: string | null;
  amountPaidPaise: number;
  currentPeriodEnd: string | null;
  webhookEvent: string | null;
  createdAt: string;
  invoiceUrl: string | null;
}

export interface SubscriptionState {
  plan: string;
  planStatus: string;
  razorpaySubscriptionId: string | null;
  whatsappMsgQuota: number;
  whatsappMsgUsed: number;
  planCurrentPeriodEnd: string | null;
  invoices: Invoice[];
}

export function useBilling() {
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: SubscriptionState }>('/billing/subscription');
      if (res.data.success && res.data.data) {
        setSubscription(res.data.data);
      }
    } catch (err: unknown) {
      setError('Failed to load subscription details');
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: PlanDefinition[] }>('/billing/plans');
      if (res.data.success && res.data.data) {
        setPlans(res.data.data);
      }
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchSubscription(), fetchPlans()]);
      setIsLoading(false);
    };
    load();
  }, [fetchSubscription, fetchPlans]);

  const refetch = useCallback(async () => {
    await fetchSubscription();
  }, [fetchSubscription]);

  return { subscription, plans, isLoading, error, refetch };
}

/**
 * Load Razorpay checkout.js dynamically (script tag injection).
 * Resolves when the script is ready.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as unknown as Record<string, unknown>).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
