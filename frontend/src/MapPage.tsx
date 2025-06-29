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

interface LogItem {
  message: string;
  time: string;
  type?: string;
}

export default function MapPage() {
  const queryClient = useQueryClient();

  const [position, setPosition] = useState<[number, number] | null>(null);
  const [isLogExpanded, setIsLogExpanded] = useState(false);
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

  function formatTime(t: string) {
    const d = new Date(t);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(
      d.getMinutes(),
    )}${pad(d.getSeconds())}`;
  }

  function renderMessage(msg: string) {
    const parts = msg.split(/(<[^>]+>)/g).filter(Boolean);
    return parts.map((p, idx) => {
      if (p.startsWith('<') && p.endsWith('>')) {
        const content = p.slice(1, -1);
        let cls = 'log-shrine';
        if (content.startsWith('user:')) {
          cls = 'log-user';
          return (
            <span key={idx} className={cls}>
              {'<'}{content.slice(5)}{'>'}
            </span>
          );
        }
        if (content.startsWith('region:')) {
          cls = 'log-region';
          return (
            <span key={idx} className={cls}>
              {'<'}{content.slice(7)}{'>'}
            </span>
          );
        }
        if (content.startsWith('shrine:')) {
          return (
            <span key={idx} className={cls}>
              {'<'}{content.slice(7)}{'>'}
            </span>
          );
        }
        return (
          <span key={idx} className={cls}>
            {'<'}{content}{'>'}
          </span>
        );
      }
      return <span key={idx}>{p}</span>;
    });
  }

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
        className={`log-pane ${isLogExpanded ? 'log-pane-expanded' : 'log-pane-collapsed'}`}
        onClick={() => setIsLogExpanded(!isLogExpanded)}
        style={{ cursor: 'pointer' }}
      >
        {logsLoading && <div className="px-2 py-1 text-gray-300">ログを読み込み中...</div>}
        {logsError && <div className="px-2 py-1 text-red-400">ログの読み込みに失敗しました</div>}
        {logs.length === 0 && !logsLoading && !logsError && (
          <div className="px-2 py-1 text-gray-300">ログがありません</div>
        )}
        {(isLogExpanded ? logs : logs.slice(0, 1)).map((l, i) => (
          <div
            key={i}
            className={`px-2 py-1 border-b border-gray-600 ${l.type === 'system' ? 'log-system' : ''}`}
          >
            {formatTime(l.time)} {renderMessage(l.message)}
          </div>
        ))}
        {!isLogExpanded && logs.length > 1 && (
          <div className="px-2 py-1 text-center text-gray-400 text-xs">
            他 {logs.length - 1} 件のログがあります
          </div>
        )}
        <div className="px-2 py-1 text-center text-gray-400 text-xs">
          {isLogExpanded ? 'タップで縮小' : 'タップで拡大'}
        </div>
      </div>
    </>
  );
}
