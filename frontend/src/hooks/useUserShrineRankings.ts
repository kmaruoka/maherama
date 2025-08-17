import { useQuery } from '@tanstack/react-query';
import type { RankingItemProps as RankingItem } from '../components/atoms/RankingItem';
import type { Period } from '../components/organisms/RankingPane';
import { apiCall } from '../config/api';

export type ItemsByPeriod = { [key in Period]: RankingItem[] };

export default function useUserShrineRankings(userId?: number) {
  return useQuery<ItemsByPeriod>({
    queryKey: ['user-shrine-rankings-bundle', userId],
    enabled: !!userId,
    queryFn: async () => {
      const periods: Period[] = ['all', 'yearly', 'monthly', 'weekly'];
      const result: ItemsByPeriod = { all: [], yearly: [], monthly: [], weekly: [] };
      await Promise.all(periods.map(async (period) => {
        const res = await apiCall(`/api/users/${userId}/shrine-rankings?period=${period}`);
        result[period] = res.ok ? await res.json() : [];
      }));
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}
