import React from 'react';
import CustomLink from '../atoms/CustomLink';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';

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
  return (
    <div className="ranking-pane">
      <Tabs
        id="ranking-tabs"
        activeKey={period}
        onSelect={(k) => k && onPeriodChange(k as Period)}
        className="mb-2"
      >
        {(['all', 'yearly', 'monthly', 'weekly'] as Period[]).map(p => (
          <Tab eventKey={p} title={periodLabels[p]} key={p} />
        ))}
      </Tabs>
      <div className="d-grid gap-2 mt-2">
        {items.length === 0 && (
          <div className="text-secondary text-center py-4 small">データがありません</div>
        )}
        {items.slice(0, 3).map((item, idx) => (
          <div key={item.id} className="d-flex align-items-center gap-2 bg-light rounded px-3 py-2">
            <span
              className={`rounded-circle d-flex align-items-center justify-content-center fw-bold ${
              idx === 0 ? 'bg-warning text-dark' :
              idx === 1 ? 'bg-secondary text-dark' :
              idx === 2 ? 'bg-orange-400 text-dark' :
              'bg-light text-dark'
            }`}
              style={{ width: '28px', height: '28px' }}>
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
        ))}
      </div>
    </div>
  );
}
