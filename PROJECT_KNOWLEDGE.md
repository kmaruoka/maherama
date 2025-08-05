# maherama プロジェクト知識ベース

## プロジェクト概要

maheramaは神社参拝マップアプリで、GPSと地図を用いて日本全国の神社を参拝し、神社と祀られている神様を図鑑に登録するアプリケーションです。

### 主要機能
- 地図上での神社参拝（GPS位置ベース）
- 神社・神様の図鑑コレクション
- 称号収集システム
- ユーザーフォロー機能
- 遥拝システム（遠隔参拝）
- 経験値・レベルアップシステム
- 画像投稿・投票システム
- ミッションシステム

## 技術スタック

### フロントエンド
- **React 19.1.0** + **TypeScript**
- **React Router** - ルーティング
- **Leaflet.js** - 地図表示
- **React Query (@tanstack/react-query)** - 状態管理・キャッシュ
- **React Bootstrap** - UIコンポーネント
- **i18next** - 国際化
- **Vite** - ビルドツール

### バックエンド
- **Node.js** + **Express**
- **PostgreSQL** + **PostGIS** - データベース
- **Prisma ORM** - データベースアクセス
- **JWT** - 認証
- **Sharp** - 画像処理
- **Multer** - ファイルアップロード

### インフラ・デプロイ
- **PM2** - プロセス管理
- **Nginx** - リバースプロキシ
- **AWS EC2** - ホスティング
- **PostgreSQL** - データベース

## アーキテクチャ設計

### フロントエンド設計
- **Atomic Design** - コンポーネント設計パターン
  - `atoms/` - 最小単位のコンポーネント
  - `molecules/` - atomsを組み合わせたコンポーネント
  - `organisms/` - 機能単位のコンポーネント
  - `pages/` - ページコンポーネント

### カスタムフック設計
- データ取得ロジックをカスタムフックに分離
- `useShrineList`, `useShrineDetail`, `useDietyList`など
- React Queryを内部で使用し、コンポーネントからは分離

### スキンシステム
- CSS変数ベースのテーマシステム
- 複数のスキン（wa, kane, snow, forest, ai, moon, sakura）
- SkinContextでグローバル状態管理

## データベース設計

### 主要テーブル
- **Shrine** - 神社情報
- **Diety** - 神様情報
- **User** - ユーザー情報
- **ShrinePray** - 参拝記録
- **RemotePray** - 遥拝記録
- **ShrineImage** - 神社画像
- **DietyImage** - 神様画像
- **ImageVote** - 画像投票
- **Follow** - フォロー関係
- **UserTitle** - ユーザー称号
- **UserAbility** - ユーザー能力
- **Mission** - ミッション
- **UserMission** - ユーザーミッション

### 統計テーブル
- **ShrinePrayStats** - 神社参拝統計
- **DietyPrayStats** - 神様参拝統計
- 日次・週次・月次・年次の統計テーブル

## API設計

### 主要エンドポイント
- `GET /shrines` - 神社一覧
- `GET /shrines/:id` - 神社詳細
- `POST /shrines/:id/pray` - 参拝
- `POST /shrines/:id/remote-pray` - 遥拝
- `GET /dieties` - 神様一覧
- `GET /dieties/:id` - 神様詳細
- `GET /users/:id` - ユーザー詳細
- `POST /follows` - フォロー
- `DELETE /follows` - アンフォロー
- `GET /user-rankings` - ユーザーランキング
- `GET /logs` - ログ取得

### 認証
- JWTベースの認証
- `x-user-id`ヘッダーでユーザー識別

## コンポーネント設計

### ページコンポーネント
- `MapPage` - 地図ページ
- `CatalogPage` - 図鑑ページ
- `UserPage` - ユーザーページ
- `SettingsPage` - 設定ページ
- `MissionPage` - ミッションページ

### 有機体コンポーネント
- `ShrinePane` - 神社詳細表示
- `DietyPane` - 神様詳細表示
- `UserPane` - ユーザー詳細表示
- `LogPane` - ログ表示
- `MenuPane` - ナビゲーションメニュー

### 分子コンポーネント
- `CustomLogLine` - ログ行
- `CustomCatalogCard` - カタログカード

### 原子コンポーネント
- `CustomLink` - リンク
- `CustomText` - テキスト
- `CustomImage` - 画像
- `CustomButton` - ボタン

## テスト戦略

### バックエンドテスト
- **Jest** + **Supertest** - APIテスト
- テストファイル: `__tests__/`
- 主要テスト:
  - `users.test.js` - ユーザーAPI
  - `shrines.test.js` - 神社API
  - `dieties.test.js` - 神様API
  - `pray.test.js` - 参拝API
  - `remote-pray.test.js` - 遥拝API
  - `ability.test.js` - 能力API
  - `title.test.js` - 称号API

### テスト実行
```bash
cd frontend/backend
npm test
```

## デプロイメント

### 開発環境
- フロントエンド: `npm run dev` (Vite)
- バックエンド: `npm start` (Node.js)
- データベース: PostgreSQL (localhost:15432)

### 本番環境
- **AWS EC2** + **Nginx** + **PM2**
- デプロイスクリプト: `deploy.sh`
- 設定ファイル: `DEPLOYMENT.md`

### 環境変数
- `DATABASE_URL` - PostgreSQL接続文字列
- `PORT` - バックエンドポート
- `VITE_PORT` - フロントエンドからバックエンドへの接続ポート
- `JWT_SECRET` - JWT秘密鍵

## 開発ルール

### コード品質
- TypeScriptの厳格な型チェック
- ESLintによるコード品質管理
- 未使用のimport、変数、型定義は削除

### スタイリング
- CSS変数ベースのスキンシステム
- BEM形式のCSSクラス命名
- インラインスタイル禁止
- ハードコーディング禁止

### データベース
- Prisma ORM使用
- N+1問題に注意
- マイグレーション履歴管理

### コンポーネント設計
- Atomic Design原則
- 単一責任の原則
- 再利用可能なコンポーネント設計
- カスタムフックによるロジック分離

## 主要な開発フロー

### 新機能開発
1. データベーススキーマ設計（Prisma）
2. マイグレーション実行
3. バックエンドAPI実装
4. カスタムフック作成
5. フロントエンドコンポーネント実装
6. テスト作成・実行

### バグ修正
1. 問題の特定・再現
2. 原因調査
3. 修正実装
4. テスト実行
5. デプロイ

### デプロイ
1. コードレビュー
2. テスト実行
3. 本番環境デプロイ
4. 動作確認

## トラブルシューティング

### よくある問題
- データベース接続エラー
- 画像アップロード失敗
- 地図表示エラー
- 認証エラー

### デバッグ方法
- ブラウザ開発者ツール
- サーバーログ確認
- データベースログ確認
- PM2ログ確認

## 今後の開発方針

### 短期目標
- パフォーマンス最適化
- ユーザビリティ改善
- バグ修正

### 長期目標
- PWA対応
- プッシュ通知
- ソーシャル機能強化
- 多言語対応

---

このドキュメントは開発チームの知識共有と新規開発者のオンボーディングを目的としています。
定期的に更新し、最新の情報を反映してください。 