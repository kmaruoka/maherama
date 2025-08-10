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
      // テストユーザー取得時は認証不要のエンドポイントを使用
      const response = await apiCall(`${API_BASE}/test/users`);
      return response.json();
    },
  });
}
