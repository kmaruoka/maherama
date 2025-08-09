import { useMap, useMapEvents } from 'react-leaflet';
import { useState } from 'react';
import L from 'leaflet';

export function useBarrierPixelGeometry(center: [number, number] | undefined, radius: number) {
  const map = useMap();
  const [refresh, setRefresh] = useState(0);
  useMapEvents({
    move: () => setRefresh(r => r + 1),
    zoom: () => setRefresh(r => r + 1),
  });
  if (!map || !center || center.length !== 2 || isNaN(center[0]) || isNaN(center[1])) {
    return { pixelX: 0, pixelY: 0, pixelRadius: 0 };
  }
  const point = map.latLngToContainerPoint(center);
  const pointC = map.latLngToContainerPoint(center);
  const pointX = L.point(pointC.x + 1, pointC.y);
  const latLngX = map.containerPointToLatLng(pointX);
  const metersPerPixel = map.distance(center, [latLngX.lat, latLngX.lng]);
  const pixelRadius = radius / metersPerPixel;
  return { pixelX: point.x, pixelY: point.y, pixelRadius };
}
