import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';
import type { Period, RankingItem } from '../components/organisms/RankingPane';

export interface UserRankingsBundle {
  shrineRankings: RankingItem[];
  dietyRankings: RankingItem[];
}

export default function useUserRankingsBundle(id: number | null | undefined, period: Period) {
  return useQuery<UserRankingsBundle>({
    queryKey: ['user-rankings-bundle', id, period],
    queryFn: async () => {
      if (!id) return { shrineRankings: [], dietyRankings: [] };
      const res = await fetch(`${API_BASE}/users/${id}/rankings?period=${period}`);
      if (!res.ok) throw new Error('ランキング情報の取得に失敗しました');
      return res.json();
    },
    enabled: !!id,
  });
}
