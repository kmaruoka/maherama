import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';

export interface DietyListItem {
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

export default function useDietyList() {
  const userId = getUserId();
  return useQuery<DietyListItem[]>({
    queryKey: ['user-dieties-visited', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetch(`${API_BASE}/users/${userId}/dieties-visited`);
      if (!res.ok) throw new Error('Failed to fetch user dieties');
      return res.json();
    },
  });
}
