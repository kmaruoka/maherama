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
      const response = await apiCall(`${API_BASE}/test/users`, { requireAuth: false });
      return response.json();
    },
    retry: (failureCount, error: any) => {
      // 429エラー（レート制限）の場合はリトライしない
      if (error?.status === 429) {
        return false;
      }
      // その他のエラーは最大3回までリトライ
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5分間はキャッシュを有効にする
    gcTime: 10 * 60 * 1000, // 10分間ガベージコレクションを遅延
    refetchOnWindowFocus: false, // ウィンドウフォーカス時の再取得を無効化
    refetchOnReconnect: false, // 再接続時の再取得を無効化
  });
}
