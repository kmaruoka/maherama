import { useState } from 'react'; 
import CustomCatalogCard from '../molecules/CustomCatalogCard';
import CustomCatalogListItem from '../molecules/CustomCatalogListItem';
import useShrineList from '../../hooks/useShrineList';
import useDietyList from '../../hooks/useDietyList';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';

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
      type={tab}
      dateLabel="収録日"
    />
  );

  return (
    <div className="p-3">
      <Tabs
        id="catalog-tabs"
        activeKey={tab}
        onSelect={k => k && setTab(k as 'shrine' | 'diety')}
        className="mb-2"
      >
        <Tab eventKey="shrine" title="神社" />
        <Tab eventKey="diety" title="神様" />
      </Tabs>
      <div className="d-flex gap-2 mb-3">
        <select
          className="form-select skin-select"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="registeredAt-desc">収録日(新しい順)</option>
          <option value="registeredAt-asc">収録日(古い順)</option>
          <option value="name-asc">名前(昇順)</option>
          <option value="name-desc">名前(降順)</option>
          <option value="count-desc">参拝数(多い順)</option>
          <option value="count-asc">参拝数(少ない順)</option>
        </select>
        <select
          className="form-select skin-select"
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
            <CustomCatalogListItem
              key={item.id}
              name={item.name}
              count={item.count}
              onClick={() => {
                if (tab === 'shrine' && onShowShrine) {
                  setTimeout(() => onShowShrine(item.id), 0);
                } else if (tab === 'diety' && onShowDiety) {
                  setTimeout(() => onShowDiety(item.id), 0);
                } else if (onShowUser) {
                  setTimeout(() => onShowUser(item.id), 0);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
