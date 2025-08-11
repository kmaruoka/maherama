import { useCallback, useEffect, useMemo } from 'react';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import { useTranslation } from 'react-i18next';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList as List } from 'react-window';
import { useDietyList } from '../../hooks/useDietyList';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import { useShrineList } from '../../hooks/useShrineList';
import GridCardContainer from '../atoms/GridCardContainer';
import PageLayout from '../atoms/PageLayout';
import CatalogGridCard from '../molecules/CatalogGridCard';
import CustomCatalogListItem from '../molecules/CustomCatalogListItem';

interface Item {
  id: number;
  name: string;
  kana?: string;
  count: number;
  catalogedAt?: string;
  lastPrayedAt?: string;
  image_id?: number;
  image_url?: string;
  image_url_xs?: string;
  image_url_s?: string;
  image_url_m?: string;
  image_url_l?: string;
  image_url_xl?: string;
  image_by?: string;
}



export default function CatalogPage({ onShowShrine, onShowDiety, onShowUser }: { onShowShrine?: (id: number) => void; onShowDiety?: (id: number) => void; onShowUser?: (id: number) => void }) {
  const { t } = useTranslation();
  const [tab, setTab] = useLocalStorageState<'shrine' | 'diety'>('catalogTab', 'shrine');
  const [sort, setSort] = useLocalStorageState('catalogSort', 'catalogedAt-desc');
  const [style, setStyle] = useLocalStorageState<'card' | 'list'>('catalogStyle', 'card');

  const { data: shrines = [], isLoading: isShrinesLoading, error: shrinesError } = useShrineList();

  const { data: dieties = [], isLoading: isDietiesLoading, error: dietiesError } = useDietyList();



  // タブに応じてアイテムを選択
  const currentItems = tab === 'shrine' ? shrines : dieties;

  const handleItemClick = useCallback((item: Item) => {
    if (tab === 'shrine' && onShowShrine) {
      setTimeout(() => onShowShrine(item.id), 0);
    } else if (tab === 'diety' && onShowDiety) {
      setTimeout(() => onShowDiety(item.id), 0);
    } else if (onShowUser) {
      setTimeout(() => onShowUser(item.id), 0);
    }
  }, [tab, onShowShrine, onShowDiety, onShowUser]);

    // ソート処理
  const sorted = useMemo(() => {
    const [key, dir] = sort.split('-');
    const mul = dir === 'asc' ? 1 : -1;

    return currentItems.sort((a, b) => {
      if (key === 'name') {
        // 読み仮名（kana）があればそれでソート、なければname
        const aKana = a.kana || a.name;
        const bKana = b.kana || b.name;
        return aKana.localeCompare(bKana) * mul;
      }
      if (key === 'count') return (a.count - b.count) * mul;
      if (key === 'lastPrayedAt') {
        // 最終参拝日でソート（nullの場合は最古として扱う）
        const aDate = a.lastPrayedAt ? new Date(a.lastPrayedAt).getTime() : 0;
        const bDate = b.lastPrayedAt ? new Date(b.lastPrayedAt).getTime() : 0;
        return (aDate - bDate) * mul;
      }
      // catalogedAt（図鑑収録日）でソート
      const aDate = a.catalogedAt ? new Date(a.catalogedAt).getTime() : 0;
      const bDate = b.catalogedAt ? new Date(b.catalogedAt).getTime() : 0;
      return (aDate - bDate) * mul;
    });
  }, [currentItems, sort]);



  // DOM要素の状態をデバッグ
  useEffect(() => {
    const cardGrid = document.querySelector('.card-grid');
    const listContainer = document.querySelector('.catalog-page__list-container');

    if (cardGrid) {
      const computedStyle = getComputedStyle(cardGrid);
    }

    if (listContainer) {
      const computedStyle = getComputedStyle(listContainer);
    }
  }, [sorted.length, style]);

  const renderItem = useCallback((item: Item & { image_url?: string }) => {
    return (
      <CatalogGridCard
        key={item.id}
        name={item.name}
        count={item.count}
        catalogedAt={item.catalogedAt || ''}
        lastPrayedAt={item.lastPrayedAt}
        onClick={() => handleItemClick(item)}
        image_url={item.image_url}
        image_url_s={item.image_url_s}
        image_url_m={item.image_url_m}
        image_url_l={item.image_url_l}
      />
    );
  }, [tab, t, handleItemClick]);

  return (
    <PageLayout style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
                <option value="catalogedAt-desc">{t('sortByRegisteredDateDesc')}</option>
      <option value="catalogedAt-asc">{t('sortByRegisteredDateAsc')}</option>
          <option value="lastPrayedAt-desc">{t('sortByLastPrayedDateDesc')}</option>
          <option value="lastPrayedAt-asc">{t('sortByLastPrayedDateAsc')}</option>
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
      {/* エラー表示 */}
      {(shrinesError || dietiesError) && (
        <div className="text-danger text-center p-3">
          {shrinesError && <div>神社データの読み込みに失敗しました</div>}
          {dietiesError && <div>神様データの読み込みに失敗しました</div>}
        </div>
      )}

      {/* ローディング表示 */}
      {(isShrinesLoading || isDietiesLoading) && (
        <div className="text-center p-3">
          <div>データを読み込み中...</div>
        </div>
      )}

      {style === 'card' ? (
        <GridCardContainer
          items={sorted}
          renderItem={renderItem}
          cardWidth={114}
          cardHeight={200}
          gap={4}
          emptyMessage="アイテムがありません"
        />
      ) : (
        <>
          {/* ヘッダ行 */}
          <AutoSizer disableHeight>
            {({ width }: { width: number }) => (
              <div className="catalog-page__list-header" style={{ width: width }}>
                <div className="catalog-page__list-col--name">{t('name')}</div>
                <div className="catalog-page__list-col--count">{t('count')}</div>
                <div className="catalog-page__list-col--date">{t('catalogedAt')} / {t('lastPrayedAt')}</div>
              </div>
            )}
          </AutoSizer>
          {/* リスト本体 */}
          <div className="catalog-page__list-container">
            <AutoSizer>
              {({ height, width }: { height: number; width: number }) => {
                const LIST_ROW_HEIGHT = 40;
                return (
                  <List
                    height={height}
                    width={width}
                    itemCount={sorted.length}
                    itemSize={LIST_ROW_HEIGHT}
                    itemData={{ sorted, tab, onShowShrine, onShowDiety, onShowUser }}
                  >
                    {({ index, style, data }: { index: number; style: React.CSSProperties; data: any }) => {
                      const { sorted, tab, onShowShrine, onShowDiety, onShowUser } = data;
                      const item = sorted[index];


                      return (
                        <div className="catalog-page__list-row" style={style}>
                          <CustomCatalogListItem
                            key={item.id}
                            name={item.name}
                            count={item.count}
                            catalogedAt={item.catalogedAt}
                            lastPrayedAt={item.lastPrayedAt}
                            showLabels={false}
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
                        </div>
                      );
                    }}
                  </List>
                );
              }}
            </AutoSizer>
          </div>
        </>
      )}
    </PageLayout>
  );
}
