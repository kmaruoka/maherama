import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';

export interface UserInfo {
  id: number;
  name: string;
  level: number;
  exp: number;
  abilityPoints: number;
  followingCount: number;
  followerCount: number;
  isFollowing: boolean;
}

export default function useUserInfo(displayId: number | undefined | null, viewerId: number | null) {
  return useQuery<UserInfo | null>({
    queryKey: ['user', displayId, viewerId],
    queryFn: async () => {
      if (!displayId) return null;
      const v = viewerId || displayId;
      const res = await fetch(`${API_BASE}/users/${displayId}?viewerId=${v}`);
      if (!res.ok) throw new Error('ユーザー情報の取得に失敗しました');
      return res.json();
    },
    enabled: !!displayId,
  });
}
