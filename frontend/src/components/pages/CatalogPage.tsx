import { useState } from 'react'; 
import CustomCatalogCard from '../molecules/CustomCatalogCard';
import CustomCatalogListItem from '../molecules/CustomCatalogListItem';
import useShrineList from '../../hooks/useShrineList';
import useDietyList from '../../hooks/useDietyList';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Container from 'react-bootstrap/Container';
import { useTranslation } from 'react-i18next';

interface Item {
  id: number;
  name: string;
  count: number;
  registeredAt: string;
  lastPrayedAt?: string;
}

export default function CatalogPage({ onShowShrine, onShowDiety, onShowUser }: { onShowShrine?: (id: number) => void; onShowDiety?: (id: number) => void; onShowUser?: (id: number) => void }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'shrine' | 'diety'>('shrine');
  const [sort, setSort] = useState('registeredAt-desc');
  const [style, setStyle] = useState<'card' | 'list'>('card');

  const { data: shrines = [] } = useShrineList();

  const { data: dieties = [] } = useDietyList();

  const items = tab === 'shrine' ? shrines : dieties;

  const sorted = [...items].sort((a, b) => {
    const [key, dir] = sort.split('-');
    const mul = dir === 'asc' ? 1 : -1;
    if (key === 'name') {
      // 読み仮名（kana）があればそれでソート、なければname
      const aKana = a.kana || a.name;
      const bKana = b.kana || b.name;
      return aKana.localeCompare(bKana) * mul;
    }
    if (key === 'count') return (a.count - b.count) * mul;
    return (
      new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime()
    ) * mul;
  });

  const renderItem = (item: Item & { thumbnailUrl?: string }) => (
    <CustomCatalogCard
      key={item.id}
      name={item.name}
      count={item.count}
      registeredAt={item.registeredAt}
      lastPrayedAt={item.lastPrayedAt}
      onClick={() => {
        if (tab === 'shrine' && onShowShrine) {
          setTimeout(() => onShowShrine(item.id), 0);
        } else if (tab === 'diety' && onShowDiety) {
          setTimeout(() => onShowDiety(item.id), 0);
        } else if (onShowUser) {
          setTimeout(() => onShowUser(item.id), 0);
        }
      }}
      countLabel={t('count')}
      type={tab}
      dateLabel={t('recordedDate')}
      thumbnailUrl={tab === 'diety' ? item.thumbnailUrl : undefined}
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
        <Tab eventKey="shrine" title={t('shrine')} />
        <Tab eventKey="diety" title={t('diety')} />
      </Tabs>
      <div className="d-flex gap-2 mb-3">
        <select
          className="form-select skin-select"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="registeredAt-desc">{t('sortByRegisteredDateDesc')}</option>
          <option value="registeredAt-asc">{t('sortByRegisteredDateAsc')}</option>
          <option value="name-asc">{t('sortByNameAsc')}</option>
          <option value="name-desc">{t('sortByNameDesc')}</option>
          <option value="count-desc">{t('sortByCountDesc')}</option>
          <option value="count-asc">{t('sortByCountAsc')}</option>
        </select>
        <select
          className="form-select skin-select"
          value={style}
          onChange={(e) => setStyle(e.target.value as 'card' | 'list')}
        >
          <option value="card">{t('card')}</option>
          <option value="list">{t('list')}</option>
        </select>
      </div>
      {style === 'card' ? (
        <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, 220px)' }}>
          {sorted.map(renderItem)}
        </div>
      ) : (
        <Container fluid>
          {sorted.map((item) => (
            <CustomCatalogListItem
              key={item.id}
              name={item.name}
              count={item.count}
              recordedDate={item.registeredAt}
              lastPrayedAt={item.lastPrayedAt}
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
        </Container>
      )}
    </div>
  );
}
