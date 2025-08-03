import React from 'react';
import { GiLibertyWing, GiShintoShrine } from "react-icons/gi";
import { FaAward, FaTrophy } from "react-icons/fa6";
import ShrineBadge from './ShrineBadge';
import DietyBadge from './DietyBadge';
import MissionBadge from './MissionBadge';
import './Badge.css';

interface CustomTextProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function CustomText({ children, className, style }: CustomTextProps) {
  return (
    <span className={className} style={style}>
      {children}
    </span>
  );
}

// グレードに応じたトロフィーアイコンコンポーネント
interface AwardIconProps {
  grade?: number;
  className?: string;
  style?: React.CSSProperties;
  embed_data?: any; // 称号の埋め込みデータ
}

export function AwardIcon({ grade = 1, className, style, embed_data }: AwardIconProps) {
  // CSS変数からバッジサイズを取得
  const getBadgeSize = () => {
    const size = getComputedStyle(document.documentElement).getPropertyValue('--award-badge-size-px');
    return parseInt(size) || 14;
  };

  const getAwardIcon = (grade: number, embed_data?: any) => {
    if (embed_data?.diety && grade >= 2 && grade <= 5) {
      return <GiLibertyWing />;
    }
    if (embed_data?.shrine && grade >= 2 && grade <= 5) {
      return <GiShintoShrine />;
    }
    if (embed_data?.shrine || (embed_data?.name && embed_data.name.includes('神社'))) {
      return <GiShintoShrine />;
    }
    if (embed_data?.diety || (embed_data?.name && (embed_data.name.includes('神') || embed_data.name.includes('大神')))) {
      return <GiLibertyWing />;
    }
    if (grade >= 4) {
      return <FaTrophy />;
    }
    return <FaAward />;
  };

  // 神社の称号の場合は専用バッジを使用
  if (embed_data?.shrine && grade >= 2 && grade <= 5) {
    return <ShrineBadge rank={grade === 5 ? 1 : grade === 4 ? 2 : 3} size={getBadgeSize()} className={className} />;
  }
  
  // 神様の称号の場合は専用バッジを使用
  if (embed_data?.diety && grade >= 2 && grade <= 5) {
    return <DietyBadge rank={grade === 5 ? 1 : grade === 4 ? 2 : 3} size={getBadgeSize()} className={className} />;
  }

  // ミッションの称号の場合は専用バッジを使用
  if (embed_data?.mission && grade >= 2 && grade <= 5) {
    return <MissionBadge 
      rank={grade === 5 ? 1 : grade === 4 ? 2 : 3} 
      size={getBadgeSize()} 
      className={className}
      missionImageUrl={embed_data?.missionImageUrl}
    />;
  }

  // その他の称号は元のaward-badgeシステムを使用
  const getBadgeClass = () => {
    if (grade === 5) return 'award-badge gold';
    if (grade === 4) return 'award-badge silver';
    if (grade === 2) return 'award-badge bronze';
    return 'award-badge';
  };

  return (
    <span className={`${getBadgeClass()} ${className || ''}`.trim()} style={{ ...style }}>
      {getAwardIcon(grade, embed_data)}
    </span>
  );
}
