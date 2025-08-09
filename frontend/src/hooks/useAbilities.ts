import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '../config/api';

// 能力一覧取得
export function useAbilities(userId: number | null) {
  return useQuery<{
    abilities: Array<{
      id: number;
      name: string;
      cost: number;
      effect_type: string;
      effect_value: number;
      purchased: boolean;
      can_purchase: boolean;
    }>;
    ability_points: number;
  }>({
    queryKey: ['abilities', userId],
    queryFn: async () => {
      if (!userId) throw new Error('ユーザーIDが未設定です');
      const res = await fetch(`${API_BASE}/users/${userId}/abilities`, {
        headers: { 'x-user-id': String(userId) },
      });
      if (!res.ok) throw new Error('能力情報の取得に失敗しました');
      return res.json();
    },
    enabled: !!userId,
  });
}

// 能力購入
export function usePurchaseAbility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, abilityId }: { userId: number; abilityId: number }) => {
      const res = await fetch(`${API_BASE}/abilities/${abilityId}/purchase`, {
        method: 'POST',
        headers: {
          'x-user-id': String(userId),
          'Content-Type': 'application/json'
        },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '能力購入に失敗しました');
      }
      return res.json();
    },
    onSuccess: (data, { userId }) => {
      // 関連するクエリを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ['abilities', userId] });
      queryClient.invalidateQueries({ queryKey: ['level-info', userId] });
      queryClient.invalidateQueries({ queryKey: ['pray-distance', userId] });
      queryClient.invalidateQueries({ queryKey: ['worship-limit', userId] });
    },
  });
}

// 能力リセット
export function useResetAbilities() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`${API_BASE}/user/reset-abilities`, {
        method: 'POST',
        headers: {
          'x-user-id': String(userId),
          'Content-Type': 'application/json'
        },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '能力リセットに失敗しました');
      }
      return res.json();
    },
    onSuccess: (data, userId) => {
      // 関連するクエリを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ['abilities', userId] });
      queryClient.invalidateQueries({ queryKey: ['level-info', userId] });
      queryClient.invalidateQueries({ queryKey: ['pray-distance', userId] });
      queryClient.invalidateQueries({ queryKey: ['worship-limit', userId] });
    },
  });
}
