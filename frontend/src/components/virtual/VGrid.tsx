import React from 'react';
import { FixedSizeGrid, VariableSizeGrid } from 'react-window';
import type { GridChildComponentProps } from 'react-window';
import { useMeasureContainer } from './useMeasureContainer';

type VGridProps<T> = {
  items: T[];
  columnCount: number;
  columnWidth: number;
  rowHeight: number;
  renderCard: (item: T, index: number) => React.ReactNode;
  overscanCount?: number;
  className?: string;
  height?: number;
  width?: number;
};

export function VGrid<T>({
  items,
  columnCount,
  columnWidth,
  rowHeight,
  renderCard,
  overscanCount = 2,
  className,
  height,
  width,
}: VGridProps<T>) {
  const { ref, size } = useMeasureContainer<HTMLDivElement>();
  const H = height ?? size.height;
  const W = width ?? size.width;
  const rowCount = Math.ceil(items.length / columnCount);

  const Cell = ({ columnIndex, rowIndex, style }: GridChildComponentProps) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= items.length) return null;
    return <div style={style}>{renderCard(items[index], index)}</div>;
  };

  if (!H || !W) {
    return <div ref={ref} className={className} style={{ width: '100%', height: '100%' }} />;
  }

  return (
    <div ref={ref} className={className} style={{ width: '100%', height: '100%' }}>
      <FixedSizeGrid
        columnCount={columnCount}
        columnWidth={columnWidth}
        height={H}
        rowCount={rowCount}
        rowHeight={rowHeight}
        width={W}
        overscanRowCount={overscanCount}
      >
        {Cell}
      </FixedSizeGrid>
    </div>
  );
}
