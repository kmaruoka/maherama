import React from 'react';
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
  items: RankingItem[];
  type: 'user' | 'shrine' | 'diety';
  period: Period;
  onPeriodChange: (period: Period) => void;
  onItemClick?: (id: number) => void;
}

const periodLabels: Record<Period, string> = {
  all: '総合',
  yearly: '年間',
  monthly: '月間',
  weekly: '週間',
};

export default function RankingPane({ items, type, period, onPeriodChange, onItemClick }: RankingPaneProps) {
  const { skin } = useSkin();
  return (
    <div className="ranking-pane">
      <Tabs
        id="ranking-tabs"
        activeKey={period}
        onSelect={(k) => k && onPeriodChange(k as Period)}
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
        {items.length === 0 && (
          <div className="text-secondary text-center py-4 small">データがありません</div>
        )}
        {items.slice(0, 3).map((item, idx) => {
          let badgeBg = skin.colors.rankingBadgeOther;
          if (idx === 0) badgeBg = skin.colors.rankingBadge1;
          else if (idx === 1) badgeBg = skin.colors.rankingBadge2;
          else if (idx === 2) badgeBg = skin.colors.rankingBadge3;
          return (
            <div key={item.id} className="d-flex align-items-center gap-2 rounded px-3 py-2"
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
              <CustomLink
                onClick={() => onItemClick && onItemClick(item.id)}
                type={type}
              >
                {item.name}
              </CustomLink>
              <span className="small text-secondary ms-2">{item.count}回</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
