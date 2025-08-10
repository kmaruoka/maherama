# AWS環境でのログイン問題 トラブルシューティングガイド

## 問題の概要
ローカル環境ではログインできるが、AWS環境でログインできない問題の解決方法を説明します。

## 主な原因と解決方法

### 1. JWT_SECRET環境変数の未設定

**問題**: 本番環境では`JWT_SECRET`が必須ですが、設定されていない場合があります。

**解決方法**:
```bash
# バックエンドディレクトリに移動
cd frontend/backend

# セキュアなJWT_SECRETを生成
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# .envファイルに追加
echo "JWT_SECRET=生成されたシークレットキー" >> .env
```

**確認方法**:
```bash
# バックエンドログでJWT_SECRETエラーを確認
sudo journalctl -u maherama-backend -f
```

### 2. CORS設定の問題

**問題**: 本番環境のドメインがCORSホワイトリストに含まれていない可能性があります。

**解決方法**:
```bash
# .envファイルにCORS設定を追加
echo "CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com" >> .env
```

**確認方法**:
- ブラウザの開発者ツールでCORSエラーを確認
- バックエンドログでCORSブロックメッセージを確認

### 3. 環境変数の確認

**必要な環境変数**:
```env
# 必須
NODE_ENV=production
JWT_SECRET=your_secure_jwt_secret_key
PORT=3000

# 推奨
CORS_ORIGINS=https://your-domain.com
DATABASE_URL=postgresql://...

# オプション
ENABLE_API_LOGGING=true
ENABLE_API_STATS=true
```

### 4. バックエンドサービスの再起動

**環境変数を変更した場合**:
```bash
# systemdサービスの再起動
sudo systemctl restart maherama-backend

# ログの確認
sudo journalctl -u maherama-backend -f
```

### 5. データベース接続の確認

**確認方法**:
```bash
# バックエンドのヘルスチェック
curl http://localhost:3000/health

# データベース接続テスト
cd frontend/backend
npx prisma db execute --stdin <<< "SELECT 1;"
```

### 6. nginx設定の確認

**確認項目**:
- APIプロキシ設定が正しいか
- フロントエンドの静的ファイルが正しく配信されているか

**確認方法**:
```bash
# nginx設定のテスト
sudo nginx -t

# nginxの再起動
sudo systemctl restart nginx

# nginxログの確認
sudo tail -f /var/log/nginx/maherama_error.log
```

## デバッグ手順

### 1. フロントエンドのデバッグ
1. ブラウザの開発者ツールを開く
2. Networkタブでログインリクエストを確認
3. Consoleタブでエラーメッセージを確認

### 2. バックエンドのデバッグ
```bash
# リアルタイムログの確認
sudo journalctl -u maherama-backend -f

# 特定のエラーの検索
sudo journalctl -u maherama-backend | grep -i "jwt\|cors\|login"
```

### 3. ネットワーク接続の確認
```bash
# バックエンドへの直接アクセス
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

## よくあるエラーと対処法

### "JWT_SECRET is not configured"
- `.env`ファイルに`JWT_SECRET`を追加
- バックエンドサービスを再起動

### "Not allowed by CORS"
- `.env`ファイルに`CORS_ORIGINS`を追加
- 正しいドメインを指定

### "No token provided"
- フロントエンドの認証処理を確認
- ブラウザのセッションストレージをクリア

### "Invalid token"
- JWT_SECRETが正しく設定されているか確認
- トークンの有効期限を確認

## 予防策

1. **環境変数の管理**: 本番環境用の環境変数ファイルを適切に管理
2. **ログ監視**: 定期的にバックエンドログを確認
3. **ヘルスチェック**: 定期的にヘルスチェックエンドポイントを確認
4. **バックアップ**: 重要な設定ファイルのバックアップを保持

## サポート

問題が解決しない場合は、以下の情報を収集してサポートに連絡してください：

1. バックエンドログ（`sudo journalctl -u maherama-backend -n 100`）
2. nginxログ（`sudo tail -n 100 /var/log/nginx/maherama_error.log`）
3. ブラウザの開発者ツールのエラー情報
4. 環境変数設定（機密情報は除く）

