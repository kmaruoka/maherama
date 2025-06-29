# maherama

このリポジトリは神社参拝マップアプリのサンプルです。

## 前提
- Node.js 18 以上
- npm
- PostgreSQL がローカルの `127.0.0.1:15432` で動作していること
  - 別の場所で動かす場合は `.env` の `DATABASE_URL` で指定してください

## セットアップ手順

### バックエンド
```bash
cd backend
npm install
# .env.example を .env にコピー（Windows: copy .env.example .env）
cp .env.example .env
npx prisma migrate reset --force
npx prisma generate
node index.js
```

### フロントエンド
```bash
cd frontend
npm install
npm run dev
```

- バックエンドはポート3000で動作します。フロントエンドからはこのポートにアクセスします。
- アプリを起動すると下部ナビゲーションから地図、図鑑、ユーザー、設定の各ページへ移動できます。
- 図鑑からは神社情報ページ（ShrinePage）や神情報ページ（DietyPage）に遷移できます。
