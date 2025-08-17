import { useQuery } from '@tanstack/react-query';
import type { Period } from '../components/organisms/RankingPane';
import { apiCall } from '../config/api';

export interface ShrineRankingItem {
  rank: number;
  userId: number;
  userName: string;
  count: number;
}

export default function useShrineRankings(id: number, period: Period) {
  return useQuery<ShrineRankingItem[]>({
    queryKey: ['shrine-rankings', id, period],
    queryFn: async () => {
      const res = await apiCall(`/shrines/${id}/rankings?period=${period}`);
      return res.json();
    },
    enabled: !!id,
  });
}
