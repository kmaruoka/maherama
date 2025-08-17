import { useQuery } from '@tanstack/react-query';
import { apiCall } from '../config/api';
import useDebugLog from './useDebugLog';

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
  image_id?: number;
  image_url?: string;
  image_url_xs?: string;
  image_url_s?: string;
  image_url_m?: string;
  image_url_l?: string;
  image_url_xl?: string;
  image_by?: string;
  // 必要に応じて他のプロパティも追加
}

export function useUserInfo(displayId: number | undefined | null, viewerId: number | null) {
  const debugLog = useDebugLog();
  return useQuery<UserInfo | null>({
    queryKey: ['user', displayId, viewerId],
    queryFn: async () => {
      if (!displayId) return null;
      const v = viewerId || displayId;
      const res = await apiCall(`/users/${displayId}?viewerId=${v}`);
      if (!res.ok) throw new Error('ユーザー情報の取得に失敗しました');
      const json = await res.json();
      // debugLog(`userInfo APIレスポンス: ${JSON.stringify(json)}`); // ← linterエラー回避のためコメントアウト
      return json;
    },
    enabled: !!displayId,
  });
}
