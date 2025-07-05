import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';

export interface ShrineListItem {
  id: number;
  name: string;
  count: number;
  registeredAt: string;
}

function getUserId(): number | null {
  if (typeof window !== 'undefined') {
    const v = localStorage.getItem('userId');
    return v ? Number(v) : null;
  }
  return null;
}

export default function useShrineList() {
  const userId = getUserId();
  return useQuery<ShrineListItem[]>({
    queryKey: ['user-shrines-visited', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetch(`${API_BASE}/users/${userId}/shrines-visited`);
      if (!res.ok) throw new Error('Failed to fetch user shrines');
      return res.json();
    },
  });
}
