import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';

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
      const response = await fetch(`${API_BASE}/test/users`);
      if (!response.ok) {
        throw new Error(`API Error ${response.status}`);
      }
      return response.json();
    },
  });
}
