import { useQuery } from '@tanstack/react-query';
import { API_BASE, apiCall } from '../config/api';

export interface DietyListItem {
  id: number;
  name: string;
  count: number;
  registeredAt: string;
}



export default function useDietyList() {
  return useQuery<DietyListItem[]>({
    queryKey: ['user-dieties-visited'],
    queryFn: async () => {
      const res = await apiCall(`${API_BASE}/users/me/dieties-visited`);
      if (!res.ok) throw new Error('Failed to fetch user dieties');
      return res.json();
    },
  });
}
