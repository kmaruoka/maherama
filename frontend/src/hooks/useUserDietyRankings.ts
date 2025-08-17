import { useQuery } from '@tanstack/react-query';
import type { RankingItemProps as RankingItem } from '../components/atoms/RankingItem';
import type { Period } from '../components/organisms/RankingPane';
import { apiCall } from '../config/api';

export type UserDietyRankingsByPeriod = { [key in Period]: RankingItem[] };

export default function useUserDietyRankings(userId: number | undefined) {
  return useQuery<UserDietyRankingsByPeriod>({
    queryKey: ['user-diety-rankings-bundle', userId],
    queryFn: async () => {
      if (!userId) return { all: [], yearly: [], monthly: [], weekly: [] };
      const res = await apiCall(`/api/users/${userId}/diety-rankings-bundle`);
      if (!res.ok) throw new Error('神様ランキング取得に失敗しました');
      return res.json();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
