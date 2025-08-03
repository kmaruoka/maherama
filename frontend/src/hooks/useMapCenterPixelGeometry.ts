import { useEffect, useState, useCallback } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { EARTH_RADIUS_METERS, addMetersToLng } from "../../backend/shared/utils/distance";

export interface MapCenterPixelGeometry {
  x: number;
  y: number;
  pixelRadius: number;
}

export default function useMapCenterPixelGeometry(radius: number): MapCenterPixelGeometry {
  const map = useMap();
  const [geom, setGeom] = useState<MapCenterPixelGeometry>({ x: 0, y: 0, pixelRadius: 0 });

  const recalc = useCallback(() => {
    if (!map) return;
    const center = map.getCenter();
    const point = map.latLngToContainerPoint(center);
    // 東方向にradiusメートル離れた緯度経度を計算
    const edge = { lat: center.lat, lng: addMetersToLng(center.lat, center.lng, radius) };
    const edgePoint = map.latLngToContainerPoint(edge);
    const pixelRadius = Math.abs(edgePoint.x - point.x);
    setGeom({ x: point.x, y: point.y, pixelRadius });
  }, [map, radius]);

  useEffect(() => {
    recalc();
  }, [recalc]);

  useMapEvents({ 
    move: recalc, 
    zoom: recalc 
  });

  return geom;
}
