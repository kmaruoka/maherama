import { useQuery } from '@tanstack/react-query';
import type { RankingItemProps as RankingItem } from '../components/atoms/RankingItem';
import type { Period } from '../components/organisms/RankingPane';
import { apiCall } from '../config/api';

export interface UserRankingsBundle {
  shrineRankings: RankingItem[];
  dietyRankings: RankingItem[];
}

export default function useUserRankingsBundle(id: number | null | undefined, period: Period) {
  return useQuery<UserRankingsBundle>({
    queryKey: ['user-rankings-bundle', id, period],
    queryFn: async () => {
      if (!id) return { shrineRankings: [], dietyRankings: [] };
      const res = await apiCall(`/api/users/${id}/rankings?period=${period}`);
      return res.json();
    },
    enabled: !!id,
  });
}
