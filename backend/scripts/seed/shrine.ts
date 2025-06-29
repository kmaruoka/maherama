import { PrismaClient } from '@prisma/client';
import axios from 'axios';

// OpenCage APIで住所から座標を取得
async function geocode(location: string): Promise<{ lat: number; lng: number }> {
  const res = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
    params: {
      key: 'bb9388bfa20f4f7c80c37c54d8627615',
      q: location,
      language: 'ja',
    },
  });
  const result = res.data.results[0];
  if (!result) throw new Error(`住所に対する座標が見つかりません: ${location}`);
  return {
    lat: result.geometry.lat,
    lng: result.geometry.lng,
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function seedShrine(prisma: PrismaClient): Promise<Set<number>> {
  const rawData = [
    {
      id: 1,
      name: '天村雲神社(山川町村雲)',
      kana: 'あめのむらくもじんじゃ',
      location: '徳島県吉野川市山川町村雲１３３',
      thumbnailUrl: '/vite.svg',
      thumbnailBy: 'テストユーザー1',
      founded: '平安時代',
      history: '古くから地域の信仰を集める神社。',
      festivals: '例祭：10月10日',
      description: '山川町村雲に鎮座する由緒ある神社。',
    },
    {
      id: 8,
      name: "宇志比古・宇志比売神社",
      kana: "うしひこ うしひめじんじゃ",
      location: "徳島県鳴門市大麻町板東牛ノ宮東１８",
      thumbnailUrl: '/vite.svg',
      thumbnailBy: 'テストユーザー1',
      founded: '平安時代',
      history: '古くから地域の信仰を集める神社。',
      festivals: '例祭：10月10日',
      description: '鳴門市大麻町に鎮座する由緒ある神社。',
    },
    {
      id: 1831,
      name: '八幡神社(南伊豆町子浦)',
      kana: 'はちまんじんじゃ',
      location: '静岡県賀茂郡南伊豆町子浦１０００',
      thumbnailUrl: '/vite.svg',
      thumbnailBy: 'テストユーザー3',
      founded: '鎌倉時代',
      history: '海の守り神として信仰される。',
      festivals: '夏祭り：7月20日',
      description: '南伊豆町子浦の八幡神社。',
    },
  ];

  const enrichedData: any[] = [];
  const insertedIds = new Set<number>();
  for (const item of rawData) {
    try {
      console.log(`Geocoding: ${item.location}`);
      const { lat, lng } = await geocode(item.location);
      enrichedData.push({ ...item, lat, lng });
      insertedIds.add(item.id);
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
  return insertedIds;
}
