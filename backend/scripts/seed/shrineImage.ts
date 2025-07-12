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
    await prisma.shrineImage.create({
      data: {
        shrine_id: img.shrineId,
        user_id: img.userId,
        image_url: `/uploads/${yyyymm}/${baseName}original.jpg`,
        marker_url: `/uploads/${yyyymm}/${baseName}marker.jpg`,
        thumbnail_url: `/uploads/${yyyymm}/${baseName}thumbnail.jpg`,
        original_url: `/uploads/${yyyymm}/${baseName}original.jpg`,
        uploaded_at: uploadedAt,
        voting_month: yyyymm,
        is_winner: false,
        is_current_thumbnail: false,
      }
    });
  }
  console.log('✅ ShrineImage seed completed.');
} 