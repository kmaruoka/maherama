import React, { useMemo } from 'react';
import { FixedSizeList, VariableSizeList } from 'react-window';
import type { ListChildComponentProps } from 'react-window';
import type { ColumnDef, RowKeyGetter, SizeMode } from './types';
import { useMeasureContainer } from './useMeasureContainer';

export type VTableProps<T> = {
  rows: T[];
  columns: ColumnDef<T>[];
  sizeMode: SizeMode;                 // 行高: fixed or variable
  rowKey?: RowKeyGetter<T>;
  headerHeight?: number;              // 既定: var(--v-row-height)
  className?: string;
  tableWidth?: number;                // 明示幅（未指定なら親幅）
  tableHeight?: number;               // 明示高（未指定なら親高）
  overscanCount?: number;
  rowClassName?: (row: T, index: number) => string | undefined;
  selected?: { isSelected: (row: T, index: number) => boolean };
};

export function VTable<T>(props: VTableProps<T>) {
  const {
    rows, columns, sizeMode, rowKey,
    headerHeight, className, tableWidth, tableHeight,
    overscanCount = 8, rowClassName, selected
  } = props;

  const { ref, size } = useMeasureContainer<HTMLDivElement>();
  const H = tableHeight ?? size.height;
  const W = tableWidth ?? size.width;

  const keyGetter: RowKeyGetter<T> = useMemo(() => {
    if (rowKey) return rowKey;
    return (_row, i) => i;
  }, [rowKey]);

  const totalWidth = useMemo(() => columns.reduce((acc, c) => acc + (c.width ?? 0), 0), [columns]);

  // Stickyヘッダー
  const Header = (
    <div className="v-header" style={{ width: totalWidth }}>
      {columns.map(col => (
        <div
          key={col.key}
          className={['v-cell', col.headerClassName].filter(Boolean).join(' ')}
          style={{ width: col.width, justifyContent: alignToJustify(col.align) }}
          aria-label={col.ariaLabel || col.title}
          title={col.title}
        >
          <span className="ellipsis">{col.title}</span>
        </div>
      ))}
    </div>
  );

  const Row = ({ index, style }: ListChildComponentProps) => {
    const row = rows[index];
    const isSelected = selected?.isSelected ? selected.isSelected(row, index) : false;
    const cls = ['v-row', isSelected ? 'is-selected' : '', rowClassName?.(row, index) || ''].join(' ');

    return (
      <div className={cls} style={{ ...style, width: totalWidth }} data-index={index} data-key={keyGetter(row, index)}>
        {columns.map(col => {
          const content = col.cellRenderer
            ? col.cellRenderer({ row, rowIndex: index, column: col, isSelected: isSelected })
            : (col.accessor ? col.accessor(row) : (row as any)[col.key]);

          return (
            <div
              key={col.key}
              className={['v-cell', col.className].filter(Boolean).join(' ')}
              style={{ width: col.width, justifyContent: alignToJustify(col.align) }}
              title={typeof content === 'string' ? content : undefined}
            >
              <div className="ellipsis">{content}</div>
            </div>
          );
        })}
      </div>
    );
  };

  if (!H || !W) {
    return <div ref={ref} className={['v-scroll', className].join(' ')} style={{ width: '100%', height: '100%' }} />;
  }

  const listHeight = H - (headerHeight ?? (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--v-row-height')) || 40));

  return (
    <div ref={ref} className={['v-scroll', className].join(' ')} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 2, overflow: 'hidden' }}>
        <div style={{ width: W, overflowX: 'auto' }}>
          <div style={{ width: totalWidth }}>{Header}</div>
        </div>
      </div>
      <div style={{ width: W, height: listHeight, overflow: 'auto' }} className="v-scroll">
        <div style={{ width: totalWidth }}>
          {sizeMode.mode === 'fixed' ? (
            <FixedSizeList
              height={listHeight}
              width={totalWidth}
              itemCount={rows.length}
              itemSize={sizeMode.itemSize}
              itemKey={(index) => keyGetter(rows[index], index)}
              overscanCount={overscanCount}
            >
              {Row}
            </FixedSizeList>
          ) : (
            <VariableSizeList
              height={listHeight}
              width={totalWidth}
              itemCount={rows.length}
              itemSize={sizeMode.getItemSize}
              estimatedItemSize={sizeMode.estimatedItemSize}
              itemKey={(index) => keyGetter(rows[index], index)}
              overscanCount={overscanCount}
            >
              {Row}
            </VariableSizeList>
          )}
        </div>
      </div>
    </div>
  );
}

function alignToJustify(a: 'left' | 'center' | 'right' | undefined) {
  switch (a) {
    case 'center': return 'center';
    case 'right': return 'flex-end';
    default: return 'flex-start';
  }
} 