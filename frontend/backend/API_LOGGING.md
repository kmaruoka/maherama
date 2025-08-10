# APIロギングシステム

このシステムは、APIゲートウェイのような包括的なロギング機能を提供し、すべてのAPI呼び出しのエンドポイント、パラメータ、戻り値を自動的にログ出力します。

## 機能

### 1. 包括的なAPIログ
- **リクエストログ**: メソッド、URL、パス、クエリパラメータ、ヘッダー、ボディ、IPアドレス、User-Agent
- **レスポンスログ**: ステータスコード、レスポンス時間、レスポンスボディ、ヘッダー
- **エラーログ**: エラー詳細、スタックトレース
- **統計情報**: レスポンス時間、API使用統計

### 2. セキュリティ機能
- **機密情報マスキング**: パスワード、トークン、APIキーなどの機密情報を自動的にマスク
- **レスポンスサイズ制限**: 大きなレスポンスボディの自動切り詰め
- **除外設定**: 特定のエンドポイントやメソッドのログ除外

### 3. 環境変数による制御
- `ENABLE_API_LOGGING`: APIログの有効/無効（デフォルト: 有効）
- `ENABLE_API_STATS`: API統計の有効/無効（デフォルト: 有効）
- `LOG_REQUEST_BODY`: リクエストボディのログ出力（デフォルト: 有効）
- `LOG_RESPONSE_BODY`: レスポンスボディのログ出力（デフォルト: 有効）
- `MAX_RESPONSE_LOG_SIZE`: レスポンスログの最大サイズ（デフォルト: 2000文字）

## 設定例

### 環境変数設定
```bash
# APIログを無効にする
ENABLE_API_LOGGING=false

# リクエストボディのログを無効にする
LOG_REQUEST_BODY=false

# レスポンスボディのログを無効にする
LOG_RESPONSE_BODY=false

# レスポンスログの最大サイズを設定
MAX_RESPONSE_LOG_SIZE=5000
```

### 除外設定
現在、以下のエンドポイントは自動的に除外されています：
- `/health` - ヘルスチェック
- `/images` - 画像ファイル
- `OPTIONS` メソッド - CORSプリフライトリクエスト

## ログ出力例

### リクエストログ
```
[2024-01-15T10:30:45.123Z] API_INFO: API Request: POST /api/pray {
  "type": "request",
  "requestId": "req_1705315845123_abc123def",
  "method": "POST",
  "url": "/api/pray?shrineId=123",
  "path": "/api/pray",
  "query": { "shrineId": "123" },
  "headers": {
    "authorization": "***MASKED***",
    "content-type": "application/json",
    "user-agent": "Mozilla/5.0..."
  },
  "body": { "shrineId": 123, "type": "参拝" },
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

### レスポンスログ
```
[2024-01-15T10:30:45.456Z] API_INFO: API Response: POST /api/pray - 200 {
  "type": "response",
  "requestId": "req_1705315845123_abc123def",
  "statusCode": 200,
  "responseTime": "333ms",
  "body": {
    "success": true,
    "message": "参拝が完了しました",
    "expGained": 10
  },
  "headers": {
    "content-type": "application/json"
  },
  "timestamp": "2024-01-15T10:30:45.456Z"
}
```

### エラーログ
```
[2024-01-15T10:30:45.789Z] API_ERROR: API Error: POST /api/pray {
  "type": "error",
  "requestId": "req_1705315845123_abc123def",
  "method": "POST",
  "url": "/api/pray",
  "path": "/api/pray",
  "error": {
    "name": "ValidationError",
    "message": "Invalid shrine ID",
    "stack": "ValidationError: Invalid shrine ID..."
  },
  "timestamp": "2024-01-15T10:30:45.789Z"
}
```

## 管理エンドポイント

### APIログ設定取得
```
GET /api/logs/config
```

管理者権限が必要です。現在のログ設定を取得できます。

**レスポンス例:**
```json
{
  "success": true,
  "config": {
    "enableApiLogging": true,
    "enableApiStats": true,
    "logRequestBody": true,
    "logResponseBody": true,
    "maxResponseSize": 2000,
    "excludePaths": ["/health", "/images"],
    "excludeMethods": ["OPTIONS"]
  }
}
```

## ログファイル

ログは以下のファイルに出力されます：
- `logs/combined.log` - すべてのログ
- `logs/error.log` - エラーログのみ

## パフォーマンスへの影響

- **最小限の影響**: ログ出力は非同期で行われ、APIレスポンス時間への影響は最小限です
- **メモリ使用量**: 大きなレスポンスボディは自動的に切り詰められ、メモリ使用量を抑制します
- **ディスク容量**: ログローテーション機能により、ディスク容量を管理できます

## トラブルシューティング

### ログが出力されない場合
1. 環境変数 `ENABLE_API_LOGGING` が `false` に設定されていないか確認
2. ログディレクトリ `logs/` が存在し、書き込み権限があるか確認
3. 除外設定で対象エンドポイントが除外されていないか確認

### ログファイルが大きくなりすぎる場合
1. `MAX_RESPONSE_LOG_SIZE` を小さく設定
2. `LOG_REQUEST_BODY` または `LOG_RESPONSE_BODY` を `false` に設定
3. ログローテーション機能を有効化

### 機密情報がログに出力される場合
1. `maskSensitiveData` 関数の `sensitiveFields` 配列に該当フィールドを追加
2. カスタムマスキングルールを実装

## カスタマイズ

### 除外パスの追加
```javascript
const customApiLogger = createApiLogger({
  excludePaths: ['/health', '/images', '/api/health', '/metrics'],
  // ... その他の設定
});
```

### 機密フィールドの追加
```javascript
const sensitiveFields = [
  'password', 'token', 'jwt', 'secret', 'key', 'authorization',
  'cookie', 'session', 'api_key', 'apikey', 'private_key',
  'credit_card', 'ssn', 'personal_id' // 追加
];
```

### カスタムログフォーマット
```javascript
const apiLogFormat = (level, message, meta) => {
  // カスタムフォーマットを実装
  return `[${new Date().toISOString()}] CUSTOM_${level}: ${message}`;
};
```
