# maherama

このリポジトリは神社参拝マップアプリのサンプルです。

## 前提
- Node.js 18 以上
- npm
- PostgreSQL がローカルの `127.0.0.1:15432` で動作していること
  - 別の場所で動かす場合は `.env` の `DATABASE_URL` で指定してください

## 環境変数の設定

### バックエンド
バックエンドは `PORT` 環境変数でポート番号を指定する必要があります。

```bash
# .envファイルに追加
PORT=3001
```

または、起動時に指定：
```bash
PORT=3001 npm start
```

### フロントエンド
フロントエンドは `VITE_API_PORT` 環境変数でバックエンドのポート番号を指定する必要があります。

```bash
# .envファイルに追加
VITE_API_PORT=3001
```

または、起動時に指定：
```bash
VITE_API_PORT=3001 npm run dev
```

## セットアップ手順

### バックエンド
```bash
cd backend
npm install
# .env.example を .env にコピー（Windows: copy .env.example .env）
cp .env.example .env
# .envファイルにPORT=3001を追加
npx prisma migrate reset --force
npx prisma generate
PORT=3001 npm start
```

### フロントエンド
```bash
cd frontend
npm install
# .envファイルを作成し、VITE_API_PORT=3001を追加
VITE_API_PORT=3001 npm run dev
```

## テスト実行

### バックエンドAPIテスト
```bash
cd backend
PORT=3001 npm test
```

テスト内容：
- `/user-rankings` APIの正常系テスト
- `/shrines` APIの正常系テスト  
- `/dieties` APIの正常系テスト
- `/users/:id` APIの正常系・異常系テスト

- バックエンドは指定したポートで動作します。フロントエンドからはこのポートにアクセスします。
- アプリを起動すると下部ナビゲーションから地図、図鑑、ユーザー、設定の各ページへ移動できます。
- 図鑑からは神社情報ページ（ShrinePage）や神情報ページ（DietyPage）に遷移できます。
