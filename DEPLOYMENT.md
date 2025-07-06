# AWS EC2 デプロイ手順

## 概要
このドキュメントでは、maheramaアプリケーションをAWS EC2にデプロイする手順を説明します。

## 前提条件
- AWSアカウント
- EC2インスタンス（推奨: t3.medium以上）
- ドメイン名（オプション）
- SSL証明書（オプション）

## 1. EC2インスタンスの準備

### 1.1 EC2インスタンスの作成
1. AWSコンソールにログイン
2. EC2ダッシュボードで「インスタンスを起動」
3. 推奨設定:
   - **AMI**: Amazon Linux 2023
   - **インスタンスタイプ**: t3.medium（推奨）
   - **ストレージ**: 20GB以上
   - **セキュリティグループ**: 後で設定

### 1.2 セキュリティグループの設定
以下のポートを開放:
- **22**: SSH
- **80**: HTTP
- **443**: HTTPS
- **3001**: バックエンドAPI（開発時のみ）

## 2. EC2インスタンスの初期設定

### 2.1 SSH接続
```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
```

### 2.2 システムの更新
```bash
sudo yum update -y
```

### 2.3 Node.jsのインストール
```bash
# Node.js 20.xのインストール
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# バージョン確認
node --version
npm --version
```

### 2.4 PostgreSQLのインストール
```bash
# PostgreSQL 15のインストール
sudo yum install -y postgresql15 postgresql15-server

# データベースの初期化
sudo postgresql-15-setup initdb

# PostgreSQLサービスの開始と自動起動設定
sudo systemctl start postgresql-15
sudo systemctl enable postgresql-15

# PostgreSQLの設定
sudo -u postgres psql
```

PostgreSQLコンソールで以下を実行:
```sql
-- データベースとユーザーの作成
CREATE DATABASE maherama;
CREATE USER maherama_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE maherama TO maherama_user;
\q
```

### 2.5 Nginxのインストール
```bash
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2.6 PM2のインストール
```bash
sudo npm install -g pm2
```

## 3. アプリケーションのデプロイ

### 3.1 アプリケーションのクローン
```bash
# ホームディレクトリに移動
cd ~

# アプリケーションをクローン（GitHubリポジトリの場合）
git clone https://github.com/your-username/maherama.git
cd maherama

# または、ファイルを直接アップロード
```

### 3.2 環境変数の設定
```bash
# バックエンド用の環境変数ファイル
cd backend
cp .env.example .env
```

`.env`ファイルを編集:
```env
# データベース設定
DATABASE_URL="postgresql://maherama_user:your_secure_password@localhost:5432/maherama"

# サーバー設定
PORT=3001
NODE_ENV=production

# JWT設定
JWT_SECRET=your_jwt_secret_key

# その他の設定
CORS_ORIGIN=https://your-domain.com
```

### 3.3 バックエンドのセットアップ
```bash
cd backend

# 依存関係のインストール
npm install

# Prismaクライアントの生成
npx prisma generate

# データベースマイグレーション
npx prisma migrate deploy

# シードデータの投入（必要に応じて）
npm run db-seed
```

### 3.4 フロントエンドのビルド
```bash
cd ../frontend

# 依存関係のインストール
npm install

