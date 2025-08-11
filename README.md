# maherama

このリポジトリは神社参拝マップアプリのサンプルです。

## 前提
- Node.js 18 以上
- npm
- PostgreSQL がローカルの `127.0.0.1:15432` で動作していること
  - 別の場所で動かす場合は `.env` の `DATABASE_URL` で指定してください

## 開発環境の設定

### 改行コードの統一
このプロジェクトでは改行コードをLF（Unix形式）に統一しています。

- `.editorconfig`ファイルで改行コードの設定を管理
- `.gitattributes`でGitでの改行コード変換を設定
- VSCode設定で`files.eol: "\n"`を設定
- 末尾スペースは自動的に削除されます

既存ファイルの改行コードと末尾スペースを修正する場合：
```bash
# フロントエンド
cd frontend
npm run fix-line-endings

# バックエンド
cd frontend/backend
npm run fix-line-endings
```

## 環境変数の設定

### バックエンド
バックエンドは `PORT` 環境変数でポート番号を指定する必要があります。

```bash
# .envファイルに追加
PORT=3000
NODE_ENV=development
JWT_SECRET=your-dev-jwt-secret

# 開発環境用メールサーバー（MailHog推奨）
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=

# フロントエンドURL
FRONTEND_URL=http://localhost:5173
```

### フロントエンド
フロントエンドは `VITE_PORT` 環境変数でバックエンドのポート番号を指定します。

```bash
# .envファイルに追加
VITE_PORT=3000
```

## セットアップ手順

### バックエンド
```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate reset --force
npx prisma generate
npm start
```

### フロントエンド
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## 会員登録機能

### 機能概要
- ユーザー登録（メールアドレス確認付き）
- アカウント有効化
- ログイン・ログアウト
- パスワードリセット
- テストユーザーログイン

### メールサーバー設定

#### 開発環境でのメール送信
開発環境では以下の2つの方法でメール送信をテストできます：

1. **メール送信シミュレーション（デフォルト）**
   - コンソールにメール内容を表示
   - 実際のメールは送信されません

2. **MailHog（推奨）**
   - 実際のメールサーバーをシミュレート
   - Web UIでメールを確認可能

#### MailHogのセットアップ
```bash
# MailHogのインストール（Windows）
choco install mailhog

# MailHogの起動
mailhog

# または、バックエンドディレクトリで
npm run mailhog
```

#### メールの確認
- MailHog Web UI: http://localhost:8025
- 送信されたメールを確認
- メール内のリンクをクリックしてアカウント有効化をテスト

詳細な設定方法は `frontend/backend/MAIL_SETUP.md` を参照してください。

## テスト実行

### バックエンドAPIテスト
```bash
cd backend
npm test
```

テスト内容：
- `/user-rankings` APIの正常系テスト
- `/shrines` APIの正常系テスト
- `/dieties` APIの正常系テスト
- `/users/:id` APIの正常系・異常系テスト

- バックエンドは指定したポートで動作します。フロントエンドからはこのポートにアクセスします。
- アプリを起動すると下部ナビゲーションから地図、図鑑、ユーザー、設定の各ページへ移動できます。
- 図鑑からは神社情報ページ（ShrinePage）や神情報ページ（DietyPage）に遷移できます。
