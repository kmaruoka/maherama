import React from 'react';
import CustomLink from './CustomLink';
import ShrineBadge from './ShrineBadge';
import DietyBadge from './DietyBadge';
import { GiLibertyWing, GiShintoShrine } from 'react-icons/gi';
import { useSkin } from '../../skins/SkinContext';
import './RankingItem.css';

export interface RankingItemProps {
  rank: number;
  id: number;
  name: string;
  count: number;
  type: 'shrine' | 'diety' | 'user';
  rankingType?: 'shrine' | 'diety'; // ランキングの種類（神社ランキングか神様ランキングか）
  onItemClick?: (id: number) => void;
}

const RankingItem: React.FC<RankingItemProps> = ({ 
  rank, 
  id, 
  name, 
  count, 
  type, 
  rankingType,
  onItemClick 
}) => {
  const { skin } = useSkin();

  const renderBadge = () => {
    if (type === 'shrine') {
      return <ShrineBadge rank={rank} />;
    } else if (type === 'diety') {
      return <DietyBadge rank={rank} />;
    } else if (type === 'user') {
      // ユーザーランキングの場合は1～3位は称号と同じアイコン、4位以下は順位番号を表示
      if (rank <= 3) {
        // ランキングの種類に応じてアイコンを選択
        const IconComponent = rankingType === 'diety' ? GiLibertyWing : GiShintoShrine;
        return (
          <span 
            className={`award-badge ${rank === 1 ? 'gold' : rank === 2 ? 'silver' : 'bronze'}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              flexShrink: 0
            }}
          >
            <IconComponent size={16} />
          </span>
        );
      } else {
        return (
          <span 
            className="ranking-item__rank-number"
            style={{
              background: '#6c757d',
              color: '#fff',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              flexShrink: 0
            }}
          >
            {rank}
          </span>
        );
      }
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