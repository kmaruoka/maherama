import React, { useState, useEffect } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
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
}

interface GridItemData<T> {
  items: T[];
  columnCount: number;
  cardWidth: number;
  cardHeight: number;
  gap: number;
  renderItem: (item: T, index: number) => React.ReactNode;
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
  errorMessage = 'エラーが発生しました'
}: CardGridProps<T>) => {
  // デフォルト値をCSS変数から取得
  const defaultCardWidth = cardWidth ?? getCardWidth();
  const defaultCardHeight = cardHeight ?? getCardHeight();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 600);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // CSS変数からgapを取得（指定されていない場合）
  const effectiveGap = gap ?? (isMobile ? getCardGapMobile() : getCardGap());

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

  return (
    <div className={`card-grid ${className}`} style={style}>
      <AutoSizer>
        {({ height, width }: { height: number; width: number }) => {
          const adjustedWidth = width - scrollbarWidth;
          const columnCount = Math.max(1, Math.floor((adjustedWidth + effectiveGap / 2) / (defaultCardWidth + effectiveGap)));
          const rowCount = Math.ceil(items.length / columnCount);

          return (
            <Grid
              columnCount={columnCount}
              rowCount={rowCount}
              columnWidth={defaultCardWidth + effectiveGap}
              rowHeight={defaultCardHeight + effectiveGap}
              width={width}
              height={height}
              itemData={{ items, columnCount, cardWidth: defaultCardWidth, cardHeight: defaultCardHeight, gap: effectiveGap, renderItem }}
            >
              {({ columnIndex, rowIndex, style: cellStyle, data }: any) => {
                const { items, columnCount, cardWidth, cardHeight, gap, renderItem } = data as GridItemData<T>;
                const index = rowIndex * columnCount + columnIndex;

                if (index >= items.length) return null;

                return (
                  <div
                    className="card-grid__cell"
                    style={{
                      ...cellStyle,
                      left: cellStyle.left,
                      top: cellStyle.top,
                      width: cardWidth,
                      height: cardHeight,
                      margin: gap / 2,
                    }}
                  >
                    {renderItem(items[index], index)}
                  </div>
                );
              }}
            </Grid>
          );
        }}
      </AutoSizer>
    </div>
  );
};

export default CardGrid;
