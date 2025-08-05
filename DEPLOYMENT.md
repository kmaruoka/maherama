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
   - **AMI**: Ubuntu 22.04 LTS
   - **インスタンスタイプ**: 
     - **開発・テスト**: t3.medium（2vCPU, 4GB RAM）
     - **本番**: t3.large（2vCPU, 8GB RAM）
     - **注意**: t3.small（2vCPU, 2GB RAM）では性能不足の可能性があります
   - **ストレージ**: 20GB以上
   - **セキュリティグループ**: 後で設定

### 1.2 セキュリティグループの設定
以下のポートを開放:
- **22**: SSH
- **80**: HTTP
- **443**: HTTPS

## 2. EC2インスタンスの初期設定

### 2.1 SSH接続
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

**注意**: 新しいインスタンスに初回接続する際、PuTTYで「PuTTY Security Alert」が表示される場合があります。これは新しいホストキーが検出されたためで、正常な動作です。「Accept」をクリックして接続を続行してください。

### 2.2 システムの更新
```bash
sudo apt update && sudo apt upgrade -y
```

### 2.3 Node.jsのインストール
```bash
# Node.js 20.xのインストール
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# バージョン確認
node --version
npm --version
```

### 2.4 PostgreSQLのインストール
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# PostgreSQLの設定
sudo -u postgres psql
```

PostgreSQLコンソールで以下を実行:
```sql
-- データベースとユーザーの作成
CREATE DATABASE amana;
CREATE USER amana_user WITH PASSWORD 'amana_pass';
GRANT ALL PRIVILEGES ON DATABASE amana TO amana_user;

-- スキーマ権限の付与（マイグレーション実行に必要）
ALTER USER amana_user CREATEDB;

-- publicスキーマの所有者をamana_userに変更
ALTER SCHEMA public OWNER TO amana_user;

-- 権限の付与
GRANT ALL PRIVILEGES ON SCHEMA public TO amana_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO amana_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO amana_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO amana_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO amana_user;

-- データベースの所有者も変更
ALTER DATABASE amana OWNER TO amana_user;

\q
```

### 2.5 Nginxのインストール
```bash
sudo apt install -y nginx
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

# アプリケーションをクローン
git clone https://github.com/kmaruoka/maherama.git
cd maherama
```

### 3.2 環境変数の設定
```bash
# バックエンド用の環境変数ファイル
cd frontend/backend
```

`.env`ファイルを作成:
```env
# データベース設定
DATABASE_URL="postgresql://amana_user:amana_pass@localhost:5432/amana"

# サーバー設定
PORT=3000
NODE_ENV=production

# JWT設定
JWT_SECRET=your_jwt_secret_key

# Stripe設定（使用する場合）
STRIPE_SECRET_KEY=your_stripe_secret_key

# その他の設定
CORS_ORIGIN=https://your-domain.com
```

### 3.3 バックエンドのセットアップ
```bash
cd frontend/backend

# 依存関係のインストール
npm install

# Prismaクライアントの生成
npx prisma generate

# データベースマイグレーション
npx prisma migrate deploy

# バックエンドサーバーをバックグラウンドで起動（シード実行に必要）
PORT=3000 npm start > backend.log 2>&1 &
echo "バックエンドサーバーを起動しました。PID: $!"

# サーバーの起動を待つ
sleep 5

# シードデータの投入
# 注意: 初回実行時は重複エラーが発生する可能性があります
# エラーが発生した場合は、トラブルシューティングセクションを参照してください

# 方法1: 全データを一度に投入（時間がかかる場合があります）
npm run seed

# 方法2: 段階的に投入（推奨）
# npx tsx scripts/seed/user.ts
# npx tsx scripts/seed/shrine.ts
# npx tsx scripts/seed/diety.ts
# npx tsx scripts/seed/title.ts
# npx tsx scripts/seed/level.ts
# npx tsx scripts/seed/ability.ts
# npx tsx scripts/seed/mission.ts

# 方法3: 軽量版（大量データを除外）
# npx tsx scripts/seed/user.ts
# npx tsx scripts/seed/shrine.ts
# npx tsx scripts/seed/diety.ts
# npx tsx scripts/seed/title.ts

# バックグラウンドプロセスを停止
kill %1

# ログファイルの確認（必要に応じて）
# cat backend.log
```

### 3.4 フロントエンドのビルド
```bash
cd ../../frontend

# 依存関係のインストール
npm install

