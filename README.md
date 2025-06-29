# maherama

このリポジトリは神社参拝マップアプリのサンプルです。

## 前提
- Node.js 18 以上
- npm
- PostgreSQL がローカルの `127.0.0.1:15432` で動作していること
  - 別の場所で動かす場合は `.env` の `DATABASE_URL` で指定してください

## セットアップ手順（まとめてコピー＆ペースト可）

```bash
# 必要に応じてリポジトリを初期化・最新化
# git reset --hard
# git clean -fdx
# git pull

# バックエンド（依存関係のインストール・DB初期化・seed投入・起動）
cd backend
npm install
cp .env.example .env
npx prisma migrate reset --force
npx prisma generate
node index.js

# （別ターミナルで）
# フロントエンドの依存関係のインストールと起動
cd ../frontend
npm install
npm run dev
```
- 地図のマーカー表示に必要なLeafletのアイコン画像は `MapPage.tsx` で自動的に設定されます。Quickstart 手順に追加の作業は不要です。

- バックエンドはポート3000で動作します。フロントエンドからはこのポートにアクセスします。
- アプリを起動すると下部ナビゲーションから地図、図鑑、ユーザー、設定の各ページへ移動できます。
- 図鑑からは神社情報ページ（ShrinePage）や神情報ページ（DietyPage）に遷移できます。
