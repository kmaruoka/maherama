import { useQuery } from '@tanstack/react-query';
import { API_BASE, apiCall } from '../config/api';

interface User {
  id: number;
  name: string;
  level: number;
  exp: number;
  ability_points: number;
}

export default function useAllUsers() {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      // 開発環境では認証不要のエンドポイントを使用
      const endpoint = import.meta.env.DEV ? '/test/users' : '/users';
      const response = await apiCall(`${API_BASE}${endpoint}`);
      return response.json();
    },
  });
}
