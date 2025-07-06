import { useQuery } from '@tanstack/react-query';
import { API_BASE, apiCall } from '../config/api';

export interface UserTitle {
  id: number;
  name: string;
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
