import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

interface Shrine {
  id: number;
  name: string;
  count: number;
  registeredAt: string;
  lat: number;
  lng: number;
}

export default function ShrinePage() {
  const { id } = useParams();
  const { data } = useQuery<Shrine | null>({
    queryKey: ['shrine', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`http://localhost:3001/shrines/${id}`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  if (!data) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4 space-y-2">
      <h2 className="text-xl font-bold">{data.name}</h2>
      <div>登録日: {data.registeredAt}</div>
      <div>参拝数: {data.count}</div>
      <div>緯度: {data.lat}</div>
      <div>経度: {data.lng}</div>
    </div>
  );
}
