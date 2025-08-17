import { useState } from 'react';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import { useSkin } from '../../skins/SkinContext';
import RankingItem from '../atoms/RankingItem';
import './RankingPane.css';

export type Period = 'all' | 'yearly' | 'monthly' | 'weekly';

export interface RankingItemData {
  rank: number;
  id: number;
  name: string;
  count: number;
}

interface RankingPaneProps {
  itemsByPeriod?: { [key in Period]: RankingItemData[] };
  type: 'shrine' | 'diety' | 'user';
  rankingType?: 'shrine' | 'diety'; // ランキングの種類（神社ランキングか神様ランキングか）
  isLoading?: boolean;
  onItemClick?: (id: number) => void;
  maxItems?: number;
}

const periodLabels: Record<Period, string> = {
  all: '総合',
  yearly: '年間',
  monthly: '月間',
  weekly: '週間',
};

export default function RankingPane({ itemsByPeriod, type, rankingType, isLoading, onItemClick, maxItems = 3 }: RankingPaneProps) {
  const { skin } = useSkin();
  const [period, setPeriod] = useState<Period>('all');
  const safeItemsByPeriod = itemsByPeriod ?? { all: [], yearly: [], monthly: [], weekly: [] };
  const items = safeItemsByPeriod[period] || [];

  return (
    <div className="ranking-pane">
      <Tabs
        id="ranking-tabs"
        activeKey={period}
        onSelect={k => k && setPeriod(k as Period)}
        className="mb-2"
      >
        {(['all', 'yearly', 'monthly', 'weekly'] as Period[]).map(p => (
          <Tab eventKey={p} title={periodLabels[p]} key={p}
            tabClassName={period === p ? 'active-tab' : ''}
            style={period === p ? { background: skin.colors.surface, color: skin.colors.text, borderColor: skin.colors.border } : { color: skin.colors.text }}
          />
        ))}
      </Tabs>

      <div className="d-grid gap-2 mt-2">
        {isLoading ? (
          <div className="text-center py-4 ranking-pane__loading">読み込み中...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-4 ranking-pane__empty">データがありません</div>
        ) : (
          items.slice(0, maxItems).map((item) => (
            <RankingItem
              key={item.id + '-' + item.rank}
              rank={item.rank}
              id={item.id}
              name={item.name}
              count={item.count}
              type={type}
              rankingType={rankingType}
              onItemClick={onItemClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
