#!/bin/bash

# maherama デプロイスクリプト
# 使用方法: ./deploy.sh [production|staging]

set -e  # エラー時に停止

# 色付きログ関数
log_info() {
    echo -e "\033[32m[INFO]\033[0m $1"
}

log_warn() {
    echo -e "\033[33m[WARN]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

# 環境設定
ENVIRONMENT=${1:-production}
APP_NAME="maherama"
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"

log_info "maherama デプロイを開始します (環境: $ENVIRONMENT)"

# 1. 依存関係の確認
log_info "依存関係を確認中..."

# Node.jsの確認
if ! command -v node &> /dev/null; then
    log_error "Node.jsがインストールされていません"
    exit 1
fi

# npmの確認
if ! command -v npm &> /dev/null; then
    log_error "npmがインストールされていません"
    exit 1
fi

# PM2の確認
if ! command -v pm2 &> /dev/null; then
    log_warn "PM2がインストールされていません。インストールします..."
    npm install -g pm2
fi

log_info "Node.js $(node --version), npm $(npm --version)"

# 2. 環境変数ファイルの確認
log_info "環境変数ファイルを確認中..."

if [ ! -f "$BACKEND_DIR/.env" ]; then
    log_error "backend/.env ファイルが見つかりません"
    log_info "backend/.env.example をコピーして設定してください"
    exit 1
fi

# 3. バックエンドのデプロイ
log_info "バックエンドをデプロイ中..."

cd $BACKEND_DIR

# 依存関係のインストール
log_info "依存関係をインストール中..."
npm install --production

# Prismaクライアントの生成
log_info "Prismaクライアントを生成中..."
npx prisma generate

# データベースマイグレーション
log_info "データベースマイグレーションを実行中..."
npx prisma migrate deploy

# 4. フロントエンドのビルド
log_info "フロントエンドをビルド中..."

cd ../$FRONTEND_DIR

# 依存関係のインストール
log_info "依存関係をインストール中..."
npm install

# 本番用ビルド
log_info "本番用ビルドを実行中..."
npm run build

# 5. PM2でのアプリケーション管理
log_info "PM2でアプリケーションを管理中..."

cd ..

# PM2プロセスの停止（存在する場合）
if pm2 list | grep -q "$APP_NAME-backend"; then
    log_info "既存のPM2プロセスを停止中..."
    pm2 stop $APP_NAME-backend
    pm2 delete $APP_NAME-backend
fi

# PM2設定ファイルの作成
log_info "PM2設定ファイルを作成中..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME-backend',
    script: '$BACKEND_DIR/index.js',
    cwd: '$(pwd)',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: '$ENVIRONMENT',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# ログディレクトリの作成
mkdir -p logs

# アプリケーションの起動
log_info "アプリケーションを起動中..."
pm2 start ecosystem.config.js

# PM2の自動起動設定
log_info "PM2の自動起動を設定中..."
pm2 startup
pm2 save

# 6. デプロイ後の確認
log_info "デプロイ後の確認中..."

# PM2プロセスの状態確認
if pm2 list | grep -q "$APP_NAME-backend.*online"; then
    log_info "✅ アプリケーションが正常に起動しました"
else
    log_error "❌ アプリケーションの起動に失敗しました"
    pm2 logs $APP_NAME-backend --lines 20
    exit 1
fi

# ヘルスチェック
log_info "ヘルスチェックを実行中..."
sleep 5

if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    log_info "✅ ヘルスチェックが成功しました"
else
    log_warn "⚠️  ヘルスチェックに失敗しました（エンドポイントが存在しない可能性があります）"
fi

# 7. 最終確認
log_info "デプロイが完了しました！"
log_info "PM2プロセス一覧:"
pm2 list

log_info "ログの確認方法:"
echo "  pm2 logs $APP_NAME-backend"
echo "  pm2 monit"

log_info "アプリケーションの停止方法:"
echo "  pm2 stop $APP_NAME-backend"

log_info "アプリケーションの再起動方法:"
echo "  pm2 restart $APP_NAME-backend" 