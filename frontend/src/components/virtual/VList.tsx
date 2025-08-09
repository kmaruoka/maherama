import React, { useMemo } from 'react';
import { FixedSizeList, VariableSizeList } from 'react-window';
import type { ListChildComponentProps } from 'react-window';
import type { SizeMode, RowKeyGetter } from './types';
import { useMeasureContainer } from './useMeasureContainer';

export type VListProps<T> = {
  items: T[];
  sizeMode: SizeMode;
  rowClassName?: (row: T, index: number) => string | undefined;
  rowRenderer: (row: T, index: number, isSelected: boolean) => React.ReactNode;
  itemKey?: RowKeyGetter<T>;
  overscanCount?: number;
  height?: number;               // 明示高さ（未指定なら親の高さ計測）
  width?: number;                // 明示幅（未指定なら親の幅計測）
  selected?: { isSelected: (row: T, index: number) => boolean };
  onScroll?: (offset: { scrollOffset: number }) => void;
  className?: string;
};

export function VList<T>(props: VListProps<T>) {
  const {
    items, sizeMode, rowRenderer, itemKey,
    overscanCount = 8, height, width,
    rowClassName, selected, onScroll, className
  } = props;

  const { ref, size } = useMeasureContainer<HTMLDivElement>();
  const H = height ?? size.height;
  const W = width ?? size.width;

  const keyGetter: RowKeyGetter<T> = useMemo(() => {
    if (itemKey) return itemKey;
    return (_row, index) => index; // 既定：index
  }, [itemKey]);

  const Row = ({ index, style }: ListChildComponentProps) => {
    const row = items[index];
    const isSel = selected?.isSelected ? selected.isSelected(row, index) : false;
    const cls = ['v-row', isSel ? 'is-selected' : '', rowClassName?.(row, index) || '', 'v-scroll-row'].join(' ');
    return (
      <div className={cls} style={style} data-index={index} data-key={keyGetter(row, index)}>
        {rowRenderer(row, index, isSel)}
      </div>
    );
  };

  if (!H || !W) {
    return <div ref={ref} className={['v-scroll', className].join(' ')} style={{ width: '100%', height: '100%' }} />;
  }

  if (sizeMode.mode === 'fixed') {
    return (
      <FixedSizeList
        className={['v-scroll', className].join(' ')}
        height={H}
        width={W}
        itemCount={items.length}
        itemSize={sizeMode.itemSize}
        itemKey={(index) => keyGetter(items[index], index)}
        overscanCount={overscanCount}
        onScroll={onScroll}
      >
        {Row}
      </FixedSizeList>
    );
  }

  return (
    <VariableSizeList
      className={['v-scroll', className].join(' ')}
      height={H}
      width={W}
      itemCount={items.length}
      itemSize={sizeMode.getItemSize}
      estimatedItemSize={sizeMode.estimatedItemSize}
      itemKey={(index) => keyGetter(items[index], index)}
      overscanCount={overscanCount}
      onScroll={onScroll}
    >
      {Row}
    </VariableSizeList>
  );
} 