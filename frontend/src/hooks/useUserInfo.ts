import { useQuery } from '@tanstack/react-query';
import { API_BASE, apiCall } from '../config/api';

export interface UserInfo {
  id: number;
  name: string;
  level: number;
  exp: number;
  ability_points: number;
  pray_distance: number;
  worship_count: number;
  today_worship_count: number;
  following_count: number;
  follower_count: number;
  is_following: boolean;
  // 必要に応じて他のプロパティも追加
}

export default function useUserInfo(displayId: number | undefined | null, viewerId: number | null) {
  return useQuery<UserInfo | null>({
    queryKey: ['user', displayId, viewerId],
    queryFn: async () => {
      if (!displayId) return null;
      const v = viewerId || displayId;
      const res = await apiCall(`${API_BASE}/users/${displayId}?viewerId=${v}`);
      if (!res.ok) throw new Error('ユーザー情報の取得に失敗しました');
      const json = await res.json();
      console.log('userInfo APIレスポンス', json);
      return json;
    },
    enabled: !!displayId,
  });
}
