import { useQuery } from '@tanstack/react-query';
import { API_BASE, apiCall } from '../config/api';

export interface Follower {
  id: number;
  name: string;
  image_id?: number;
  image_url?: string;
  image_url_xs?: string;
  image_url_s?: string;
  image_url_m?: string;
  image_url_l?: string;
  image_url_xl?: string;
  image_by?: string;
}

export function useFollowers(userId: number) {
  return useQuery<Follower[]>({
    queryKey: ['followers', userId],
    queryFn: async () => {
      const response = await apiCall(`${API_BASE}/users/${userId}/followers`);
      return response.json();
    },
    enabled: !!userId,
  });
}
