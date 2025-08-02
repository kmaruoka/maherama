import { PrismaClient } from '@prisma/client';

export async function seedDietyImage(prisma: PrismaClient) {
  // 明示的にseedしたい神様ID・ユーザーIDの組み合わせを指定
  const images = [
    { dietyId: 1, userId: 1 },
    { dietyId: 2, userId: 1 },
    { dietyId: 3, userId: 2 },
    // 必要に応じて追加
  ];

  // 前月のYYYYMM
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const yyyymm = `${prevMonth.getFullYear()}${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
  const uploadedAt = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 15, 12, 0, 0); // 前月15日

  for (const img of images) {
    const baseName = `diety${img.dietyId}-u${img.userId}_d`;
    const originalUrl = `/uploads/${yyyymm}/${baseName}original.jpg`;
    const url64 = `/uploads/${yyyymm}/${baseName}marker.jpg`;
    const url128 = `/uploads/${yyyymm}/${baseName}thumbnail.jpg`;
    const url256 = `/uploads/${yyyymm}/${baseName}original.jpg`;
    const url512 = `/uploads/${yyyymm}/${baseName}original.jpg`;

    // まずImageテーブルに登録
    const image = await prisma.image.create({
      data: {
        url: originalUrl,
        url64: url64,
        url128: url128,
        url256: url256,
        url512: url512
      }
    });

    // 次にDietyImageテーブルに登録
    await prisma.dietyImage.create({
      data: {
        diety_id: img.dietyId,
        user_id: img.userId,
        image_id: image.id,
        uploaded_at: uploadedAt,
        voting_month: yyyymm,
        is_winner: false,
        is_current_thumbnail: false,
      }
    });
  }
  console.log('✅ DietyImage seed completed.');
} 