import React from 'react';

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
interface TrophyIconProps {
  grade?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function TrophyIcon({ grade = 1, className, style }: TrophyIconProps) {
  const getTrophyIcon = (grade: number) => {
    switch (grade) {
      case 4: return '🏆'; // 最高グレード
      case 3: return '🥇'; // 高級グレード
      case 2: return '🥈'; // 中級グレード
      case 1: default: return '🥉'; // 初級グレード
    }
  };

  const getTrophyStyle = (grade: number) => {
    const baseStyle = { fontSize: '1.2em', ...style };
    switch (grade) {
      case 4: return { ...baseStyle, filter: 'brightness(1.2) saturate(1.5)' };
      case 3: return { ...baseStyle, filter: 'brightness(1.1) saturate(1.3)' };
      case 2: return { ...baseStyle, filter: 'brightness(1.0) saturate(1.1)' };
      case 1: default: return baseStyle;
    }
  };

  return (
    <span className={className} style={getTrophyStyle(grade)}>
      {getTrophyIcon(grade)}
    </span>
  );
}
