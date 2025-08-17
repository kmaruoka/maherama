import { useQuery } from '@tanstack/react-query';
import { apiCall } from '../config/api';

export interface AbilityItem {
  id: number;
  name: string;
  description: string;
  cost: number;
  effect_type: string;
  effect_value: number;
  prerequisite_ability_id?: number;
  prerequisite_ability?: {
    id: number;
    name: string;
  };
  purchased: boolean;
  can_purchase: boolean;
}

export default function useAbilityList(userId?: number | null) {
  return useQuery<AbilityItem[]>({
    queryKey: ['abilities', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await apiCall(`/users/${userId}/abilities`);
      if (!res.ok) throw new Error('能力一覧の取得に失敗しました');
      const data = await res.json();
      return data.abilities || data;
    },
  });
}
