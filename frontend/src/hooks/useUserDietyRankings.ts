import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';
import type { Period, RankingItem } from '../components/organisms/RankingPane';

export type UserDietyRankingsByPeriod = { [key in Period]: RankingItem[] };

export default function useUserDietyRankings(userId: number | undefined) {
  return useQuery<UserDietyRankingsByPeriod>({
    queryKey: ['user-diety-rankings-bundle', userId],
    queryFn: async () => {
      if (!userId) return { all: [], yearly: [], monthly: [], weekly: [] };
      const res = await fetch(`${API_BASE}/users/${userId}/diety-rankings-bundle`);
      if (!res.ok) throw new Error('神様ランキング取得に失敗しました');
      return res.json();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
