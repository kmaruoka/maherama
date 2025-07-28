import { useQuery } from '@tanstack/react-query';
import { API_BASE, apiCall } from '../config/api';

export interface UserTitle {
  id: number;
  name: string;
  template?: string;
  embed_data?: Record<string, any>;
  grade?: number; // 1=最低, 2, 3, 4, 5=最高
  display_name?: string; // 表示名
}

export default function useUserTitles(userId: number | undefined | null) {
  return useQuery<UserTitle[]>({
    queryKey: ['user', userId, 'titles'],
    queryFn: async () => {
      if (!userId) return [];
      const res = await apiCall(`${API_BASE}/users/${userId}/titles`);
      if (!res.ok) throw new Error('称号の取得に失敗しました');
      return res.json();
    },
    enabled: !!userId,
  });
}
