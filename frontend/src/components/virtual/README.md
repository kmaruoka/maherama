# Virtual Components

react-windowを使った再利用可能な仮想化コンポーネントライブラリです。

## 特徴

- **スタイル一元管理**: CSS変数（トークン）で配色・余白・行高などを集中管理
- **実装の儀式化**: AutoSizer・itemKey・overscan 等をラップして毎回書かない
- **表現力**: List / Grid に加え Table を第一級サポート（固定ヘッダー、列定義、精密なレイアウト）
- **制御と拡張**: セル/行レンダラは render-props で差し替え可能。列幅・行高は固定/可変の両対応
- **既存UIとの親和性**: MUIやBootstrapと共存できる className / slotProps / components で拡張可能

## コンポーネント

### VirtualThemeProvider

CSS変数を提供するテーマプロバイダーです。

```tsx
import { VirtualThemeProvider } from './components/virtual';

<VirtualThemeProvider 
  tokens={{
    'v-row-height': 36,
    'v-font-size': '13px',
  }}
>
  {/* 子コンポーネント */}
</VirtualThemeProvider>
```

### VList

1次元のリスト（Fixed/Variable 両対応）です。

```tsx
import { VList } from './components/virtual';

<VList
  items={items}
  sizeMode={{ mode: 'fixed', itemSize: 48 }}
  rowRenderer={(item, index, isSelected) => (
    <div>{item.name}</div>
  )}
  rowKey={(item) => item.id}
  isSelected={(item) => item.id % 5 === 0}
/>
```

### VTable

業務要件向けのテーブル（固定ヘッダー・列定義・列幅・セルレンダリング）です。

```tsx
import { VTable, ColumnDef } from './components/virtual';

const columns: ColumnDef<Row>[] = [
  { key: 'id', title: 'ID', width: 80, align: 'right' },
  { key: 'name', title: '名称', width: 240, accessor: (r) => r.name },
  {
    key: 'note', title: '備考', width: 320,
    cellRenderer: ({ row }) => <i>{row.note ?? '—'}</i>
  },
];

<VTable
  rows={rows}
  columns={columns}
  sizeMode={{ mode: 'fixed', itemSize: 36 }}
  rowKey={(r) => r.id}
  isSelected={(r) => r.id % 10 === 0}
/>
```

### VGrid

2次元グリッド（カード一覧など）です。

```tsx
import { VGrid } from './components/virtual';

<VGrid
  items={products}
  columnCount={4}
  columnWidth={250}
  rowHeight={220}
  renderCard={(product) => (
    <div>
      <img src={product.image} alt={product.name} />
      <div>{product.name}</div>
    </div>
  )}
/>
```

## CSS変数

以下のCSS変数でスタイルをカスタマイズできます：

```css
:root {
  --v-font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans JP", "Hiragino Kaku Gothic ProN", "メイリオ", sans-serif;
  --v-font-size: 14px;
  --v-row-height: 40px;
  --v-row-padding-x: 8px;
  --v-cell-gap: 8px;
  --v-color-fg: #1f2937;
  --v-color-bg: #ffffff;
  --v-color-muted: #6b7280;
  --v-color-border: #e5e7eb;
  --v-row-hover-bg: #f9fafb;
  --v-row-selected-bg: #eef2ff;
  --v-header-bg: #f3f4f6;
  --v-header-fg: #111827;
  --v-scrollbar-thumb: #c9ccd1;
  --v-scrollbar-track: #f3f4f6;
}
```

## 使用例

詳細な使用例は `examples/` ディレクトリを参照してください：

- `VTableExample.tsx` - テーブルの使用例
- `VGridExample.tsx` - グリッドの使用例
- `VListExample.tsx` - リストの使用例

## 設計のポイント

1. **スタイルはCSS変数に集約**: 各画面では tokens で行高や配色を上書きするだけ
2. **横スクロール前提の列幅px固定**: テーブルの"精密レイアウト"を確実化
3. **ヘッダー/ボディの幅同期**: totalWidth を双方で使いズレを根絶
4. **タイトル/セルは省略記号**: .ellipsis で統一、title 属性でフル表示
5. **キーの既定値を統一**: rowKey 未指定時は index。IDがあるなら必ず渡す
6. **可変行高も対応**: sizeMode.mode === 'variable' で getItemSize を渡せばOK
7. **拡張ポイント**: cellRenderer でセル単位の表現カスタム、rowClassName で条件付きスタイル
8. **外部UIとの共存**: className を噛ませて MUI / Bootstrap のユーティリティやテーマを併用可 