import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';

export interface Follower {
  id: number;
  name: string;
  image_id?: number;
  image_url?: string;
  image_url64?: string;
  image_url128?: string;
  image_url256?: string;
  image_url512?: string;
  image_by?: string;
}

export function useFollowers(userId: number) {
  return useQuery<Follower[]>({
    queryKey: ['followers', userId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/users/${userId}/followers`);
      if (!response.ok) {
        throw new Error('Failed to fetch followers');
      }
      return response.json();
    },
    enabled: !!userId,
  });
} 