import React from 'react';
import { GiLibertyWing, GiShintoShrine } from "react-icons/gi";
import { FaAward, FaTrophy } from "react-icons/fa6";

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

function getAwardClassName(grade: number) {
  // デバッグ用ログ
  console.log('getAwardClassName debug:', { grade });
  
  // 1位～3位は同じアイコンで色違い（メタリックなグラデーション）
  if (grade >= 2 && grade <= 5) {
    switch (grade) {
      case 5: 
        console.log('Returning award-badge gold for grade 5');
        return 'award-badge gold'; // 1位（金）
      case 4: 
        console.log('Returning award-badge silver for grade 4');
        return 'award-badge silver'; // 2位（銀）
      case 2: 
        console.log('Returning award-badge bronze for grade 2');
        return 'award-badge bronze'; // 3位（銅）
      default:
        console.log('Returning empty string for grade:', grade);
        return '';
    }
  }
  console.log('Returning empty string for grade:', grade);
  return '';
}

export function AwardIcon({ grade = 1, className, style, embed_data }: AwardIconProps) {
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

  return (
    <>
      <style>
        {`
          .trophy-icon svg,
          .trophy-icon svg *,
          .trophy-icon svg path,
          .trophy-icon svg rect,
          .trophy-icon svg circle,
          .trophy-icon svg polygon,
          .trophy-icon svg g,
          .trophy-icon svg use,
          .trophy-icon svg line,
          .trophy-icon svg polyline,
          .trophy-icon svg ellipse {
            fill: currentColor !important;
            color: currentColor !important;
            stroke: currentColor !important;
          }
          .trophy-icon *[fill],
          .trophy-icon *[stroke] {
            fill: currentColor !important;
            stroke: currentColor !important;
          }
        `}
      </style>
      <span className={`award-badge ${getAwardClassName(grade)}${className ? ' ' + className : ''}`.trim()} style={{ ...style, fontSize: '0.8em' }}>
        {getAwardIcon(grade, embed_data)}
      </span>
    </>
  );
}
