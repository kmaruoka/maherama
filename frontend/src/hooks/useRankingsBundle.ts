import { useQuery } from '@tanstack/react-query';
import type { RankingItemProps as RankingItem } from '../components/atoms/RankingItem';
import type { Period } from '../components/organisms/RankingPane';
import { apiCall } from '../config/api';

export type RankingsBundleAllPeriods = {
  [key in Period]: {
    shrineRankings: RankingItem[];
    dietyRankings: RankingItem[];
    userRankings: RankingItem[];
  }
};

interface ApiBundleResponse {
  [key: string]: RankingItem[];
}

export default function useRankingsBundleAll(dietyId?: number) {
  return useQuery<RankingsBundleAllPeriods>({
    queryKey: ['rankings-bundle-all', dietyId],
    queryFn: async () => {
      const [shrineRes, dietyRes, userRes] = await Promise.all([
            apiCall(`/api/shrine-rankings-bundle`),
    apiCall(dietyId ? `/api/diety-rankings-bundle?dietyId=${dietyId}` : `/api/diety-rankings-bundle?dietyId=1`),
    apiCall(`/api/user-rankings-bundle`)
      ]);
      const [shrineData, dietyData, userData]: ApiBundleResponse[] = await Promise.all([
        shrineRes.json(),
        dietyRes.json(),
        userRes.json()
      ]);

      const periods: Period[] = ['all', 'yearly', 'monthly', 'weekly'];
      const result: RankingsBundleAllPeriods = {
        all: { shrineRankings: [], dietyRankings: [], userRankings: [] },
        yearly: { shrineRankings: [], dietyRankings: [], userRankings: [] },
        monthly: { shrineRankings: [], dietyRankings: [], userRankings: [] },
        weekly: { shrineRankings: [], dietyRankings: [], userRankings: [] },
      };
      for (const period of periods) {
        result[period] = {
          shrineRankings: Array.isArray(shrineData[period]) ? shrineData[period] : [],
          dietyRankings: Array.isArray(dietyData[period]) ? dietyData[period] : [],
          userRankings: Array.isArray(userData[period]) ? userData[period] : [],
        };
      }

      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export async function fetchDietyRankingsBundle(dietyId: number) {
        const res = await apiCall(`/api/diety-rankings-bundle?dietyId=${dietyId}`);
  return res.json();
}
