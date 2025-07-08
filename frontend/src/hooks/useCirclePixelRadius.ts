import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * 緯度経度中心・半径（m）→ピクセル半径を返すカスタムフック
 * @param center [number, number] 緯度経度
 * @param radius number メートル単位
 * @returns ピクセル半径（number）
 */
export function useCirclePixelRadius(center: [number, number], radius: number): number {
  const map = useMap();
  if (!map || !center) return 0;
  const centerLatLng = center;
  const pointC = map.latLngToContainerPoint(centerLatLng);
  const pointX = L.point(pointC.x + 1, pointC.y);
  const latLngX = map.containerPointToLatLng(pointX);
  const metersPerPixel = map.distance(centerLatLng, latLngX);
  return radius / metersPerPixel;
} 