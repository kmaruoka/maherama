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
    // 東方向にradiusメートル離れた緯度経度を計算
    const R = 6378137; // 地球半径[m]
    const dLng = (radius / (R * Math.cos((center.lat * Math.PI) / 180))) * (180 / Math.PI);
    const edge = { lat: center.lat, lng: center.lng + dLng };
    const edgePoint = map.latLngToContainerPoint(edge);
    const pixelRadius = Math.abs(edgePoint.x - point.x);
    setGeom({ x: point.x, y: point.y, pixelRadius });
  };

  useEffect(recalc, [radius, map]);
  useMapEvents({ move: recalc, zoom: recalc });

  return geom;
}
