import { useQuery } from '@tanstack/react-query';
import { API_BASE, apiCall } from '../config/api';

export interface DietyListItem {
  id: number;
  name: string;
  kana?: string;
  count: number;
  registeredAt: string;
  lastPrayedAt?: string;
  thumbnailUrl?: string;
}



export default function useDietyList() {
  return useQuery<DietyListItem[]>({
    queryKey: ['user-dieties-visited'],
    queryFn: async () => {
      const res = await apiCall(`${API_BASE}/users/me/dieties-visited`);
      if (!res.ok) throw new Error('Failed to fetch user dieties');
      const data = await res.json();
      // last_prayed_atをlastPrayedAtに変換
      return data.map((item: any) => ({
        ...item,
        lastPrayedAt: item.last_prayed_at || item.lastPrayedAt || undefined,
        thumbnailUrl: item.thumbnailUrl || undefined,
        kana: item.kana || undefined
      }));
    },
  });
}
