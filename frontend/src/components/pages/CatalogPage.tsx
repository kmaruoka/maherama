import { useState, useCallback } from 'react'; 
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import CustomCatalogCard from '../molecules/CustomCatalogCard';
import CustomCatalogListItem from '../molecules/CustomCatalogListItem';
import useShrineList from '../../hooks/useShrineList';
import useDietyList from '../../hooks/useDietyList';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Container from 'react-bootstrap/Container';
import { useTranslation } from 'react-i18next';
import type { GridChildComponentProps } from 'react-window';

interface Item {
  id: number;
  name: string;
  count: number;
  registeredAt: string;
  lastPrayedAt?: string;
}

interface GridItemData {
  sorted: (Item & { thumbnailUrl?: string })[];
  columnCount: number;
  CARD_WIDTH: number;
  CARD_HEIGHT: number;
  GAP: number;
  renderItem: (item: Item & { thumbnailUrl?: string }) => React.ReactNode;
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

  const renderItem = useCallback((item: Item & { thumbnailUrl?: string }) => (
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
  ), [tab, onShowShrine, onShowDiety, onShowUser, t]);

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
        <div style={{ width: '100%', height: 'calc(100vh - 200px)' }}>
          <AutoSizer>
            {({ height, width }) => {
              const CARD_WIDTH = 230;
              const CARD_HEIGHT = 360;
              const GAP = 10;
              const columnCount = Math.max(1, Math.floor((width + GAP) / (CARD_WIDTH + GAP)));
              const rowCount = Math.ceil(sorted.length / columnCount);
              return (
                <Grid
                  columnCount={columnCount}
                  rowCount={rowCount}
                  columnWidth={CARD_WIDTH + GAP}
                  rowHeight={CARD_HEIGHT + GAP}
                  width={width}
                  height={height}
                  itemData={{ sorted, columnCount, CARD_WIDTH, CARD_HEIGHT, GAP, renderItem }}
                >
                  {({ columnIndex, rowIndex, style: cellStyle, data }: GridChildComponentProps<GridItemData>) => {
                    const { sorted, columnCount, CARD_WIDTH, CARD_HEIGHT, GAP, renderItem } = data;
                    const index = rowIndex * columnCount + columnIndex;
                    if (index >= sorted.length) return null;
                    return (
                      <div
                        style={{
                          ...cellStyle,
                          left: cellStyle.left,
                          top: cellStyle.top,
                          width: CARD_WIDTH,
                          height: CARD_HEIGHT,
                          margin: GAP / 2,
                          boxSizing: 'border-box',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {renderItem(sorted[index])}
                      </div>
                    );
                  }}
                </Grid>
              );
            }}
          </AutoSizer>
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
