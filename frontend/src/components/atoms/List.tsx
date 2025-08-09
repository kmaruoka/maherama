import React from 'react';
import './List.css';

export interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  layout?: 'grid' | 'list' | 'horizontal';
  columns?: number | string;
  gap?: number;
  className?: string;
  style?: React.CSSProperties;
  emptyMessage?: string;
  loading?: boolean;
  loadingMessage?: string;
  error?: string | null;
  errorMessage?: string;
  virtualized?: boolean;
  itemHeight?: number;
  containerHeight?: number;
}

const List = <T extends any>({
  items,
  renderItem,
  layout = 'grid',
  columns = 'auto',
  gap = 6,
  className = '',
  style,
  emptyMessage = 'アイテムがありません',
  loading = false,
  loadingMessage = '読み込み中...',
  error = null,
  errorMessage = 'エラーが発生しました',
  virtualized = false,
  itemHeight,
  containerHeight
}: ListProps<T>) => {
  const listClasses = [
    'list',
    `list--${layout}`,
    className
  ].filter(Boolean).join(' ');

  const gridStyle = layout === 'grid' ? {
    gridTemplateColumns: typeof columns === 'number' ? `repeat(${columns}, 1fr)` : columns,
    gap: `${gap}px`
  } : {};

  const containerStyle = {
    ...style,
    ...gridStyle,
    ...(containerHeight ? { height: containerHeight } : {})
  };

  // ローディング状態
  if (loading) {
    return (
      <div className="list list--loading">
        <div className="list__loading">{loadingMessage}</div>
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div className="list list--error">
        <div className="list__error">{errorMessage}</div>
      </div>
    );
  }

  // 空の状態
  if (items.length === 0) {
    return (
      <div className="list list--empty">
        <div className="list__empty">{emptyMessage}</div>
      </div>
    );
  }

  // 仮想化リスト（簡易実装）
  if (virtualized && itemHeight && containerHeight) {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = 0; // 実際の実装ではスクロール位置から計算
    const endIndex = Math.min(startIndex + visibleCount, items.length);
    const visibleItems = items.slice(startIndex, endIndex);

    return (
      <div className="list list--virtualized" style={containerStyle}>
        <div
          className="list__virtualized-container"
          style={{ height: items.length * itemHeight }}
        >
          <div
            className="list__virtualized-content"
            style={{ transform: `translateY(${startIndex * itemHeight}px)` }}
          >
            {visibleItems.map((item, index) => (
              <div key={startIndex + index} style={{ height: itemHeight }}>
                {renderItem(item, startIndex + index)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 通常のリスト
  return (
    <div className={listClasses} style={containerStyle}>
      {items.map((item, index) => (
        <div key={index} className="list__item">
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
};

export default List;
