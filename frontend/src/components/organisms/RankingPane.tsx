import React from 'react';
import CustomLink from '../atoms/CustomLink';

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
      <div className="flex gap-4 border-b mb-2 text-sm">
        {(['all', 'yearly', 'monthly', 'weekly'] as Period[]).map(p => (
          <button
            key={p}
            className={`px-2 pb-1 border-b-2 transition-colors duration-100 ${period === p ? 'border-blue-500 text-blue-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => onPeriodChange(p)}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>
      <div className="space-y-2 mt-2">
        {items.length === 0 && (
          <div className="text-gray-500 text-center py-4 text-xs">データがありません</div>
        )}
        {items.slice(0, 3).map((item, idx) => (
          <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-base font-bold ${
              idx === 0 ? 'bg-yellow-400 text-yellow-900' :
              idx === 1 ? 'bg-gray-300 text-gray-700' :
              idx === 2 ? 'bg-orange-400 text-orange-900' :
              'bg-gray-200 text-gray-600'
            }`}>
              {idx + 1}
            </span>
            <CustomLink
              onClick={() => onItemClick && onItemClick(item.id)}
              className={`font-bold hover:underline tag-link tag-${type}`}
            >
              {item.name}
            </CustomLink>
            <span className="text-sm text-gray-500 ml-2">{item.count}回</span>
          </div>
        ))}
      </div>
    </div>
  );
}
