import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
    },
  });

  return (
    <MapContainer
      center={[35.68, 139.76] as [number, number]}
      zoom={5}
      style={{ height: 'calc(100vh - 3rem)' }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
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
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
