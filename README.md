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
2. バックエンドの起動
   ```bash
   cd backend
   node index.js
   ```
3. フロントエンドの起動（別ターミナルで実行）
   ```bash
   cd frontend
   npm run dev
   ```
4. ブラウザで [http://localhost:5173](http://localhost:5173) を開く

バックエンドはポート3001で動作します。フロントエンドからはこのポートにアクセスします。
