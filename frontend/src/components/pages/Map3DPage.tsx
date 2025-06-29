import { useEffect, useState } from 'react';
import Map, { Marker, Popup } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../../config/api';
import ShrineMarkerPane, { type Shrine } from '../organisms/ShrineMarkerPane';
import LogPane from '../organisms/LogPane';
import type { LogItem } from '../molecules/CustomLogLine';

export default function Map3DPage({ onShowShrine, onShowUser, onShowDiety }: { onShowShrine: (id: number) => void; onShowUser?: (id: number) => void; onShowDiety?: (id: number) => void }) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [selectedShrine, setSelectedShrine] = useState<Shrine | null>(null);
  const { data: logs = [], refetch: refetchLogs, isLoading: logsLoading, error: logsError } = useQuery<LogItem[]>({
    queryKey: ['logs'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/logs`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    },
    refetchInterval: 5000,
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
      const res = await fetch(`${API_BASE}/shrines`);
      return res.json();
    },
  });

  return (
    <>
      <Map
        mapLib={maplibregl}
        initialViewState={{ latitude: 35.68, longitude: 139.76, zoom: 5, pitch: 45 }}
        style={{ height: 'calc(100vh - 3rem)' }}
        mapStyle="https://demotiles.maplibre.org/style.json"
      >
        {position && (
          <Marker longitude={position[1]} latitude={position[0]} anchor="bottom">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
          </Marker>
        )}
        {shrines.map((s) => (
          <Marker key={s.id} longitude={s.lng} latitude={s.lat} anchor="bottom" onClick={() => setSelectedShrine(s)}>
            <img src={s.thumbnailUrl || '/images/marker-icon.png'} className="w-8 h-8" />
          </Marker>
        ))}
        {selectedShrine && (
          <Popup longitude={selectedShrine.lng} latitude={selectedShrine.lat} onClose={() => setSelectedShrine(null)} closeOnClick={false}>
            <ShrineMarkerPane shrine={selectedShrine} refetchLogs={refetchLogs} onShowDetail={onShowShrine} />
          </Popup>
        )}
      </Map>
      <LogPane logs={logs} loading={logsLoading} error={!!logsError} onShowShrine={onShowShrine} onShowUser={onShowUser} onShowDiety={onShowDiety} />
    </>
  );
}
