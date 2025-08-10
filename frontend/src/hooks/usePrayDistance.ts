import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { calculateDistance } from "../../backend/shared/utils/distance";
import { API_BASE, apiCall } from '../config/api';

// 2点間の距離計算はcalculateDistanceを使う
export function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return calculateDistance({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 });
}

// スロット数から半径を計算
export function getRadiusFromSlots(slots: number): number {
  if (slots === 0) return 100;
  return 100 * Math.pow(2, slots);
}

// APIから参拝可能距離を取得するフック
export function usePrayDistance(userId: number | null): { prayDistance: number | null; isLoading: boolean } {
  const [prayDistance, setPrayDistance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setPrayDistance(null);
      return;
    }

    setIsLoading(true);
    apiCall(`${API_BASE}/users/${userId}/pray-distance`)
      .then(res => res.json())
      .then(data => {
        if (typeof data.pray_distance === 'number') {
          setPrayDistance(data.pray_distance);
        } else {
          setPrayDistance(100); // デフォルト値
        }
      })
      .catch(() => {
        setPrayDistance(100); // エラー時のデフォルト値
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [userId]);

  return { prayDistance, isLoading };
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
      const res = await apiCall(`${API_BASE}/users/${userId}/worship-limit`);
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
      const res = await apiCall(`${API_BASE}/users/${userId}/level-info`);
      return res.json();
    },
    enabled: !!userId,
  });
}

// 参拝可能判定を行うフック
export function useCanPray(
  position: [number, number] | null,
  shrineLat: number,
  shrineLng: number,
  prayDistance: number | null
): { distance: number | null; canPray: boolean } {
  return useMemo(() => {
    if (!position || prayDistance === null) {
      return { distance: null, canPray: false };
    }

    const distance = getDistanceMeters(position[0], position[1], shrineLat, shrineLng);
    const canPray = !isNaN(distance) && !isNaN(prayDistance) && distance <= prayDistance;

    return { distance, canPray };
  }, [position, shrineLat, shrineLng, prayDistance]);
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
