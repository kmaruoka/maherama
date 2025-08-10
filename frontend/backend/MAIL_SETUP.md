# 開発用メールサーバー設定

## 開発環境でのメール送信

### 1. メール送信のシミュレーション

開発環境では、実際のメールサーバーを使用せずにメール送信をシミュレートします。

```bash
# 環境変数を設定してバックエンドを起動
$env:NODE_ENV="development"; npm start
```

### 2. メール送信の確認

ユーザー登録時に、コンソールに以下のようなログが表示されます：

```
=== 開発環境: メール送信シミュレーション ===
送信者: test@localhost
宛先: user@example.com
件名: アカウント有効化 - 神社参拝アプリ
本文: <h2>アカウント有効化</h2>...
==========================================
```

### 3. 環境変数の設定

開発環境では、以下の環境変数を設定してください：

```bash
# PowerShellで環境変数を設定
$env:NODE_ENV="development"
$env:PORT="3000"
```

### 4. メール送信のテスト

#### 方法1: ユーザー登録時のテスト
ユーザー登録時に以下のようなログが表示されます：

```
Sending verification email...
=== 開発環境: メール送信シミュレーション ===
送信者: test@localhost
宛先: user@example.com
件名: アカウント有効化 - 神社参拝アプリ
本文: <h2>アカウント有効化</h2>...
==========================================
Verification email sent successfully
```

#### 方法2: 専用テストページの使用
1. ブラウザで http://localhost:3000/test/email にアクセス
2. メールアドレス、件名、メッセージを入力
3. 「メールを送信」ボタンをクリック
4. バックエンドのコンソールで送信内容を確認

### 5. トラブルシューティング

#### メールが送信されない場合
1. 環境変数 `NODE_ENV=development` が設定されているか確認
2. アプリケーションのログでエラーを確認
3. バックエンドサーバーが正常に起動しているか確認

### 6. 本番環境での設定

本番環境では、実際のSMTPサーバー（Gmail、SendGrid等）を使用します：

```bash
# .envファイルに追加
NODE_ENV=production
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 7. メールテンプレートの確認

送信されるメールの内容は以下のファイルで確認できます：
- `index.ts` の `sendVerificationEmail` 関数
- `index.ts` の `sendPasswordResetEmail` 関数
