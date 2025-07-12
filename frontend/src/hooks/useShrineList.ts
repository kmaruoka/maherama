import { useQuery } from '@tanstack/react-query';
import { API_BASE, apiCall } from '../config/api';

export interface ShrineListItem {
  id: number;
  name: string;
  count: number;
  registeredAt: string;
  lastPrayedAt?: string;
}

export default function useShrineList() {
  return useQuery<ShrineListItem[]>({
    queryKey: ['user-shrines-visited'],
    queryFn: async () => {
      const res = await apiCall(`${API_BASE}/users/me/shrines-visited`);
      if (!res.ok) throw new Error('Failed to fetch user shrines');
      const data = await res.json();
      // last_prayed_atをlastPrayedAtに変換
      return data.map((item: any) => ({
        ...item,
        lastPrayedAt: item.last_prayed_at || undefined
      }));
    },
  });
}
