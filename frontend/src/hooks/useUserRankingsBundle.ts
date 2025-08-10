import { useQuery } from '@tanstack/react-query';
import type { Period, RankingItem } from '../components/organisms/RankingPane';
import { API_BASE, apiCall } from '../config/api';

export interface UserRankingsBundle {
  shrineRankings: RankingItem[];
  dietyRankings: RankingItem[];
}

export default function useUserRankingsBundle(id: number | null | undefined, period: Period) {
  return useQuery<UserRankingsBundle>({
    queryKey: ['user-rankings-bundle', id, period],
    queryFn: async () => {
      if (!id) return { shrineRankings: [], dietyRankings: [] };
      const res = await apiCall(`${API_BASE}/users/${id}/rankings?period=${period}`);
      return res.json();
    },
    enabled: !!id,
  });
}
