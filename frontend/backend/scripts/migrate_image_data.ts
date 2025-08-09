import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateImageData() {
  console.log('画像データの移行を開始します...');

  try {
    // 1. 既存のShrineImageデータを移行
    console.log('神社画像データを移行中...');
    const shrineImages = await prisma.shrineImage.findMany({
      include: { user: true }
    });

    for (const shrineImage of shrineImages) {
      // Imageテーブルに登録
      const image = await prisma.image.create({
        data: {
          original_url: shrineImage.original_url || shrineImage.image_url,
          url_64: shrineImage.marker_url,
          url_128: shrineImage.thumbnail_url,
          url_256: shrineImage.thumbnail_url,
          url_512: shrineImage.original_url || shrineImage.image_url,
          uploaded_by: shrineImage.user?.name || '不明'
        }
      });

      // ShrineImageテーブルを更新
      await prisma.shrineImage.update({
        where: { id: shrineImage.id },
        data: { image_id: image.id }
      });

      // 現在のサムネイルの場合、神社テーブルも更新
      if (shrineImage.is_current_thumbnail) {
        await prisma.shrine.update({
          where: { id: shrineImage.shrine_id },
          data: {
            image_id: image.id,
            image_url: image.original_url,
            image_url64: image.url_64,
            image_url128: image.url_128,
            image_url256: image.url_256,
            image_url512: image.url_512,
            image_by: image.uploaded_by
          }
        });
      }
    }

    // 2. 既存のDietyImageデータを移行
    console.log('神様画像データを移行中...');
    const dietyImages = await prisma.dietyImage.findMany({
      include: { user: true }
    });

    for (const dietyImage of dietyImages) {
      // Imageテーブルに登録
      const image = await prisma.image.create({
        data: {
          original_url: dietyImage.original_url || dietyImage.image_url,
          url_64: dietyImage.marker_url,
          url_128: dietyImage.thumbnail_url,
          url_256: dietyImage.thumbnail_url,
          url_512: dietyImage.original_url || dietyImage.image_url,
          uploaded_by: dietyImage.user?.name || '不明'
        }
      });

      // DietyImageテーブルを更新
      await prisma.dietyImage.update({
        where: { id: dietyImage.id },
        data: { image_id: image.id }
      });

      // 現在のサムネイルの場合、神様テーブルも更新
      if (dietyImage.is_current_thumbnail) {
        await prisma.diety.update({
          where: { id: dietyImage.diety_id },
          data: {
            image_id: image.id,
            image_url: image.original_url,
            image_url64: image.url_64,
            image_url128: image.url_128,
            image_url256: image.url_256,
            image_url512: image.url_512,
            image_by: image.uploaded_by
          }
        });
      }
    }

    console.log('画像データの移行が完了しました！');
  } catch (error) {
    console.error('画像データ移行エラー:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプト実行
if (require.main === module) {
  migrateImageData()
    .then(() => {
      console.log('移行スクリプトが正常に完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('移行スクリプトでエラーが発生しました:', error);
      process.exit(1);
    });
}

export { migrateImageData };
