import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import '../../setupLeaflet';
import { useQuery } from '@tanstack/react-query';
import { API_BASE, MAPBOX_API_KEY } from '../../config/api';
import ShrineMarkerPane, { type Shrine } from '../organisms/ShrineMarkerPane';
import LogPane from '../organisms/LogPane';
import type { LogItem } from '../molecules/CustomLogLine';
import L, { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import CustomCircle from '../atoms/CustomCircle';

function createShrineIcon(thumbnailUrl?: string) {
  return L.icon({
    iconUrl: thumbnailUrl || '/images/marker-icon.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
}

export default function MapPage({ onShowShrine, onShowUser, onShowDiety }: { onShowShrine: (id: number) => void; onShowUser?: (id: number) => void; onShowDiety?: (id: number) => void }) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const defaultCenter: [number, number] = [35.68, 139.76];
  const defaultZoom = 17;
  const [center, setCenter] = useState<[number, number]>(defaultCenter);
  const [zoom, setZoom] = useState<number>(defaultZoom);

  const { data: logs = [], refetch: refetchLogs, isLoading: logsLoading, error: logsError } = useQuery<LogItem[]>({
    queryKey: ['logs'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/logs`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    },
    refetchInterval: 5000,
    retry: 3,
  });

  const { data: shrines = [] } = useQuery<Shrine[]>({
    queryKey: ['shrines'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/shrines/all`);
      return res.json();
    },
  });

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setPosition([pos.coords.latitude, pos.coords.longitude]);
    });
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('debugMode');
    if (stored) setDebugMode(stored === 'true');
    const handler = (e: StorageEvent) => {
      if (e.key === 'debugMode') setDebugMode(e.newValue === 'true');
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // GPS追従（通常モード）
  useEffect(() => {
    if (!debugMode && position && mapRef.current) {
      mapRef.current.setView(position, defaultZoom);
    }
  }, [position, debugMode]);

  // 地図の操作可否切り替え
  useEffect(() => {
    if (!mapRef.current) return;
    if (debugMode) {
      mapRef.current.dragging.enable();
      mapRef.current.scrollWheelZoom.enable();
      mapRef.current.doubleClickZoom.enable();
    } else {
      mapRef.current.dragging.disable();
      mapRef.current.scrollWheelZoom.disable();
      mapRef.current.doubleClickZoom.disable();
    }
  }, [debugMode]);

  // moveend イベントハンドラ（debugMode時のみ）
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !debugMode) return;

    const onMoveEnd = () => {
      const c = map.getCenter();
      const newCenter: [number, number] = [c.lat, c.lng];
      // 無限ループ防止（微差回避）
      if (Math.abs(center[0] - newCenter[0]) > 1e-7 || Math.abs(center[1] - newCenter[1]) > 1e-7) {
        //console.log('moveend: updating center', newCenter);
        setCenter(newCenter);
      }
    };

    map.on('moveend', onMoveEnd);
    return () => map.off('moveend', onMoveEnd);
  }, [debugMode, center]);

  // debugMode時、center変更でsetView（現在のmapとずれていれば）
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !debugMode) return;
    const c = map.getCenter();
    if (Math.abs(c.lat - center[0]) > 1e-7 || Math.abs(c.lng - center[1]) > 1e-7) {
      map.setView(center);
    }
  }, [center, debugMode]);

  return (
    <>
      <MapContainer
        center={debugMode ? center : (position || defaultCenter)}
        zoom={debugMode ? zoom : defaultZoom}
        minZoom={4}
        maxZoom={19}
        style={{ height: 'calc(100vh - 3rem)' }}
        whenReady={({ target }: { target: LeafletMap }) => {
          mapRef.current = target;
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a>'
          url={`https://api.mapbox.com/styles/v1/kmigosso/cmcjan1td000401ridva77z79/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_API_KEY}`}
          tileSize={512}
          zoomOffset={-1}
        />
        {debugMode && center && (
          <CustomCircle center={center} rank={"free"} />
        )}
        {!debugMode && position && (
          <CustomCircle center={position} rank={"free"} />
        )}
        {shrines.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]} icon={createShrineIcon(s.thumbnailUrl)}>
            <Popup>
              <ShrineMarkerPane shrine={s} refetchLogs={refetchLogs} onShowDetail={onShowShrine} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <LogPane logs={logs} loading={logsLoading} error={!!logsError} onShowShrine={onShowShrine} onShowUser={onShowUser} onShowDiety={onShowDiety} />
    </>
  );
}
