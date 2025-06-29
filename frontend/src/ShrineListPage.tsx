import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

interface Shrine {
  id: number;
  name: string;
  count: number;
  registeredAt: string;
}

export default function ShrineListPage() {
  const { data: shrines = [] } = useQuery<Shrine[]>({
    queryKey: ['shrines'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/shrines');
      return res.json();
    },
  });

  return (
    <div className="p-4 space-y-2">
      {shrines.map((s) => (
        <div key={s.id} className="border-b pb-2">
          <Link className="text-blue-600" to={`/shrines/${s.id}`}>{s.name}</Link>
          <div>参拝数: {s.count}</div>
        </div>
      ))}
    </div>
  );
}
