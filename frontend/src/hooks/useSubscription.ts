import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';

// 現在の課金状態取得（slots数値のみ）
export function useSubscription(userId: number | null) {
  return useQuery<{ slots: number }>({
    queryKey: ['subscription', userId],
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