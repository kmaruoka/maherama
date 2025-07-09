import { useEffect, useState } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

export interface MapCenterPixelGeometry {
  x: number;
  y: number;
  pixelRadius: number;
}

export default function useMapCenterPixelGeometry(radius: number): MapCenterPixelGeometry {
  const map = useMap();
  const [geom, setGeom] = useState<MapCenterPixelGeometry>({ x: 0, y: 0, pixelRadius: 0 });

  const recalc = () => {
    if (!map) return;
    const center = map.getCenter();
    const point = map.latLngToContainerPoint(center);
    const pointX = L.point(point.x + 1, point.y);
    const latLngX = map.containerPointToLatLng(pointX);
    const metersPerPixel = map.distance([center.lat, center.lng], [latLngX.lat, latLngX.lng]);
    setGeom({ x: point.x, y: point.y, pixelRadius: radius / metersPerPixel });
  };

  useEffect(recalc, [radius, map]);
  useMapEvents({ move: recalc, zoom: recalc });

  return geom;
}
