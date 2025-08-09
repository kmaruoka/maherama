import React, { useEffect, useState } from 'react';
import type { GridChildComponentProps } from 'react-window';
import { FixedSizeGrid } from 'react-window';
import './CardGrid.css';

// CSS変数から値を取得する関数
const getCSSVariable = (variableName: string, defaultValue: number): number => {
  if (typeof window === 'undefined') return defaultValue;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName);
  return value ? parseInt(value) : defaultValue;
};

const getCardWidth = (): number => getCSSVariable('--card-width', 114);
const getCardHeight = (): number => getCSSVariable('--card-height', 200);
const getCardGap = (): number => getCSSVariable('--card-gap', 4);
const getCardGapMobile = (): number => getCSSVariable('--card-gap-mobile', 2);

export interface CardGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  cardWidth?: number;
  cardHeight?: number;
  gap?: number;
  className?: string;
  style?: React.CSSProperties;
  scrollbarWidth?: number;
  emptyMessage?: string;
  loading?: boolean;
  loadingMessage?: string;
  error?: string | null;
  errorMessage?: string;
  overscanCount?: number;
  height?: number;
  width?: number;
}

const CardGrid = <T extends any>({
  items,
  renderItem,
  cardWidth,
  cardHeight,
  gap,
  className = '',
  style,
  scrollbarWidth = 25,
  emptyMessage = 'アイテムがありません',
  loading = false,
  loadingMessage = '読み込み中...',
  error = null,
  errorMessage = 'エラーが発生しました',
  overscanCount = 2,
  height,
  width
}: CardGridProps<T>) => {
  // デフォルト値をCSS変数から取得
  const defaultCardWidth = cardWidth ?? getCardWidth();
  const defaultCardHeight = cardHeight ?? getCardHeight();
  const [isMobile, setIsMobile] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 600);
    };

    const updateContainerSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    checkMobile();
    updateContainerSize();

    window.addEventListener('resize', () => {
      checkMobile();
      updateContainerSize();
    });

    return () => window.removeEventListener('resize', updateContainerSize);
  }, []);

  // CSS変数からgapを取得（指定されていない場合）
  const effectiveGap = gap ?? (isMobile ? getCardGapMobile() : getCardGap());

  // コンテナサイズを計算
  const containerWidth = width ?? containerSize.width;
  const containerHeight = height ?? containerSize.height;

  // グリッドの列数を計算
  const columnCount = Math.floor((containerWidth - effectiveGap) / (defaultCardWidth + effectiveGap));
  const actualColumnCount = Math.max(1, columnCount);
  const rowCount = Math.ceil(items.length / actualColumnCount);

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

  // セルレンダラー
  const Cell = ({ columnIndex, rowIndex, style }: GridChildComponentProps) => {
    const index = rowIndex * actualColumnCount + columnIndex;
    if (index >= items.length) return null;

    return (
      <div
        className="card-grid__virtual-cell"
        style={{
          ...style,
          padding: `${effectiveGap / 2}px`
        }}
      >
        {renderItem(items[index], index)}
      </div>
    );
  };

  // コンテナサイズが取得できない場合は通常のグリッドを表示
  if (!containerWidth || !containerHeight) {
    const gridStyle = {
      '--card-grid-template-columns': `repeat(auto-fit, ${defaultCardWidth}px)`,
      '--card-grid-template-rows': `repeat(auto-fill, ${defaultCardHeight}px)`,
      '--card-grid-gap': `${effectiveGap}px`,
      '--card-grid-padding': `${effectiveGap}px`,
      '--card-grid-cell-min-width': `${defaultCardWidth}px`,
      '--card-grid-cell-min-height': `${defaultCardHeight}px`
    } as React.CSSProperties;

    return (
      <div
        ref={containerRef}
        className={`card-grid ${className}`}
        style={{ ...style, height: style?.height || '400px', width: style?.width || '100%' }}
      >
        <div className="card-grid__fallback-container" style={gridStyle}>
          {items.map((item, index) => (
            <div key={index} className="card-grid__fallback-cell">
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 仮想化グリッドを表示
  return (
    <div
      ref={containerRef}
      className={`card-grid ${className}`}
      style={{ ...style, height: containerHeight, width: containerWidth }}
    >
      <FixedSizeGrid
        columnCount={actualColumnCount}
        columnWidth={defaultCardWidth + effectiveGap}
        height={containerHeight}
        rowCount={rowCount}
        rowHeight={defaultCardHeight + effectiveGap}
        width={containerWidth}
        overscanRowCount={overscanCount}
      >
        {Cell}
      </FixedSizeGrid>
    </div>
  );
};

export default CardGrid;
