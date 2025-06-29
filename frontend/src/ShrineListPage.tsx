import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

interface Shrine {
  id: number;
  name: string;
  count: number;
  registeredAt: string;
}

export default function ShrineListPage() {
  const [sort, setSort] = useState('registeredAt-desc');
  const { data: shrines = [] } = useQuery<Shrine[]>({
    queryKey: ['shrines'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/shrines');
      return res.json();
    },
  });

  const sorted = [...shrines].sort((a, b) => {
    const [key, dir] = sort.split('-');
    const mul = dir === 'asc' ? 1 : -1;
    if (key === 'name') return a.name.localeCompare(b.name) * mul;
    if (key === 'count') return (a.count - b.count) * mul;
    return (new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime()) * mul;
  });

  return (
    <div className="p-4 space-y-2">
      <select
        className="border p-1 mb-2"
        value={sort}
        onChange={(e) => setSort(e.target.value)}
      >
        <option value="registeredAt-desc">登録日(新しい順)</option>
        <option value="registeredAt-asc">登録日(古い順)</option>
        <option value="name-asc">名前(昇順)</option>
        <option value="name-desc">名前(降順)</option>
        <option value="count-desc">参拝数(多い順)</option>
        <option value="count-asc">参拝数(少ない順)</option>
      </select>
      {sorted.map((s) => (
        <div key={s.id} className="border-b pb-2">
          <Link className="text-blue-600" to={`/shrines/${s.id}`}>{s.name}</Link>
          <div>参拝数: {s.count}</div>
        </div>
      ))}
    </div>
  );
}
