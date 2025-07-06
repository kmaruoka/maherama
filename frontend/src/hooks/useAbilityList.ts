import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';

export interface AbilityItem {
  id: number;
  name: string;
  cost: number;
}

export default function useAbilityList() {
  return useQuery<AbilityItem[]>({
    queryKey: ['abilities'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/abilities`);
      if (!res.ok) throw new Error('能力一覧の取得に失敗しました');
      return res.json();
    },
  });
}
