# maherama

このリポジトリは神社参拝マップアプリのサンプルです。

## クイックスタート

開発環境でアプリを起動する手順は以下の通りです。

### 前提
- Node.js 18 以上
- npm

### 手順
1. 依存関係のインストール
   ```bash
   cd backend
   npm install
   cd ../frontend
   npm install
   ```
2. PostgreSQL を起動
   - ローカルの `127.0.0.1:15432` で動作していることを想定しています。
   - 別の場所で動かす場合は `DB_HOST` などの環境変数で指定してください。
3. バックエンドの起動
   ```bash
   cd backend
   node index.js
   ```
4. フロントエンドの起動（別ターミナルで実行）
   ```bash
   cd frontend
   npm run dev
   ```
5. ブラウザで [http://localhost:5173](http://localhost:5173) を開く

バックエンドはポート3001で動作します。フロントエンドからはこのポートにアクセスします。

アプリを起動すると下部ナビゲーションから地図、図鑑、ユーザー、設定の各ページへ移動できます。
