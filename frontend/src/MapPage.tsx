import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import './setupLeaflet';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import ShrinePane, { type Shrine } from './components/organisms/ShrinePane';
import LogPane from './components/organisms/LogPane';
import type { LogItem } from './components/molecules/CustomLogLine';


export default function MapPage() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const { data: logs = [], refetch: refetchLogs, isLoading: logsLoading, error: logsError } = useQuery<LogItem[]>({
    queryKey: ['logs'],
    queryFn: async () => {
      try {
        const res = await fetch('http://localhost:3001/logs');
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

  const { data: shrines = [] } = useQuery<Shrine[]>({
    queryKey: ['shrines'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/shrines');
      return res.json();
    },
  });


  return (
    <>
      <MapContainer
      center={[35.68, 139.76] as [number, number]}
      zoom={5}
      style={{ height: 'calc(100vh - 3rem)' }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {position && (
        <Circle center={position} radius={100} pathOptions={{ color: 'blue' }} />
      )}
      {shrines.map((s) => (
        <Marker key={s.id} position={[s.lat, s.lng]}>
          <Popup>
            <ShrinePane shrine={s} refetchLogs={refetchLogs} />
          </Popup>
        </Marker>
      ))}
      </MapContainer>
      <LogPane logs={logs} loading={logsLoading} error={!!logsError} />
    </>
  );
}
