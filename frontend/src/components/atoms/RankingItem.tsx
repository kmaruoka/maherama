import React from 'react';
import CustomLink from './CustomLink';
import ShrineBadge from './ShrineBadge';
import DietyBadge from './DietyBadge';
import { useSkin } from '../../skins/SkinContext';
import './RankingItem.css';

export interface RankingItemProps {
  rank: number;
  id: number;
  name: string;
  count: number;
  type: 'shrine' | 'diety' | 'user';
  onItemClick?: (id: number) => void;
}

const RankingItem: React.FC<RankingItemProps> = ({ 
  rank, 
  id, 
  name, 
  count, 
  type, 
  onItemClick 
}) => {
  const { skin } = useSkin();

  const renderBadge = () => {
    if (type === 'shrine') {
      return <ShrineBadge rank={rank} />;
    } else if (type === 'diety') {
      return <DietyBadge rank={rank} />;
    }
    return null;
  };

  return (
    <div className="ranking-item"
      style={{
        background: skin.colors.rankingRowBg,
        border: `1px solid ${skin.colors.rankingRowBorder}`,
        color: skin.colors.text,
      }}
    >
      <span className="ranking-item__badge">
        {renderBadge()}
      </span>
      <span className="ranking-item__name">
        <CustomLink
          onClick={() => onItemClick && onItemClick(id)}
          type={type}
        >
          {name}
        </CustomLink>
      </span>
      <span className="ranking-item__count">{count}回</span>
    </div>
  );
};

export default RankingItem; 