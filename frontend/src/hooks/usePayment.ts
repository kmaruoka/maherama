import { useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE, apiCall } from '../config/api';

// プラットフォーム判定
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isPWA = window.matchMedia('(display-mode: standalone)').matches;

export interface SubscriptionPlan {
  id: string;
  name: string;
  slots: number;
  price: number;
  interval: 'month' | 'year';
}

// シンプルなプラン定義（slots数値のみ）
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  { id: 'slots-1', name: '1口プラン', slots: 1, price: 200, interval: 'month' },
  { id: 'slots-2', name: '2口プラン', slots: 2, price: 400, interval: 'month' },
  { id: 'slots-3', name: '3口プラン', slots: 3, price: 600, interval: 'month' },
  { id: 'slots-4', name: '4口プラン', slots: 4, price: 800, interval: 'month' },
];

// 課金方法判定
export function getPaymentMethod() {
  if (isIOS && isPWA) {
    return 'appstore';
  }
  return 'stripe';
}

// Stripe課金開始
export function useStripeCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
      if (!plan) throw new Error('プランが見つかりません');

      const res = await apiCall(`${API_BASE}/subscription/create-checkout-session`, {
        method: 'POST',
        body: JSON.stringify({ planId, platform: 'web' }),
      });

      const { sessionId } = await res.json();

      // Stripe Checkoutにリダイレクト（実装は後で追加）
      // console.log('Stripe Checkout開始:', sessionId);
      // window.location.href = `/checkout?session_id=${sessionId}`;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

// App Store課金開始
export function useAppStorePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      // iOS In-App Purchase実装
      if (typeof window !== 'undefined' && 'webkit' in window) {
        // WebKit In-App Purchase API
        // console.log('App Store課金開始:', planId);
        // 実際の実装はiOSネイティブAPIに依存
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

// 課金開始（プラットフォーム自動判定）
export function useStartSubscription() {
  const stripeCheckout = useStripeCheckout();
  const appStorePurchase = useAppStorePurchase();

  return {
    mutate: (planId: string) => {
      const method = getPaymentMethod();
      if (method === 'appstore') {
        appStorePurchase.mutate(planId);
      } else {
        stripeCheckout.mutate(planId);
      }
    },
    isLoading: stripeCheckout.isPending || appStorePurchase.isPending,
    error: stripeCheckout.error || appStorePurchase.error,
  };
}
