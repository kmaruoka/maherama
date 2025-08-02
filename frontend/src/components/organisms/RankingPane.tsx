import React, { useState } from 'react';
import CustomLink from '../atoms/CustomLink';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import { useSkin } from '../../skins/SkinContext';

export type Period = 'all' | 'yearly' | 'monthly' | 'weekly';

export interface RankingItem {
  rank: number;
  id: number;
  name: string;
  count: number;
}

interface RankingPaneProps {
  itemsByPeriod?: { [key in Period]: RankingItem[] };
  type: 'user' | 'shrine' | 'diety';
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

export default function RankingPane({ itemsByPeriod, type, isLoading, onItemClick, maxItems = 3 }: RankingPaneProps) {
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
            style={period === p ? { background: skin.colors.rankingTabActiveBg, color: skin.colors.text, borderColor: skin.colors.rankingRowBorder } : { color: skin.colors.text }}
          />
        ))}
      </Tabs>
      <div className="d-grid gap-2 mt-2">
        {isLoading ? (
          <div className="text-center py-4 small" style={{ color: skin.colors.textMuted }}>読み込み中...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-4 small" style={{ color: skin.colors.textMuted }}>データがありません</div>
        ) : (
          items.slice(0, maxItems).map((item, idx) => {
            let badgeBg = skin.colors.rankingBadgeOther;
            if (idx === 0) badgeBg = skin.colors.rankingBadge1;
            else if (idx === 1) badgeBg = skin.colors.rankingBadge2;
            else if (idx === 2) badgeBg = skin.colors.rankingBadge3;
            return (
              <div key={item.id + '-' + item.rank} className="d-flex align-items-center gap-2 rounded px-3 py-2"
                style={{
                  background: skin.colors.rankingRowBg,
                  border: `1px solid ${skin.colors.rankingRowBorder}`,
                }}
              >
                <span
                  className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                  style={{ width: '28px', height: '28px', background: badgeBg, color: skin.colors.rankingBadgeText }}>
                  {idx + 1}
                </span>
                <span style={{ fontSize: '1.1rem', fontWeight: 500, color: skin.colors.text }}>
                  <CustomLink
                    onClick={() => onItemClick && onItemClick(item.id)}
                    type={type}
                  >
                    {item.name}
                  </CustomLink>
                </span>
                <span className="small ms-2" style={{ color: skin.colors.text }}>{item.count}回</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
