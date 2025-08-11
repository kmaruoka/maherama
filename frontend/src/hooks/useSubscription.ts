import { useQuery } from '@tanstack/react-query';
import { API_BASE, apiCall } from '../config/api';

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
      const res = await apiCall(`${API_BASE}/users/${userId}/subscription`);
      return res.json();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュを使用
    retry: 2, // エラー時に2回リトライ
    retryDelay: 1000, // リトライ間隔1秒
    refetchOnWindowFocus: false, // ウィンドウフォーカス時の再取得を無効化
    refetchOnReconnect: false, // 再接続時の再取得を無効化
  });
}

// 古いAPI（後方互換性のため残す）
export function useSubscriptionOld(userId: number | null) {
  return useQuery<{ slots: number }>({
    queryKey: ['subscription-old', userId],
    queryFn: async () => {
      if (!userId) throw new Error('ユーザーIDが未設定です');
      const res = await apiCall(`${API_BASE}/users/me/subscription`);
      return res.json();
    },
    enabled: !!userId,
  });
}
