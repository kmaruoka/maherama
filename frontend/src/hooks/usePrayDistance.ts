import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';

export function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000; // 地球半径(m)
  const toRad = (x: number) => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function getRadiusFromSlots(slots: number) {
  if (slots === 0) return 100;
  return 100 * Math.pow(2, slots);
}

export function usePrayDistance(userId: number | null) {
  return useQuery<{ pray_distance: number }>({
    queryKey: ['pray-distance', userId],
    queryFn: async () => {
      if (!userId) throw new Error('ユーザーIDが未設定です');
      const res = await fetch(`${API_BASE}/users/${userId}/pray-distance`, {
        headers: { 'x-user-id': String(userId) },
      });
      if (!res.ok) throw new Error('参拝距離の取得に失敗しました');
      return res.json();
    },
    enabled: !!userId,
  });
}

export function useWorshipLimit(userId: number | null) {
  return useQuery<{
    max_worship_count: number;
    today_worship_count: number;
    remaining_worship_count: number;
    can_worship: boolean;
  }>({
    queryKey: ['worship-limit', userId],
    queryFn: async () => {
      if (!userId) throw new Error('ユーザーIDが未設定です');
      const res = await fetch(`${API_BASE}/users/${userId}/worship-limit`, {
        headers: { 'x-user-id': String(userId) },
      });
      if (!res.ok) throw new Error('遥拝回数制限の取得に失敗しました');
      return res.json();
    },
    enabled: !!userId,
  });
}

export function useLevelInfo(userId: number | null) {
  return useQuery<{
    user: {
      id: number;
      name: string;
      level: number;
      exp: number;
      ability_points: number;
    };
    level: {
      current: {
        level: number;
        required_exp: number;
        pray_distance: number;
        worship_count: number;
      };
      next: {
        level: number;
        required_exp: number;
        pray_distance: number;
        worship_count: number;
      } | null;
      progress: number;
    };
    stats: {
      pray_distance: number;
      worship_count: number;
      today_worship_count: number;
    };
  }>({
    queryKey: ['level-info', userId],
    queryFn: async () => {
      if (!userId) throw new Error('ユーザーIDが未設定です');
      const res = await fetch(`${API_BASE}/users/${userId}/level-info`, {
        headers: { 'x-user-id': String(userId) },
      });
      if (!res.ok) throw new Error('レベル情報の取得に失敗しました');
      return res.json();
    },
    enabled: !!userId,
  });
}

export default function usePrayDistanceOld(
  position: [number, number] | null,
  shrineLat: number,
  shrineLng: number,
  slots: number
) {
  return useMemo(() => {
    if (!position) return { distance: null, radius: getRadiusFromSlots(slots), canPray: false };
    const radius = getRadiusFromSlots(slots);
    const distance = getDistanceMeters(position[0], position[1], shrineLat, shrineLng);
    const canPray = distance <= radius;
    return { distance, radius, canPray };
  }, [position, shrineLat, shrineLng, slots]);
} 