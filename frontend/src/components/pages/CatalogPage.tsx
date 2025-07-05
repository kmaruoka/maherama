import React, { useState } from 'react';
import CustomLink from '../atoms/CustomLink';
import CustomText from '../atoms/CustomText';
import CustomCatalogCard from '../molecules/CustomCatalogCard';
import useShrineList from '../../hooks/useShrineList';
import useDietyList from '../../hooks/useDietyList';

interface Item {
  id: number;
  name: string;
  count: number;
  registeredAt: string;
}

export default function CatalogPage({ onShowShrine, onShowDiety, onShowUser }: { onShowShrine?: (id: number) => void; onShowDiety?: (id: number) => void; onShowUser?: (id: number) => void }) {
  const [tab, setTab] = useState<'shrine' | 'diety'>('shrine');
  const [sort, setSort] = useState('registeredAt-desc');
  const [style, setStyle] = useState<'card' | 'list'>('card');

  const { data: shrines = [] } = useShrineList();

  const { data: dieties = [] } = useDietyList();

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
    <CustomCatalogCard
      key={item.id}
      id={item.id}
      name={item.name}
      count={item.count}
      registeredAt={item.registeredAt}
      onClick={() => {
        if (tab === 'shrine' && onShowShrine) {
          setTimeout(() => onShowShrine(item.id), 0);
        } else if (tab === 'diety' && onShowDiety) {
          setTimeout(() => onShowDiety(item.id), 0);
        } else if (onShowUser) {
          setTimeout(() => onShowUser(item.id), 0);
        }
      }}
      countLabel="参拝数"
    />
  );

  return (
    <div className="p-3">
      <div className="d-flex gap-2 mb-2">
        <button
          className={`btn ${tab === 'shrine' ? 'btn-secondary' : 'btn-outline-secondary'}`}
          onClick={() => setTab('shrine')}
        >
          神社
        </button>
        <button
          className={`btn ${tab === 'diety' ? 'btn-secondary' : 'btn-outline-secondary'}`}
          onClick={() => setTab('diety')}
        >
          神様
        </button>
      </div>
      <div className="d-flex gap-2 mb-3">
        <select
          className="form-select"
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
          className="form-select"
          value={style}
          onChange={(e) => setStyle(e.target.value as 'card' | 'list')}
        >
          <option value="card">カード</option>
          <option value="list">リスト</option>
        </select>
      </div>
      {style === 'card' ? (
        <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, 220px)' }}>
          {sorted.map(renderItem)}
        </div>
      ) : (
        <div className="d-grid gap-2">
          {sorted.map((item) => (
            <div key={item.id} className="border-bottom pb-1">
              <CustomLink onClick={() => {
                if (tab === 'shrine' && onShowShrine) {
                  setTimeout(() => onShowShrine(item.id), 0);
                } else if (tab === 'diety' && onShowDiety) {
                  setTimeout(() => onShowDiety(item.id), 0);
                } else if (onShowUser) {
                  setTimeout(() => onShowUser(item.id), 0);
                }
              }}>{item.name}</CustomLink>
              <CustomText className="ms-2 small">参拝数: {item.count}</CustomText>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
