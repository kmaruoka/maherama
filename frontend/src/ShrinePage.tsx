import { useQuery } from '@tanstack/react-query';

const API_PORT = import.meta.env.VITE_API_PORT || import.meta.env.PORT || '3000';
const API_BASE = `http://localhost:${API_PORT}`;

interface Shrine {
  id: number;
  name: string;
  kana?: string;
  count: number;
  registeredAt: string;
  lat: number;
  lng: number;
  address?: string;
  location?: string;
  thumbnailUrl?: string;
  thumbnailBy?: string;
  founded?: string;
  history?: string;
  festivals?: string;
  description?: string;
}

export default function ShrinePage({ id }: { id: number }) {
  const { data } = useQuery<Shrine | null>({
    queryKey: ['shrine', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/shrines/${id}`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  if (!data) {
    return <div className="p-4">Loading...</div>;
  }

  // ダミー祭神リスト（本来はAPIで取得）
  const dietyList = [
    { id: 1, name: '天照大御神' },
    { id: 2, name: '月読命' },
  ];

  return (
    <div className="p-4 space-y-2 max-w-md mx-auto">
      <div className="flex items-center space-x-4">
        {data.thumbnailUrl && (
          <div className="relative">
            <img src={data.thumbnailUrl} alt="サムネイル" className="w-24 h-24 object-contain rounded shadow" />
            {data.thumbnailBy && (
              <div className="absolute left-1 bottom-1 bg-black bg-opacity-60 text-xs text-white px-1 rounded">by {data.thumbnailBy}</div>
            )}
          </div>
        )}
        <div>
          <div className="text-2xl font-bold">{data.name}</div>
          {data.kana && <div className="text-gray-400 text-sm">{data.kana}</div>}
        </div>
      </div>
      <div className="text-sm text-gray-300">{data.location}</div>
      {data.founded && <div>創建: {data.founded}</div>}
      {data.description && <div className="text-sm text-gray-200">{data.description}</div>}
      <div className="mt-2">
        <div className="font-bold">祭神</div>
        <ul className="list-disc ml-6">
          {dietyList.map(d => (
            <li key={d.id} className="text-blue-300 underline cursor-pointer">{d.name}</li>
          ))}
        </ul>
      </div>
      {data.history && <div><span className="font-bold">歴史・伝承</span><div className="text-sm">{data.history}</div></div>}
      {data.festivals && <div><span className="font-bold">祭礼</span><div className="text-sm">{data.festivals}</div></div>}
      <div className="flex space-x-4 mt-2">
        <div>参拝数: <span className="font-bold">{data.count}</span></div>
        <div>緯度: {data.lat}</div>
        <div>経度: {data.lng}</div>
      </div>
      <div className="text-xs text-gray-400">登録日: {data.registeredAt}</div>
    </div>
  );
}
