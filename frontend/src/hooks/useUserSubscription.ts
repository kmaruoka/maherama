import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';

export default function useUserSubscription() {
  return useQuery<{ slots: number }>({
    queryKey: ['user-subscription'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/users/me/subscription`, {
        headers: { 'x-user-id': '1' }, // TODO: 実際のユーザーIDに置き換え
      });
      if (!res.ok) throw new Error('課金情報の取得に失敗しました');
      return res.json();
    },
  });
} 