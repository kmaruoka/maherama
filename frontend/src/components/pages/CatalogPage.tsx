import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CustomLink from '../atoms/CustomLink';
import CustomText from '../atoms/CustomText';

const API_PORT = import.meta.env.VITE_API_PORT || import.meta.env.PORT || '3000';
const API_BASE = `http://localhost:${API_PORT}`;

interface Item {
  id: number;
  name: string;
  count: number;
  registeredAt: string;
}

export default function CatalogPage({ onShowShrine, onShowDiety }: { onShowShrine?: (id: number) => void; onShowDiety?: (id: number) => void }) {
  const [tab, setTab] = useState<'shrine' | 'diety'>('shrine');
  const [sort, setSort] = useState('registeredAt-desc');
  const [style, setStyle] = useState<'card' | 'list'>('card');

  const { data: shrines = [] } = useQuery<Item[]>({
    queryKey: ['shrines'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/shrines`);
      return res.json();
    },
  });

  const { data: dieties = [] } = useQuery<Item[]>({
    queryKey: ['dieties'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/dieties`);
      return res.json();
    },
  });

  const items = tab === 'shrine' ? shrines : dieties;

  const sorted = [...items].sort((a, b) => {
    const [key, dir] = sort.split('-');
    const mul = dir === 'asc' ? 1 : -1;
    if (key === 'name') return a.name.localeCompare(b.name) * mul;
    if (key === 'count') return (a.count - b.count) * mul;
    return (
      new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime()
    ) * mul;
  });

  const renderItem = (item: Item) => (
    <div key={item.id} className="border p-2 rounded">
      <img src="/vite.svg" alt="thumb" className="w-full h-24 object-contain mb-1" />
      <CustomLink onClick={() => {
        if (tab === 'shrine' && onShowShrine) {
          setTimeout(() => onShowShrine(item.id), 0);
        } else if (tab === 'diety' && onShowDiety) {
          setTimeout(() => onShowDiety(item.id), 0);
        }
      }}>{item.name}</CustomLink>
      <div className="text-sm text-gray-600">参拝数: {item.count}</div>
    </div>
  );

  return (
    <div className="p-4 space-y-2">
      <div className="flex space-x-2">
        <button
          className={`px-2 py-1 border ${tab === 'shrine' ? 'bg-gray-300' : ''}`}
          onClick={() => setTab('shrine')}
        >
          神社
        </button>
        <button
          className={`px-2 py-1 border ${tab === 'diety' ? 'bg-gray-300' : ''}`}
          onClick={() => setTab('diety')}
        >
          神
        </button>
      </div>
      <div className="flex space-x-2">
        <select
          className="border p-1"
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
        <select
          className="border p-1"
          value={style}
          onChange={(e) => setStyle(e.target.value as 'card' | 'list')}
        >
          <option value="card">カード</option>
          <option value="list">リスト</option>
        </select>
      </div>
      {style === 'card' ? (
        <div className="grid grid-cols-2 gap-2">
          {sorted.map(renderItem)}
        </div>
      ) : (
        <div className="space-y-1">
          {sorted.map((item) => (
            <div key={item.id} className="border-b pb-1">
              <CustomLink onClick={() => {
                if (tab === 'shrine' && onShowShrine) {
                  setTimeout(() => onShowShrine(item.id), 0);
                } else if (tab === 'diety' && onShowDiety) {
                  setTimeout(() => onShowDiety(item.id), 0);
                }
              }}>{item.name}</CustomLink>
              <CustomText className="ml-2 text-sm">参拝数: {item.count}</CustomText>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
