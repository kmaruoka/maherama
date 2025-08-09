# Seed システム

このディレクトリには、データベースの初期データを生成するためのseedスクリプトが含まれています。

## 概要

従来の固定データベースのseedから、リアルなトランザクションデータを生成するシステムに変更しました。

## ファイル構成

### マスターデータ（固定）
- `shrine.ts` - 神社マスターデータ
- `diety.ts` - 神様マスターデータ
- `user.ts` - ユーザーマスターデータ
- `ability.ts` - 能力マスターデータ
- `title.ts` - 称号マスターデータ
- `level.ts` - レベルマスターデータ
- `subscription.ts` - サブスクリプションデータ
- `shrineImage.ts` - 神社画像データ

### トランザクションデータ（リアル生成）
- `realisticTransactions.ts` - リアルな参拝・遥拝・フォロー・図鑑データを生成

## 使用方法

### 基本的な実行
```bash
cd backend/scripts/seed
npm run seed
```

### 個別実行
```bash
# TypeScriptファイルを直接実行
npx ts-node main.ts
```

## リアルなトランザクション生成システム

### 特徴
- 1年前から現在まで、日を進めてリアルな参拝データを生成
- ユーザーのやりこみ度合いによるバリエーション
- 参拝と遥拝の両方をシミュレート
- フォロー関係と図鑑データも自動生成
- 統計データ（通算・年別・月別・週別）を自動計算

### 設定可能項目

`realisticTransactions.ts`の上部で以下の設定を変更できます：

```typescript
// 期間設定
const START_DATE = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1年前から開始
const END_DATE = new Date(); // 現在まで

// 参拝確率設定
const PRAY_PROBABILITY = 0.3; // 1日あたりの参拝確率（0.0〜1.0）
const REMOTE_PRAY_PROBABILITY = 0.1; // 1日あたりの遥拝確率（0.0〜1.0）
const MAX_PRAYS_PER_DAY = 5; // 1日あたりの最大参拝回数

// ユーザーのやりこみ度合い設定
const USER_ACTIVITY_LEVELS = {
  1: { maxLevel: 1, startDate: START_DATE }, // 開始直後で停止（初心者）
  2: { maxLevel: 10, startDate: START_DATE + 30日 }, // 30日後に開始、レベル10で停止
  // ... 他のユーザー設定
};
```

### ユーザーのやりこみ度合い

各ユーザーには以下の設定があります：
- `maxLevel`: そのユーザーが到達する最大レベル
- `startDate`: そのユーザーが参拝を開始する日

例：
- ユーザー1: 開始直後で停止（初心者）
- ユーザー2: 30日後に開始、レベル10で停止
- ユーザー3: 60日後に開始、レベル30で停止
- ユーザー7-10: 180日以降に開始、レベル100まで継続（ヘビーユーザー）

### 生成されるデータ

1. **参拝データ**
   - `ShrinePray`テーブル: 実際の参拝記録
   - `RemotePray`テーブル: 遥拝記録
   - 経験値とレベルアップも自動計算
   - **同じ神社に何度でも遥拝できます（ユニーク制約なし）**
   - 1日の遥拝回数はレベルや能力解放で決まります（API側で制御）

2. **統計データ**
   - `ShrinePrayStats`: 通算統計
   - `ShrinePrayStatsYearly`: 年別統計
   - `ShrinePrayStatsMonthly`: 月別統計
   - `ShrinePrayStatsWeekly`: 週別統計

3. **ソーシャルデータ**
   - `Follow`: フォロー関係
   - `ShrineCatalog`: 神社図鑑
   - `DietyCatalog`: 神様図鑑

4. **ログデータ**
   - `Log`: 参拝・遥拝のログメッセージ

### 実行時間

1年分のデータを生成する場合、通常5-10分程度かかります。
進捗はコンソールに表示されます：

```
🚀 リアルなトランザクションデータの生成を開始...
📅 2024-01-15 の参拝をシミュレート中...
📅 2024-01-16 の参拝をシミュレート中...
...
👥 フォロー関係をシミュレート中...
📚 図鑑データをシミュレート中...
📊 統計データを再計算中...
✅ リアルなトランザクションデータの生成が完了しました！
```

## 注意事項

- 実行前に既存のトランザクションデータは全て削除されます
- マスターデータ（神社・神様・ユーザー）は事前にseedされている必要があります
- 大量のデータを生成するため、実行には時間がかかります
- 設定を変更した場合は、再度seedを実行してください

## 推奨リセット・シード手順（PowerShell例）

```powershell
# backend
cd C:\repos\github\kmaruoka\maherama\backend
npx prisma migrate reset --force --skip-seed
Start-Process powershell -ArgumentList "cd C:\repos\github\kmaruoka\maherama\backend; npm start"
Start-Sleep -Seconds 3
npx prisma db seed

# frontend
cd C:\repos\github\kmaruoka\maherama\frontend
npm run dev
```

## トラブルシューティング

### 神社データが見つからない場合
```
⚠️ 神社データが見つかりません。先に神社データをseedしてください。
```
→ `shrine.ts`のseedを先に実行してください

### メモリ不足エラー
→ 期間を短くするか、参拝確率を下げてください

### 実行時間が長すぎる場合
→ `MAX_PRAYS_PER_DAY`を減らすか、期間を短くしてください
