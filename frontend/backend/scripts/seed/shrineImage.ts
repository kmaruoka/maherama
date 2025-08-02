import { PrismaClient } from '@prisma/client';

export async function seedShrineImage(prisma: PrismaClient) {
  // 明示的にseedしたい神社ID・ユーザーIDの組み合わせを指定
  const images = [
    { shrineId: 1, userId: 1 },
    { shrineId: 2, userId: 1 },
    { shrineId: 3, userId: 2 },
    // 必要に応じて追加
  ];

  // 前月のYYYYMM
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const yyyymm = `${prevMonth.getFullYear()}${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
  const uploadedAt = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 15, 12, 0, 0); // 前月15日

  for (const img of images) {
    const baseName = `shrine${img.shrineId}-u${img.userId}_s`;
    const originalUrl = `/images/${yyyymm}/${baseName}original.jpg`;
    const url64 = `/images/${yyyymm}/${baseName}marker.jpg`;
    const url160 = `/images/${yyyymm}/${baseName}160.jpg`;
    const url256 = `/images/${yyyymm}/${baseName}256.jpg`;
    const url512 = `/images/${yyyymm}/${baseName}512.jpg`;

      // まずImageテーブルに登録
  const image = await prisma.image.create({
    data: {
      original_url: originalUrl,
      url_xs: url64,
      url_s: url160,
      url_m: url256,
      url_l: url512,
      url_xl: originalUrl,
      uploaded_by: 'シードデータ'
    }
  });

    // 次にShrineImageテーブルに登録
    await prisma.shrineImage.create({
      data: {
        shrine_id: img.shrineId,
        user_id: img.userId,
        image_id: image.id,
        uploaded_at: uploadedAt,
        voting_month: yyyymm,
        is_winner: false,
        is_current_thumbnail: false,
      }
    });
  }
  console.log('✅ ShrineImage seed completed.');
} 