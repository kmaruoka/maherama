import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import '../../setupLeaflet';
import { useQuery } from '@tanstack/react-query';
import { API_BASE, MAPBOX_API_KEY } from '../../config/api';
import ShrineMarkerPane, { type Shrine } from '../organisms/ShrineMarkerPane';
import LogPane from '../organisms/LogPane';
import type { LogItem } from '../molecules/CustomLogLine';
import L, { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

  // localStorageからcenter/zoomを復元
  const defaultCenter: [number, number] = [35.68, 139.76];
  const defaultZoom = 5;
  const savedCenter = localStorage.getItem('mapCenter');
  const savedZoom = localStorage.getItem('mapZoom');
  const [center, setCenter] = useState<[number, number]>(
    savedCenter ? JSON.parse(savedCenter) : defaultCenter
  );
  const [zoom, setZoom] = useState<number>(
    savedZoom ? Number(savedZoom) : defaultZoom
  );

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
      const res = await fetch(`${API_BASE}/shrines/all`);
      return res.json();
    },
  });

  return (
    <>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: 'calc(100vh - 3rem)' }}
        // @ts-expect-error react-leafletのwhenReady型不一致回避
        whenReady={({ target }: { target: LeafletMap }) => {
          mapRef.current = target;
          // center/zoom変更時にlocalStorageへ保存
          target.on('moveend', () => {
            const c = target.getCenter();
            setCenter([c.lat, c.lng]);
            localStorage.setItem('mapCenter', JSON.stringify([c.lat, c.lng]));
            localStorage.setItem('mapZoom', String(target.getZoom()));
            setZoom(target.getZoom());
          });
          target.on('zoomend', () => {
            const c = target.getCenter();
            setCenter([c.lat, c.lng]);
            localStorage.setItem('mapCenter', JSON.stringify([c.lat, c.lng]));
            localStorage.setItem('mapZoom', String(target.getZoom()));
            setZoom(target.getZoom());
          });
        }}
        onmoveend={(e: { target: LeafletMap }) => {
          if (debugMode) {
            const c = e.target.getCenter();
            setPosition([c.lat, c.lng]);
          }
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a>'
          url={`https://api.mapbox.com/styles/v1/kmigosso/cmcjan1td000401ridva77z79/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_API_KEY}`}
          tileSize={512}
          zoomOffset={-1}
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
