import { useQuery } from '@tanstack/react-query';
import { apiCall } from '../config/api';

export interface Following {
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

export function useFollowing(userId: number) {
  return useQuery<Following[]>({
    queryKey: ['following', userId],
    queryFn: async () => {
      const response = await apiCall(`/users/${userId}/following`);
      return response.json();
    },
    enabled: !!userId,
  });
}
