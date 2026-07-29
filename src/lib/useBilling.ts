import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingService } from '../services/billingService';
import type { PlanDefinition, SubscriptionState, Invoice, PlanEntitlements } from '../services/billingService';

export type { PlanDefinition, SubscriptionState, Invoice, PlanEntitlements };

export function useBilling() {
  const { data: subscription, isLoading: subLoading, error: subError, refetch } = useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: () => billingService.getSubscription(),
  });

  const { data: plans } = useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: () => billingService.getPlans(),
  });

  const isLoading = subLoading; // main loading state

  return {
    subscription,
    plans: plans || [],
    isLoading,
    error: subError ? String(subError) : null,
    refetch,
  };
}

export function useCreateSubscription() {
  return useMutation({
    mutationFn: (planId: string) => billingService.createSubscription(planId),
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => billingService.cancelSubscription(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'subscription'] });
    },
  });
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
