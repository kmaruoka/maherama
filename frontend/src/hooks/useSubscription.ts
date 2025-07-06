import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';

// 新しいレベルシステムのサブスクリプション情報
export function useSubscription(userId: number | null) {
  return useQuery<{
    subscriptions: Array<{
      id: number;
      subscription_type: string;
      expires_at: string;
      is_active: boolean;
    }>;
  }>({
    queryKey: ['subscription', userId],
    queryFn: async () => {
      if (!userId) throw new Error('ユーザーIDが未設定です');
      const res = await fetch(`${API_BASE}/users/${userId}/subscription`, {
        headers: { 'x-user-id': String(userId) },
      });
      if (!res.ok) throw new Error('課金情報の取得に失敗しました');
      return res.json();
    },
    enabled: !!userId,
  });
}

// 古いAPI（後方互換性のため残す）
export function useSubscriptionOld(userId: number | null) {
  return useQuery<{ slots: number }>({
    queryKey: ['subscription-old', userId],
    queryFn: async () => {
      if (!userId) throw new Error('ユーザーIDが未設定です');
      const res = await fetch(`${API_BASE}/users/me/subscription`, {
        headers: { 'x-user-id': String(userId) },
      });
      if (!res.ok) throw new Error('課金情報の取得に失敗しました');
      return res.json();
    },
    enabled: !!userId,
  });
} 