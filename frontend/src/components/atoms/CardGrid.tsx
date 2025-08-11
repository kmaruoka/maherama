import React from 'react';
import './CardGrid.css';

export interface CardGridProps<T> {
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

const CardGrid = <T extends any>({
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
}: CardGridProps<T>) => {
  // ローディング状態
  if (loading) {
    return (
      <div className={`card-grid card-grid--loading ${className}`}>
        <div className="card-grid__loading">{loadingMessage}</div>
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div className={`card-grid card-grid--error ${className}`}>
        <div className="card-grid__error">{errorMessage}</div>
      </div>
    );
  }

  // 空の状態
  if (items.length === 0) {
    return (
      <div className={`card-grid card-grid--empty ${className}`}>
        <div className="card-grid__empty">{emptyMessage}</div>
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
    justifyContent: 'center',
    ...style
  };

  // 通常のグリッド表示
  return (
    <div className={`card-grid ${className}`} style={gridStyle}>
      {items.map((item, index) => (
        <div key={index} className="card-grid__cell">
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
};

export default CardGrid;