# 本番用ビルド
npm run build
```

### 3.5 API設定の更新
フロントエンドのAPI設定を本番環境用に更新:

```bash
# frontend/src/config/api.ts を編集
```

```typescript
// 本番環境用の設定
export const API_BASE = 'https://your-domain.com/api';
```

## 4. PM2でのプロセス管理

### 4.1 PM2設定ファイルの作成
```bash
cd ~/maherama
```

`ecosystem.config.js`を作成:
```javascript
module.exports = {
  apps: [{
    name: 'maherama-backend',
    script: 'backend/index.js',
    cwd: '/home/ec2-user/maherama',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

### 4.2 PM2でのアプリケーション起動
```bash
# アプリケーションの起動
pm2 start ecosystem.config.js

# 自動起動の設定
pm2 startup
pm2 save
```

## 5. Nginxの設定

### 5.1 Nginx設定ファイルの作成
```bash
sudo nano /etc/nginx/conf.d/maherama.conf
```

以下の内容を追加:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # フロントエンド（静的ファイル）
    location / {
        root /home/ec2-user/maherama/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # キャッシュ設定
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # バックエンドAPI
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # セキュリティヘッダー
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

### 5.2 Nginxの再起動
```bash
sudo nginx -t
sudo systemctl restart nginx
```

## 6. SSL証明書の設定（推奨）

### 6.1 Certbotのインストール
```bash
sudo yum install -y certbot python3-certbot-nginx
```

### 6.2 SSL証明書の取得
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 6.3 自動更新の設定
```bash
sudo crontab -e
```

以下を追加:
```
0 12 * * * /usr/bin/certbot renew --quiet
```

## 7. ファイアウォールの設定

### 7.1 セキュリティグループの更新
- ポート80と443のみを開放
- ポート3001は削除（Nginx経由でアクセス）

## 8. 監視とログ

### 8.1 PM2の監視
```bash
# プロセス状況の確認
pm2 status

# ログの確認
pm2 logs maherama-backend

# モニタリング
pm2 monit
```

### 8.2 Nginxログの確認
```bash
# アクセスログ
sudo tail -f /var/log/nginx/access.log

# エラーログ
sudo tail -f /var/log/nginx/error.log
```

## 9. バックアップ設定

### 9.1 データベースバックアップ
```bash
# バックアップスクリプトの作成
sudo nano /home/ec2-user/backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ec2-user/backups"
mkdir -p $BACKUP_DIR

# データベースバックアップ
pg_dump -h localhost -U maherama_user maherama > $BACKUP_DIR/maherama_$DATE.sql

# 古いバックアップの削除（7日以上前）
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

```bash
chmod +x /home/ec2-user/backup.sh

# 定期実行の設定
crontab -e
```

以下を追加:
```
0 2 * * * /home/ec2-user/backup.sh
```

## 10. デプロイ後の確認

### 10.1 動作確認
1. ブラウザで `https://your-domain.com` にアクセス
2. フロントエンドが正常に表示されることを確認
3. APIエンドポイントが正常に動作することを確認

### 10.2 パフォーマンス確認
```bash
# システムリソースの確認
htop

# ディスク使用量の確認
df -h

# メモリ使用量の確認
free -h
```

## 11. トラブルシューティング

### 11.1 よくある問題と解決方法

**アプリケーションが起動しない**
```bash
# PM2ログの確認
pm2 logs maherama-backend

# 手動で起動してエラー確認
cd ~/maherama/backend
node index.js
```

**データベース接続エラー**
```bash
# PostgreSQLサービスの確認
sudo systemctl status postgresql-15

# 接続テスト
psql -h localhost -U maherama_user -d maherama
```

**Nginxエラー**
```bash
# 設定ファイルの構文チェック
sudo nginx -t

# エラーログの確認
sudo tail -f /var/log/nginx/error.log
```

## 12. 更新手順

### 12.1 アプリケーションの更新
```bash
cd ~/maherama

# 最新コードの取得
git pull origin main

# バックエンドの更新
cd backend
npm install
npx prisma migrate deploy
pm2 restart maherama-backend

# フロントエンドの更新
cd ../frontend
npm install
npm run build
```

### 12.2 システムの更新
```bash
sudo yum update -y
sudo systemctl restart nginx
```

## 13. セキュリティ強化

### 13.1 ファイアウォールの強化
```bash
# UFWのインストール（Amazon Linux 2023では不要）
# セキュリティグループで制御
```

### 13.2 定期的なセキュリティ更新
```bash
# 自動更新の設定
sudo yum install -y yum-cron
sudo systemctl enable yum-cron
sudo systemctl start yum-cron
```

## 14. パフォーマンス最適化

### 14.1 Nginxの最適化
```bash
# /etc/nginx/nginx.conf の編集
sudo nano /etc/nginx/nginx.conf
```

### 14.2 Node.jsの最適化
```bash
# PM2設定の調整
# メモリ制限の設定
# クラスターモードの有効化
```

## 15. 監視とアラート

### 15.1 CloudWatchの設定
- EC2インスタンスのメトリクス監視
- ログの収集
- アラートの設定

### 15.2 カスタム監視スクリプト
```bash
# ヘルスチェックスクリプトの作成
# 定期的な動作確認
# 自動復旧機能
```

---

## 注意事項

1. **セキュリティ**: 本番環境では強力なパスワードとJWTシークレットを使用してください
2. **バックアップ**: 定期的なバックアップを必ず実行してください
3. **監視**: システムの監視を継続的に行ってください
4. **更新**: セキュリティパッチは定期的に適用してください
5. **ログ**: ログファイルのローテーションを設定してください

## サポート

デプロイ中に問題が発生した場合は、以下を確認してください：
- PM2ログ: `pm2 logs`
- Nginxログ: `/var/log/nginx/`
- システムログ: `journalctl -u nginx`
- データベースログ: `/var/log/postgresql/` 