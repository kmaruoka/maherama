import { useQuery } from '@tanstack/react-query';
import type { Period, RankingItem } from '../components/organisms/RankingPane';
import { API_BASE, apiCall } from '../config/api';

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
      const res = await apiCall(`${API_BASE}${apiMap[period]}`);
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
