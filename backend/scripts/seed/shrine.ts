import { PrismaClient } from '@prisma/client';
import axios from 'axios';

// OpenCage APIで住所から座標を取得
async function geocode(address: string): Promise<{ lat: number; lng: number }> {
  const res = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
    params: {
      key: 'bb9388bfa20f4f7c80c37c54d8627615',
      q: address,
      language: 'ja',
    },
  });
  const result = res.data.results[0];
  if (!result) throw new Error(`住所に対する座標が見つかりません: ${address}`);
  return {
    lat: result.geometry.lat,
    lng: result.geometry.lng,
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function seedShrine(prisma: PrismaClient) {
  const rawData = [
    { id: 1, name: '天村雲神社(山川町村雲)', kana: 'あめのむらくもじんじゃ', location: '徳島県吉野川市山川町村雲１３３' },
    { id: 2, name: '蜂須神社(つるぎ町)', kana: 'はちすじんじゃ', location: '徳島県美馬郡つるぎ町貞光字宮平７' },
    { id: 3, name: '葛木男神社', kana: 'かつらぎおじんじゃ', location: '高知県高知市布師田字西谷宮ノ辺１３５８' },
    { id: 1831, name: '八幡神社(南伊豆町子浦)', kana: 'はちまんじんじゃ', location: '静岡県賀茂郡南伊豆町子浦１０００' },
  ];

  const enrichedData: any[] = [];
  for (const item of rawData) {
    try {
      console.log(`Geocoding: ${item.location}`);
      const { lat, lng } = await geocode(item.location);
      enrichedData.push({ ...item, lat, lng });
    } catch (e) {
      console.warn(`⚠️ スキップ: ${item.location} - ${(e as Error).message}`);
    }
    await sleep(1100);
  }

  if (enrichedData.length > 0) {
    await prisma.shrine.createMany({
      data: enrichedData,
      skipDuplicates: true,
    });
  }
}
