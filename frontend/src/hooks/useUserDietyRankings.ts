import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';
import type { Period } from '../components/organisms/RankingPane';
import type { RankingItem } from '../components/organisms/RankingPane';

export default function useUserDietyRankings(id: number | undefined, period: Period) {
  return useQuery<RankingItem[]>({
    queryKey: ['user-diety-rankings', id, period],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/users/${id}/diety-rankings?period=${period}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });
}
