# レスポンシブデザイン - ブレークポイント変数

このプロジェクトでは、Bootstrap 5のブレークポイントに準拠したCSS変数を使用してレスポンシブデザインを一元管理しています。

## ブレークポイント変数

### 最小値（min-width）
```css
--breakpoint-xs: 0px;      /* Extra small devices */
--breakpoint-sm: 576px;    /* Small devices */
--breakpoint-md: 768px;    /* Medium devices */
--breakpoint-lg: 992px;    /* Large devices */
--breakpoint-xl: 1200px;   /* Extra large devices */
--breakpoint-xxl: 1400px;  /* Extra extra large devices */
```

### 最大値（max-width）
```css
--breakpoint-xs-max: 575.98px;  /* Extra small devices max */
--breakpoint-sm-max: 767.98px;  /* Small devices max */
--breakpoint-md-max: 991.98px;  /* Medium devices max */
--breakpoint-lg-max: 1199.98px; /* Large devices max */
--breakpoint-xl-max: 1399.98px; /* Extra large devices max */
```

## 使用方法

### 1. メディアクエリでの使用
```css
/* スマホサイズ（576px未満） */
@media (max-width: var(--breakpoint-xs-max)) {
  .my-component {
    font-size: 0.875rem;
    padding: 1rem;
  }
}

/* タブレット以上（576px以上） */
@media (min-width: var(--breakpoint-sm)) {
  .my-component {
    font-size: 1rem;
    padding: 1.5rem;
  }
}

/* デスクトップ以上（768px以上） */
@media (min-width: var(--breakpoint-md)) {
  .my-component {
    font-size: 1.125rem;
    padding: 2rem;
  }
}
```

### 2. 段階的なスタイル適用（モバイルファースト）
```css
/* 基本スタイル（モバイルファースト） */
.my-component {
  padding: 1rem;
  font-size: 0.875rem;
  display: block;
}

/* タブレット以上 */
@media (min-width: var(--breakpoint-sm)) {
  .my-component {
    padding: 1.5rem;
    font-size: 1rem;
    display: flex;
  }
}

/* デスクトップ以上 */
@media (min-width: var(--breakpoint-md)) {
  .my-component {
    padding: 2rem;
    font-size: 1.125rem;
  }
}
```

### 3. 表示/非表示の制御
```css
/* スマホでは非表示、タブレット以上で表示 */
.desktop-only {
  display: none;
}

@media (min-width: var(--breakpoint-sm)) {
  .desktop-only {
    display: block;
  }
}

/* スマホでは表示、タブレット以上で非表示 */
.mobile-only {
  display: block;
}

@media (min-width: var(--breakpoint-sm)) {
  .mobile-only {
    display: none;
  }
}
```

## ブレークポイントの基準

| ブレークポイント | デバイス | 用途 |
|-----------------|----------|------|
| xs (0px) | スマートフォン（縦向き） | 基本レイアウト |
| sm (576px) | スマートフォン（横向き） | 1列→2列レイアウト |
| md (768px) | タブレット | ナビゲーション展開 |
| lg (992px) | デスクトップ | サイドバー表示 |
| xl (1200px) | 大画面デスクトップ | 余白調整 |
| xxl (1400px) | 超大画面 | 最大幅制限 |

## ベストプラクティス

1. **モバイルファースト**: 基本スタイルをモバイル用に設定し、大きな画面用に追加
2. **一貫性**: プロジェクト全体で同じブレークポイント変数を使用
3. **段階的**: 必要に応じて段階的にスタイルを適用
4. **テスト**: 各ブレークポイントでレイアウトを確認
5. **シンプル**: 標準的なCSSメディアクエリを使用し、複雑なユーティリティクラスは避ける

## ファイル構成

```
frontend/src/styles/
├── breakpoints.css    # ブレークポイント変数定義
└── README.md         # このドキュメント
```

各CSSファイルでは `@import './styles/breakpoints.css';` で変数を利用できます。
