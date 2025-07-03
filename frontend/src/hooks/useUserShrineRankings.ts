import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';
import type { Period } from '../components/organisms/RankingPane';
import type { RankingItem } from '../components/organisms/RankingPane';

export default function useUserShrineRankings(id: number | undefined, period: Period) {
  return useQuery<RankingItem[]>({
    queryKey: ['user-shrine-rankings', id, period],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/users/${id}/shrine-rankings?period=${period}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });
}
