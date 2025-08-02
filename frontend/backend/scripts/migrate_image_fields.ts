import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateImageFields() {
  console.log('画像フィールドの移行を開始します...');

  try {
    // 1. Imageテーブルは既に新しいフィールドが存在するためスキップ
    console.log('Imageテーブルは既に新しいフィールドが存在します。');

    // 2. Shrineテーブルのフィールド名を更新
    console.log('Shrineテーブルのフィールド名を更新中...');
    
    await prisma.$executeRaw`
      ALTER TABLE "Shrine" 
      ADD COLUMN IF NOT EXISTS "image_url_xs" TEXT,
      ADD COLUMN IF NOT EXISTS "image_url_s" TEXT,
      ADD COLUMN IF NOT EXISTS "image_url_m" TEXT,
      ADD COLUMN IF NOT EXISTS "image_url_l" TEXT,
      ADD COLUMN IF NOT EXISTS "image_url_xl" TEXT
    `;

    await prisma.$executeRaw`
      UPDATE "Shrine" 
      SET 
        "image_url_xs" = "image_url64",
        "image_url_s" = "image_url128",
        "image_url_m" = "image_url256",
        "image_url_l" = "image_url512",
        "image_url_xl" = "image_url"
      WHERE "image_url_xs" IS NULL
    `;

    // 3. Dietyテーブルのフィールド名を更新
    console.log('Dietyテーブルのフィールド名を更新中...');
    
    await prisma.$executeRaw`
      ALTER TABLE "Diety" 
      ADD COLUMN IF NOT EXISTS "image_url_xs" TEXT,
      ADD COLUMN IF NOT EXISTS "image_url_s" TEXT,
      ADD COLUMN IF NOT EXISTS "image_url_m" TEXT,
      ADD COLUMN IF NOT EXISTS "image_url_l" TEXT,
      ADD COLUMN IF NOT EXISTS "image_url_xl" TEXT
    `;

    await prisma.$executeRaw`
      UPDATE "Diety" 
      SET 
        "image_url_xs" = "image_url64",
        "image_url_s" = "image_url128",
        "image_url_m" = "image_url256",
        "image_url_l" = "image_url512",
        "image_url_xl" = "image_url"
      WHERE "image_url_xs" IS NULL
    `;

    console.log('✅ 画像フィールドの移行が完了しました。');
  } catch (error) {
    console.error('❌ 画像フィールドの移行中にエラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプトを実行
migrateImageFields(); 