# 本番用ビルド
npm run build
# または、Viteを直接使用
# npx vite build

# ビルド後の権限設定（重要）
sudo chown -R www-data:www-data /home/ubuntu/maherama/frontend/dist/
sudo chmod -R 755 /home/ubuntu/maherama/frontend/dist/
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
    script: 'frontend/backend/index.ts',
    cwd: '/home/ubuntu/maherama',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    interpreter: 'node',
    interpreter_args: '-r ts-node/register'
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

#### 5.1.1 設定ファイルの作成と編集
```bash
sudo vi /etc/nginx/sites-available/maherama
```

以下の内容を追加:
```nginx
server {
    listen 80;
    server_name _;  # すべてのホスト名を受け入れる（IPアドレスでもドメインでも）

    # フロントエンド（静的ファイル）
    location / {
        root /home/ubuntu/maherama/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # キャッシュ設定
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # バックエンドAPI
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 画像ファイルの配信
    location /images/ {
        alias /home/ubuntu/maherama/frontend/public/images/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # セキュリティヘッダー
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

#### 5.1.2 設定ファイルの有効化
```bash
sudo ln -s /etc/nginx/sites-available/maherama /etc/nginx/sites-enabled/
```

### 5.2 Nginxの再起動
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### 5.3 動作確認とトラブルシューティング
```bash
# フロントエンドのビルド確認
cd ~/maherama/frontend
ls -la dist/

# ビルドされていない場合は実行
npx vite build

# パスの確認
ls -la /home/ubuntu/maherama/frontend/dist/

# フロントエンドファイルの権限設定（重要）
sudo chown -R www-data:www-data /home/ubuntu/maherama/frontend/dist/
sudo chmod -R 755 /home/ubuntu/maherama/frontend/dist/

# 親ディレクトリの権限設定（重要）
sudo chmod 755 /home/ubuntu/
sudo chmod 755 /home/ubuntu/maherama/
sudo chmod 755 /home/ubuntu/maherama/frontend/

# デフォルトNginxサイトの無効化（重要）
sudo rm -f /etc/nginx/sites-enabled/default

# バックエンドサーバーの起動確認
pm2 status

# 起動していない場合は起動
cd ~/maherama
pm2 start ecosystem.config.js

# Nginx設定の再読み込み
sudo systemctl reload nginx

# 動作確認
curl http://localhost/api/shrines/all
```

## 6. SSL証明書の設定（ドメイン取得後）

### 6.1 Certbotのインストール
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 6.2 SSL証明書の取得（ドメイン取得後）
```bash
# ドメインを取得した後に実行
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

**注意**: 
- ドメインを取得していない場合は、この手順は後回しにしてください。
- SSL証明書を設定する前に、HTTPでの動作を必ず確認してください。
- 証明書の設定後に問題が発生した場合は、`sudo certbot delete --cert-name your-domain.com`で証明書を削除してHTTPに戻すことができます。

## 7. ファイアウォールの設定

### 7.1 セキュリティグループの更新
- ポート80と443のみを開放
- ポート3000は削除（Nginx経由でアクセス）

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
sudo vi /home/ubuntu/backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR

# データベースバックアップ
pg_dump -h localhost -U amana_user amana > $BACKUP_DIR/amana_$DATE.sql

# 古いバックアップの削除（7日以上前）
find $BACKUP_DIR -name "amana_*.sql" -mtime +7 -delete
```

```bash
chmod +x /home/ubuntu/backup.sh

# 定期実行の設定
crontab -e
```

以下を追加:
```
0 2 * * * /home/ubuntu/backup.sh
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
cd ~/maherama/frontend/backend
npm start
```

**シード実行時のエラー**
```bash
# バックエンドサーバーが起動しているか確認
curl http://localhost:3000/health

# サーバーが起動していない場合は手動で起動
cd ~/maherama/frontend/backend
PORT=3000 npm start > backend.log 2>&1 &

# シードを実行
npm run seed

# バックグラウンドプロセスを停止
kill %1

# ログファイルの確認（必要に応じて）
cat backend.log
```

**ユニーク制約違反エラーの場合**
```bash
# 既存データをクリーンアップ（応急処置）
psql -h localhost -U amana_user -d amana -c "DELETE FROM \"EventMission\" WHERE 1=1;"
psql -h localhost -U amana_user -d amana -c "DELETE FROM \"UserMission\" WHERE 1=1;"

