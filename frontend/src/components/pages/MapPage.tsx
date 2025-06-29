import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import '../../setupLeaflet';
import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../../config/api';
import ShrineMarkerPane, { type Shrine } from '../organisms/ShrineMarkerPane';
import LogPane from '../organisms/LogPane';
import type { LogItem } from '../molecules/CustomLogLine';
import L from 'leaflet';

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
  const { data: logs = [], refetch: refetchLogs, isLoading: logsLoading, error: logsError } = useQuery<LogItem[]>({
    queryKey: ['logs'],
    queryFn: async () => {
      try {
        const res = await fetch(`${API_BASE}/logs`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      } catch (error) {
        console.error('ログの取得に失敗しました:', error);
        throw error;
      }
    },
    refetchInterval: 5000, // 5秒ごとに更新
    retry: 3,
  });

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setPosition([pos.coords.latitude, pos.coords.longitude]);
    });
  }, []);

  useEffect(() => {
    if (debugMode) {
      if (mapRef.current) {
        const c = mapRef.current.getCenter();
        setPosition([c.lat, c.lng]);
      }
    } else {
      navigator.geolocation.getCurrentPosition((pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
      });
    }
  }, [debugMode]);

  useEffect(() => {
    const stored = localStorage.getItem('debugMode');
    if (stored) setDebugMode(stored === 'true');
    const handler = (e: StorageEvent) => {
      if (e.key === 'debugMode') {
        setDebugMode(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const { data: shrines = [] } = useQuery<Shrine[]>({
    queryKey: ['shrines'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/shrines`);
      return res.json();
    },
  });

  return (
    <>
      <MapContainer
        center={[35.68, 139.76] as [number, number]}
        zoom={5}
        style={{ height: 'calc(100vh - 3rem)' }}
        whenCreated={(map) => {
          mapRef.current = map;
        }}
        onmoveend={(e) => {
          if (debugMode) {
            const c = e.target.getCenter();
            setPosition([c.lat, c.lng]);
          }
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {position && (
          <Circle center={position} radius={100} pathOptions={{ color: 'blue' }} />
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
