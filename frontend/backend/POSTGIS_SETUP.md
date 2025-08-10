# PostGIS セットアップ手順

## 概要
地図アプリケーションの性能向上のため、PostGIS拡張をインストールして空間インデックスを活用します。

## 現在の状況
- **神社データ**: 約11,000件（将来的に2-8万件に拡張予定）
- **現在の実装**: Haversine公式による距離計算
- **目標**: PostGISのST_Distanceによる高速な空間検索

## 性能比較

### PostGIS（ST_Distance）
- **実行時間**: 数ミリ秒〜数十ミリ秒
- **インデックス**: GiST空間インデックスで高速検索
- **スケーラビリティ**: 大規模データでも安定した性能

### Haversine公式（現在）
- **実行時間**: 数百ミリ秒〜数秒
- **インデックス**: 全件スキャン
- **スケーラビリティ**: データ増加で性能劣化

## インストール手順

### 1. PostGISのダウンロード
1. https://postgis.net/install/windows/ にアクセス
2. PostgreSQL 17用のPostGIS 3.4+をダウンロード
3. インストーラーを実行

### 2. データベースでの有効化
```sql
-- PostgreSQLに接続
psql -h localhost -U amana_user -d amana

-- PostGIS拡張を有効化
CREATE EXTENSION IF NOT EXISTS postgis;

-- バージョン確認
SELECT PostGIS_Version();
```

### 3. コードの切り替え
`frontend/backend/index.ts`の`marker-status-batch`APIで：

```typescript
// 現在のHaversine版をコメントアウト
// const nearbyShrines = await prisma.$queryRaw`...`;

// PostGIS版を有効化
const nearbyShrines = await prisma.$queryRaw`
  SELECT
    s.id as shrine_id,
    s.name,
    s.lat,
    s.lng,
    ST_Distance(
      ST_MakePoint(s.lng, s.lat)::geography,
      ST_MakePoint(${lng}, ${lat})::geography
    ) as distance
  FROM "Shrine" s
  WHERE s.lat IS NOT NULL AND s.lng IS NOT NULL
  ORDER BY distance
  LIMIT ${limit}
`;
```

## 空間インデックスの作成（オプション）

大規模データでのさらなる性能向上のため：

```sql
-- 空間インデックスの作成
CREATE INDEX idx_shrine_location ON "Shrine" USING GIST (ST_MakePoint(lng, lat));

-- インデックスの確認
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename = 'Shrine';
```

## 動作確認

### 1. PostGIS拡張の確認
```bash
npx prisma db execute --schema=prisma/schema.prisma --stdin <<< "SELECT PostGIS_Version();"
```

### 2. 距離計算のテスト
```bash
# テスト用の座標で距離計算
npx prisma db execute --schema=prisma/schema.prisma --stdin <<< "
SELECT
  s.name,
  ST_Distance(
    ST_MakePoint(s.lng, s.lat)::geography,
    ST_MakePoint(135.491724, 34.691803)::geography
  ) as distance
FROM \"Shrine\" s
WHERE s.lat IS NOT NULL AND s.lng IS NOT NULL
ORDER BY distance
LIMIT 5;
"
```

### 3. パフォーマンステスト
```bash
# 実行時間の測定
npx prisma db execute --schema=prisma/schema.prisma --stdin <<< "
EXPLAIN ANALYZE
SELECT
  s.id,
  ST_Distance(
    ST_MakePoint(s.lng, s.lat)::geography,
    ST_MakePoint(135.491724, 34.691803)::geography
  ) as distance
FROM \"Shrine\" s
WHERE s.lat IS NOT NULL AND s.lng IS NOT NULL
ORDER BY distance
LIMIT 50;
"
```

## トラブルシューティング

### PostGIS拡張が見つからない
```bash
# PostgreSQLのバージョン確認
psql --version

# PostGISのインストール確認
# Windows: コントロールパネル → プログラムと機能
# Linux: dpkg -l | grep postgis
```

### 権限エラー
```sql
-- スーパーユーザーで実行
sudo -u postgres psql -d amana -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

### パフォーマンスが改善されない
```sql
-- インデックスの確認
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE tablename = 'Shrine';

-- クエリプランの確認
EXPLAIN ANALYZE SELECT ...;
```

## 本番環境での設定

### DEPLOYMENT.mdの更新
- PostGISのインストール手順を追加済み
- マイグレーションでの自動有効化を設定済み

### 監視とメトリクス
- クエリ実行時間の監視
- インデックス使用率の確認
- 定期的なパフォーマンステスト

## 参考資料
- [PostGIS公式ドキュメント](https://postgis.net/documentation/)
- [空間インデックス最適化](https://postgis.net/workshops/postgis-intro/indexing.html)
- [PostgreSQL性能チューニング](https://www.postgresql.org/docs/current/performance.html)

