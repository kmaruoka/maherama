import { useMemo } from 'react';

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

export default function usePrayDistance(
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