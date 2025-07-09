import { useEffect, useState } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

/**
 * マップ中心の円のピクセル半径を計算するフック
 * @param radius 円の半径(m)
 * @returns ピクセル半径
 */
export default function useMapCenterPixelRadius(radius: number) {
  const map = useMap();
  const [pixelRadius, setPixelRadius] = useState(0);

  const recalc = () => {
    if (!map) return;
    const center = map.getCenter();
    const pointC = map.latLngToContainerPoint(center);
    const pointX = L.point(pointC.x + 1, pointC.y);
    const latLngX = map.containerPointToLatLng(pointX);
    const metersPerPixel = map.distance([center.lat, center.lng], [latLngX.lat, latLngX.lng]);
    setPixelRadius(radius / metersPerPixel);
  };

  useEffect(recalc, [radius, map]);

  useMapEvents({
    move: recalc,
    zoom: recalc,
  });

  return pixelRadius;
}
