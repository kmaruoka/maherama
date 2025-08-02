import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';

export interface Following {
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

export function useFollowing(userId: number) {
  return useQuery<Following[]>({
    queryKey: ['following', userId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/users/${userId}/following`);
      if (!response.ok) {
        throw new Error('Failed to fetch following');
      }
      return response.json();
    },
    enabled: !!userId,
  });
} 