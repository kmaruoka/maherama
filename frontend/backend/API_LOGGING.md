# API監視・ログ機能

## 概要

このシステムは、APIログ機能とAPI監視機能を分離した設計になっており、それぞれ独立した責任を持っています：

- **APIログ機能** (`apiLogger.js`): API呼び出しの記録とログ出力
- **API監視機能** (`apiMonitor.js`): 異常パターン検出とセキュリティ監視

## 監視機能

### 1. レート制限
- **設定**: 1分間に最大100リクエスト
- **バースト制限**: 1分間に最大20リクエスト
- **超過時**: 429エラーを返す

### 2. 異常パターン検出
以下の異常パターンを自動検出します：

- **連続エラー**: 5分間に5回以上の連続エラー
- **高エラー率**: 5分間で30%以上のエラー率
- **異常なリクエスト頻度**: 1分間に20回以上のリクエスト
- **異常なHTTPメソッド**: DELETE/PUT/PATCHメソッドの異常な使用

### 3. アラート機能
異常パターンが検出された場合：
- エラーログに詳細を記録
- アラート履歴を管理（重複アラートを防止）
- クールダウン期間: 5分間

## 環境変数設定

### 基本設定
```bash
# APIログ機能の有効/無効
ENABLE_API_LOGGING=true  # デフォルト: true

# API統計情報の有効/無効
ENABLE_API_STATS=true    # デフォルト: true

# リクエスト/レスポンスボディのログ出力
LOG_REQUEST_BODY=true    # デフォルト: true
LOG_RESPONSE_BODY=true   # デフォルト: true

# レスポンスログの最大サイズ
MAX_RESPONSE_LOG_SIZE=1000  # デフォルト: 1000文字
```

### Seedスクリプト実行時の設定
seedスクリプト実行時は、正常な動作でも大量のAPI呼び出しが発生するため、監視を緩和します：

```bash
# Seedモードを有効化（開発環境のみ）
NODE_ENV=development
SEED_MODE=true

# 例: seedスクリプト実行時
SEED_MODE=true npm run seed
```

## ログファイル

### 出力先
- **エラーログ**: `logs/error.log`
- **全ログ**: `logs/combined.log`
- **コンソール**: 開発環境では詳細ログを出力

### ログ形式
```
[2024-01-15 10:30:45.123] API_INFO: API Request: POST /shrines/1/pray
[2024-01-15 10:30:45.456] API_ERROR: 🚨 API ANOMALY DETECTED: IP=127.0.0.1, Path=/shrines/1/pray, Anomalies=High error rate: 45.2% errors
```

## 監視設定のカスタマイズ

### レート制限の調整
```javascript
// apiMonitor.js の config セクションで調整可能
rateLimit: {
  windowMs: 60000,        // 時間窓（ミリ秒）
  maxRequests: 100,       // 最大リクエスト数
  burstLimit: 20          // バースト制限
}
```

### 異常検出の閾値調整
```javascript
anomalyDetection: {
  consecutiveErrors: 5,           // 連続エラー数
  errorRateThreshold: 0.3,        // エラー率（30%）
  unusualPatternThreshold: 10     // 異常パターン閾値
}
```

## 監視統計の取得

### API監視統計エンドポイント
```bash
GET /admin/api-monitoring/stats
```

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "rateLimitCounters": 5,
    "patternHistory": 12,
    "alertHistory": 3,
    "config": {
      "rateLimit": { ... },
      "anomalyDetection": { ... }
    }
  },
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

### 監視設定更新エンドポイント
```bash
POST /admin/api-monitoring/config
Content-Type: application/json

{
  "config": {
    "rateLimit": {
      "maxRequests": 150
    },
    "anomalyDetection": {
      "consecutiveErrors": 3
    }
  }
}
```

## 運用時の注意点

### 1. 本番環境での設定
- `ENABLE_API_LOGGING=true` を維持
- ログローテーションの設定を推奨
- アラート通知の設定（Slack、メール等）

### 2. 開発環境での設定
- seedスクリプト実行時は `SEED_MODE=true` を設定
- デバッグ時は `LOG_REQUEST_BODY=true` を活用

### 3. パフォーマンス考慮
- 大量のログ出力によるディスク容量の監視
- ログファイルの定期的なクリーンアップ

## トラブルシューティング

### レート制限エラーが頻発する場合
1. クライアント側のリクエスト頻度を確認
2. レート制限設定を一時的に緩和
3. 異常なアクセスパターンの調査

### アラートが頻発する場合
1. アラート履歴の確認
2. 閾値設定の見直し
3. 正常な動作パターンの除外設定

### Seedスクリプトでエラーが発生する場合
1. `SEED_MODE=true` の設定確認
2. 開発環境での実行確認
3. ログ出力の詳細確認
