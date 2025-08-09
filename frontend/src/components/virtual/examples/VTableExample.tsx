import React from 'react';
import { VirtualThemeProvider, VTable } from '../index';
import type { ColumnDef } from '../types';

type Row = { 
  id: number; 
  name: string; 
  code: string; 
  qty: number; 
  price: number; 
  note?: string; 
};

const columns: ColumnDef<Row>[] = [
  { key: 'id',    title: 'ID',     width: 80,  align: 'right' },
  { key: 'name',  title: '名称',    width: 240, accessor: (r) => r.name },
  { key: 'code',  title: 'コード',  width: 140, accessor: (r) => r.code, className: 'mono' },
  { key: 'qty',   title: '数量',    width: 100, align: 'right', accessor: (r) => r.qty.toLocaleString() },
  { key: 'price', title: '単価',    width: 120, align: 'right', accessor: (r) => r.price.toLocaleString() },
  {
    key: 'note',  title: '備考',    width: 320,
    cellRenderer: ({ row }) => <i style={{ opacity: 0.8 }}>{row.note ?? '—'}</i>
  },
];

const rows: Row[] = Array.from({ length: 50000 }).map((_, i) => ({
  id: i + 1,
  name: `製品-${i + 1}`,
  code: `P${(i + 1).toString().padStart(6, '0')}`,
  qty: Math.floor(Math.random() * 1000),
  price: Math.floor(Math.random() * 50000),
  note: i % 7 === 0 ? '長めの備考が入る場合は省略表示' : undefined,
}));

export default function VTableExample() {
  return (
    <VirtualThemeProvider tokens={{
      'v-row-height': 36,            // プロジェクト共通の行高に
      'v-font-size': '13px',
    }}>
      <div style={{ height: '100vh', padding: 12 }}>
        <div style={{ height: '80vh', border: '1px solid var(--v-color-border)' }}>
          <VTable<Row>
            rows={rows}
            columns={columns}
            sizeMode={{ mode: 'fixed', itemSize: 36 }}
            rowKey={(r) => r.id}
            selected={{ isSelected: (r) => r.id % 10 === 0 }}
          />
        </div>
      </div>
    </VirtualThemeProvider>
  );
} 