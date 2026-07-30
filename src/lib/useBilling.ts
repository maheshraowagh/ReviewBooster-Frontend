import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingService } from '../services/billingService';
import type {
  CheckoutVerificationResult,
  Invoice,
  PlanDefinition,
  PlanEntitlements,
  RazorpaySubscriptionCheckoutResponse,
  SubscriptionState,
} from '../services/billingService';

export type {
  CheckoutVerificationResult,
  Invoice,
  PlanDefinition,
  PlanEntitlements,
  RazorpaySubscriptionCheckoutResponse,
  SubscriptionState,
};

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

export function useVerifySubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: billingService.verifySubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'subscription'] });
    },
  });
}

export function useReconcileSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: billingService.reconcileSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'subscription'] });
    },
  });
}

export function useChangePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: billingService.changePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'subscription'] });
    },
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
