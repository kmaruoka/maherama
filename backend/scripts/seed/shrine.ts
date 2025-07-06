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

export async function seedShrine(prisma: PrismaClient): Promise<number[]> {
  const shrines = [
    { name: '天村雲神社', kana: 'あめのむらくもじんじゃ', location: '徳島県吉野川市山川町村雲１３３', lat: 34.067, lng: 134.283 },
    { name: '蜂須神社', kana: 'はちすじんじゃ', location: '徳島県鳴門市大麻町板東牛ノ宮東１８', lat: 34.123, lng: 134.567 },
    { name: '子浦神社', kana: 'こうらじんじゃ', location: '静岡県賀茂郡南伊豆町子浦１０００', lat: 34.567, lng: 138.765 },
    { name: '綱敷天神社御旅社', kana: 'つなしきてんじんしゃおたびしゃ', location: '大阪府大阪市北区梅田３丁目１−１', lat: 34.702485, lng: 135.495951 },
    { name: '露天神社', kana: 'つゆのてんじんじゃ', location: '大阪府大阪市北区曽根崎２丁目５−４', lat: 34.699731, lng: 135.501180 },
    { name: '大阪天満宮', kana: 'おおさかてんまんぐう', location: '大阪府大阪市北区天神橋２丁目１−８', lat: 34.698056, lng: 135.515000 },
  ];
  const result = await prisma.shrine.createMany({ data: shrines, skipDuplicates: true });
  const allShrines = await prisma.shrine.findMany({ select: { id: true } });
  return allShrines.map(s => s.id);
}
