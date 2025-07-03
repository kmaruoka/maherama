import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';
import type { Period, RankingItem } from '../components/organisms/RankingPane';

const apiMap: Record<Period, string> = {
  all: '/user-rankings',
  yearly: '/user-rankings-yearly',
  monthly: '/user-rankings-monthly',
  weekly: '/user-rankings-weekly',
};

export default function useUserRankings(period: Period) {
  return useQuery<RankingItem[]>({
    queryKey: ['user-rankings', period],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}${apiMap[period]}`);
      if (!res.ok) return [];
      const arr = await res.json();
      return arr.map((item: any) => ({
        id: item.userId,
        name: item.userName,
        count: item.count,
        rank: item.rank,
      }));
    },
  });
}
