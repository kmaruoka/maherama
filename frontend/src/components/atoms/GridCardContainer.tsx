import React from 'react';
import './GridCardContainer.css';

export interface GridCardContainerProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  cardWidth?: number;
  cardHeight?: number;
  gap?: number;
  className?: string;
  style?: React.CSSProperties;
  emptyMessage?: string;
  loading?: boolean;
  loadingMessage?: string;
  error?: string | null;
  errorMessage?: string;
}

const GridCardContainer = <T extends any>({
  items,
  renderItem,
  cardWidth,
  cardHeight,
  gap,
  className = '',
  style,
  emptyMessage = 'アイテムがありません',
  loading = false,
  loadingMessage = '読み込み中...',
  error = null,
  errorMessage = 'エラーが発生しました'
}: GridCardContainerProps<T>) => {
  // ローディング状態
  if (loading) {
    return (
      <div className={`grid-card-container grid-card-container--loading ${className}`}>
        <div className="grid-card-container__loading">{loadingMessage}</div>
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div className={`grid-card-container grid-card-container--error ${className}`}>
        <div className="grid-card-container__error">{errorMessage}</div>
      </div>
    );
  }

  // 空の状態
  if (items.length === 0) {
    return (
      <div className={`grid-card-container grid-card-container--empty ${className}`}>
        <div className="grid-card-container__empty">{emptyMessage}</div>
      </div>
    );
  }

  // グリッドスタイルを動的に生成
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, ${cardWidth || 114}px)`,
    gap: `${gap || 4}px`,
    padding: `${gap || 4}px`,
    height: '100%',
    overflow: 'auto',
    justifyContent: 'start',
    ...style
  };

  // 通常のグリッド表示
  return (
    <div className={`grid-card-container ${className}`} style={gridStyle}>
      {items.map((item, index) => (
        <div key={index} className="grid-card-container__cell">
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
};

export default GridCardContainer;
