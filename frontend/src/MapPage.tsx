import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

interface Shrine {
  id: number;
  name: string;
  lat: number;
  lng: number;
  count: number;
  registeredAt: string;
}

export default function MapPage() {
  const queryClient = useQueryClient();

  const [position, setPosition] = useState<[number, number] | null>(null);
  const { data: logs = [], refetch: refetchLogs } = useQuery<{ message: string; time: string }[]>({
    queryKey: ['logs'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/logs');
      return res.json();
    },
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

  const prayMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`http://localhost:3001/shrines/${id}/pray`, {
        method: 'POST',
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shrines'] });
      refetchLogs();
    },
  });

  const remoteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`http://localhost:3001/shrines/${id}/remote-pray`, {
        method: 'POST',
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shrines'] });
      refetchLogs();
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
            <div className="space-y-2">
              <div>{s.name}</div>
              <div>参拝数: {s.count}</div>
              <button
                className="px-2 py-1 bg-blue-500 text-white rounded"
                onClick={() => prayMutation.mutate(s.id)}
              >
                参拝
              </button>
              <button
                className="px-2 py-1 bg-green-500 text-white rounded"
                onClick={() => remoteMutation.mutate(s.id)}
              >
                遥拝
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
      </MapContainer>
      <div
        className="fixed bottom-12 left-0 right-0 max-h-40 overflow-y-auto bg-white border-t"
      >
        {logs.map((l, i) => (
          <div key={i} className="px-2 py-1 text-sm border-b">
            {l.time} {l.message}
          </div>
        ))}
      </div>
    </>
  );
}
