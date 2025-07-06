import { useQuery } from '@tanstack/react-query';
import { API_BASE, apiCall } from '../config/api';

export interface AbilityItem {
  id: number;
  name: string;
  description: string;
  base_cost: number;
  cost_increase: number;
  effect_type: string;
  effect_value: number;
  max_level: number;
  prerequisite_ability_id?: number;
  prerequisite_ability?: {
    id: number;
    name: string;
  };
  current_level: number;
  next_cost: number;
  purchased: boolean;
  can_purchase: boolean;
  can_level_up: boolean;
}

export default function useAbilityList(userId?: number | null) {
  return useQuery<AbilityItem[]>({
    queryKey: ['abilities', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await apiCall(`${API_BASE}/users/${userId}/abilities`);
      if (!res.ok) throw new Error('能力一覧の取得に失敗しました');
      const data = await res.json();
      return data.abilities || data;
    },
  });
}
