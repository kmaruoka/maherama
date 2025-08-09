import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateImageUrls() {
  console.log('画像URLの移行を開始します...');

  try {
    // 1. ImageテーブルのURLを更新
    console.log('ImageテーブルのURLを更新中...');
    const images = await prisma.image.findMany();

    for (const image of images) {
      const updates: any = {};

      if (image.url && image.url.startsWith('/uploads/')) {
        updates.url = image.url.replace('/uploads/', '/images/');
      }
      if (image.url64 && image.url64.startsWith('/uploads/')) {
        updates.url64 = image.url64.replace('/uploads/', '/images/');
      }
      if (image.url128 && image.url128.startsWith('/uploads/')) {
        updates.url128 = image.url128.replace('/uploads/', '/images/');
      }
      if (image.url256 && image.url256.startsWith('/uploads/')) {
        updates.url256 = image.url256.replace('/uploads/', '/images/');
      }
      if (image.url512 && image.url512.startsWith('/uploads/')) {
        updates.url512 = image.url512.replace('/uploads/', '/images/');
      }

      if (Object.keys(updates).length > 0) {
        await prisma.image.update({
          where: { id: image.id },
          data: updates
        });
        console.log(`Image ID ${image.id} を更新:`, updates);
      }
    }

    // 2. ShrineImageテーブルの関連するImageテーブルのURLを更新
    console.log('ShrineImageテーブルの関連するImageテーブルのURLを更新中...');
    const shrineImages = await prisma.shrineImage.findMany({
      include: { image: true }
    });

    for (const shrineImage of shrineImages) {
      const image = shrineImage.image;
      const updates: any = {};

      if (image.url && image.url.startsWith('/uploads/')) {
        updates.url = image.url.replace('/uploads/', '/images/');
      }
      if (image.url64 && image.url64.startsWith('/uploads/')) {
        updates.url64 = image.url64.replace('/uploads/', '/images/');
      }
      if (image.url128 && image.url128.startsWith('/uploads/')) {
        updates.url128 = image.url128.replace('/uploads/', '/images/');
      }
      if (image.url256 && image.url256.startsWith('/uploads/')) {
        updates.url256 = image.url256.replace('/uploads/', '/images/');
      }
      if (image.url512 && image.url512.startsWith('/uploads/')) {
        updates.url512 = image.url512.replace('/uploads/', '/images/');
      }

      if (Object.keys(updates).length > 0) {
        await prisma.image.update({
          where: { id: image.id },
          data: updates
        });
        console.log(`ShrineImage ID ${shrineImage.id} の関連Image ID ${image.id} を更新:`, updates);
      }
    }

    // 3. ShrineテーブルのURLを更新
    console.log('ShrineテーブルのURLを更新中...');
    const shrines = await prisma.shrine.findMany();

    for (const shrine of shrines) {
      const updates: any = {};

      if (shrine.image_url && shrine.image_url.startsWith('/uploads/')) {
        updates.image_url = shrine.image_url.replace('/uploads/', '/images/');
      }
      if (shrine.image_url64 && shrine.image_url64.startsWith('/uploads/')) {
        updates.image_url64 = shrine.image_url64.replace('/uploads/', '/images/');
      }
      if (shrine.image_url128 && shrine.image_url128.startsWith('/uploads/')) {
        updates.image_url128 = shrine.image_url128.replace('/uploads/', '/images/');
      }
      if (shrine.image_url256 && shrine.image_url256.startsWith('/uploads/')) {
        updates.image_url256 = shrine.image_url256.replace('/uploads/', '/images/');
      }
      if (shrine.image_url512 && shrine.image_url512.startsWith('/uploads/')) {
        updates.image_url512 = shrine.image_url512.replace('/uploads/', '/images/');
      }

      if (Object.keys(updates).length > 0) {
        await prisma.shrine.update({
          where: { id: shrine.id },
          data: updates
        });
        console.log(`Shrine ID ${shrine.id} を更新:`, updates);
      }
    }

    // 4. DietyテーブルのURLを更新
    console.log('DietyテーブルのURLを更新中...');
    const dieties = await prisma.diety.findMany();

    for (const diety of dieties) {
      const updates: any = {};

      if (diety.image_url && diety.image_url.startsWith('/uploads/')) {
        updates.image_url = diety.image_url.replace('/uploads/', '/images/');
      }
      if (diety.image_url64 && diety.image_url64.startsWith('/uploads/')) {
        updates.image_url64 = diety.image_url64.replace('/uploads/', '/images/');
      }
      if (diety.image_url128 && diety.image_url128.startsWith('/uploads/')) {
        updates.image_url128 = diety.image_url128.replace('/uploads/', '/images/');
      }
      if (diety.image_url256 && diety.image_url256.startsWith('/uploads/')) {
        updates.image_url256 = diety.image_url256.replace('/uploads/', '/images/');
      }
      if (diety.image_url512 && diety.image_url512.startsWith('/uploads/')) {
        updates.image_url512 = diety.image_url512.replace('/uploads/', '/images/');
      }

      if (Object.keys(updates).length > 0) {
        await prisma.diety.update({
          where: { id: diety.id },
          data: updates
        });
        console.log(`Diety ID ${diety.id} を更新:`, updates);
      }
    }

    // 5. DietyImageテーブルの関連するImageテーブルのURLを更新
    console.log('DietyImageテーブルの関連するImageテーブルのURLを更新中...');
    const dietyImages = await prisma.dietyImage.findMany({
      include: { image: true }
    });

    for (const dietyImage of dietyImages) {
      const image = dietyImage.image;
      const updates: any = {};

      if (image.url && image.url.startsWith('/uploads/')) {
        updates.url = image.url.replace('/uploads/', '/images/');
      }
      if (image.url64 && image.url64.startsWith('/uploads/')) {
        updates.url64 = image.url64.replace('/uploads/', '/images/');
      }
      if (image.url128 && image.url128.startsWith('/uploads/')) {
        updates.url128 = image.url128.replace('/uploads/', '/images/');
      }
      if (image.url256 && image.url256.startsWith('/uploads/')) {
        updates.url256 = image.url256.replace('/uploads/', '/images/');
      }
      if (image.url512 && image.url512.startsWith('/uploads/')) {
        updates.url512 = image.url512.replace('/uploads/', '/images/');
      }

      if (Object.keys(updates).length > 0) {
        await prisma.image.update({
          where: { id: image.id },
          data: updates
        });
        console.log(`DietyImage ID ${dietyImage.id} の関連Image ID ${image.id} を更新:`, updates);
      }
    }

    console.log('✅ 画像URLの移行が完了しました。');
  } catch (error) {
    console.error('❌ 画像URLの移行中にエラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプトを実行
migrateImageUrls();
