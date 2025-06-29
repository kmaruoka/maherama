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

# 依存関係のインストール
cd backend
npm install
npx prisma generate
cp .env.example .env
npx prisma migrate dev --name init
npx prisma db seed

cd ../frontend
npm install

# バックエンドの起動（別ターミナルで）
cd ../backend
node index.js

# フロントエンドの起動（別ターミナルで）
cd frontend
npm run dev
```

- バックエンドはポート3001で動作します。フロントエンドからはこのポートにアクセスします。
- アプリを起動すると下部ナビゲーションから地図、図鑑、ユーザー、設定の各ページへ移動できます。
- 図鑑からは神社情報ページ（ShrinePage）や神情報ページ（DietyPage）に遷移できます。
