import React from 'react';

export type KeyOf<T> = keyof T;

export type ColumnDef<T> = {
  key: string;                        // unique column key
  title: string;                      // header label
  width: number;                      // px固定（横スクロールを前提）
  minWidth?: number;                  // 将来の可変対応
  maxWidth?: number;
  accessor?: (row: T) => React.ReactNode;  // 既定セル
  cellRenderer?: (ctx: CellRenderContext<T>) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  headerClassName?: string;
  ariaLabel?: string;
};

export type CellRenderContext<T> = {
  row: T;
  rowIndex: number;
  column: ColumnDef<T>;
  isSelected: boolean;
};

export type RowKeyGetter<T> = (row: T, index: number) => string | number;

export type VariableSize = {
  mode: 'variable';
  getItemSize: (index: number) => number;
  estimatedItemSize?: number;
};

export type FixedSize = {
  mode: 'fixed';
  itemSize: number; // px
};

export type SizeMode = VariableSize | FixedSize; 