# シードを再実行
npm run seed
```

**データベース接続エラー**
```bash
# PostgreSQLサービスの確認
sudo systemctl status postgresql

# 接続テスト
psql -h localhost -U amana_user -d amana

# 権限エラーの場合の対処法
sudo -u postgres psql -c "ALTER SCHEMA public OWNER TO amana_user;"
sudo -u postgres psql -c "ALTER DATABASE amana OWNER TO amana_user;"
```

**Nginxエラー**
```bash
# 設定ファイルの構文チェック
sudo nginx -t

# エラーログの確認
sudo tail -f /var/log/nginx/error.log

# 権限エラーの場合
sudo chown -R www-data:www-data /home/ubuntu/maherama/frontend/dist/
sudo chmod -R 755 /home/ubuntu/maherama/frontend/dist/
sudo chmod 755 /home/ubuntu/
sudo chmod 755 /home/ubuntu/maherama/
sudo chmod 755 /home/ubuntu/maherama/frontend/

# デフォルトサイトが表示される場合
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl restart nginx
```

**フロントエンドがAPIにアクセスできない**
```bash
# Nginx設定のproxy_passを確認
sudo cat /etc/nginx/sites-available/maherama | grep proxy_pass

# 正しい設定（末尾のスラッシュが重要）
location /api/ {
    proxy_pass http://localhost:3000/;
}

# バックエンドサーバーの起動確認
pm2 status
curl http://localhost:3000/shrines/all
```

## 12. 更新手順

### 12.1 アプリケーションの更新
```bash
cd ~/maherama

# 最新コードの取得
git pull origin main

# バックエンドの更新
cd frontend/backend
npm install
npx prisma migrate deploy
pm2 restart maherama-backend

# フロントエンドの更新
cd ../../frontend
npm install

# 権限問題の解決（重要）
sudo chown -R ubuntu:ubuntu /home/ubuntu/maherama/frontend/dist/
npx vite build
sudo chown -R www-data:www-data /home/ubuntu/maherama/frontend/dist/
sudo chmod -R 755 /home/ubuntu/maherama/frontend/dist/

# 親ディレクトリの権限も確認
sudo chmod 755 /home/ubuntu/
sudo chmod 755 /home/ubuntu/maherama/
sudo chmod 755 /home/ubuntu/maherama/frontend/
```

### 12.2 Nginx設定の確認と修正（重要）
```bash
# Nginx設定ファイルの確認
sudo cat /etc/nginx/sites-available/maherama

# 設定ファイルが存在しない場合の作成
sudo vi /etc/nginx/sites-available/maherama
```

以下の内容を追加:
```nginx
server {
    listen 80;
    server_name _;  # すべてのホスト名を受け入れる（IPアドレスでもドメインでも）

    # フロントエンド（静的ファイル）
    location / {
        root /home/ubuntu/maherama/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # キャッシュ設定
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # バックエンドAPI（重要）
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 画像ファイルの配信
    location /images/ {
        alias /home/ubuntu/maherama/frontend/public/images/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # セキュリティヘッダー
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

```bash
# 設定ファイルの有効化
sudo ln -s /etc/nginx/sites-available/maherama /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Nginx設定のテストと再起動
sudo nginx -t
sudo systemctl restart nginx
```

### 12.3 バックエンドエンドポイントの確認と修正（重要）
```bash
# バックエンドのエンドポイントを確認
cd ~/maherama/frontend/backend
grep -r "app.get" ./index.ts

# エンドポイントの構造に基づいてNginx設定を修正
# 例：/shrines/all エンドポイントが存在する場合
sudo vi /etc/nginx/sites-available/maherama
```

**Nginx設定の修正例：**
```nginx
# バックエンドAPI（/api/プレフィックスを削除してプロキシ）
location /api/ {
    proxy_pass http://localhost:3000/;
    # 末尾のスラッシュが重要：/api/shrines/all → /shrines/all に転送
}
```

```bash
# Nginx再起動
sudo systemctl restart nginx

# プロキシの動作確認
curl http://18.181.100.100/api/shrines/all
```

### 12.3 システムの更新
```bash
sudo apt update && sudo apt upgrade -y
sudo systemctl restart nginx
```

## 13. セキュリティ強化

### 13.1 ファイアウォールの強化
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
```

### 13.2 定期的なセキュリティ更新
```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 14. パフォーマンス最適化

### 14.1 Nginxの最適化
```bash
# /etc/nginx/nginx.conf の編集
sudo vi /etc/nginx/nginx.conf
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