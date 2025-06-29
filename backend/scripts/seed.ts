import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

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

// スリープ関数（ms 単位）
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const rawData = [
    { id: 1, name: "天村雲神社(山川町村雲)", kana: "あめのむらくもじんじゃ", location: "徳島県吉野川市山川町村雲１３３" },
    { id: 2, name: "蜂須神社(つるぎ町)", kana: "はちすじんじゃ", location: "徳島県美馬郡つるぎ町貞光字宮平７" },
    { id: 3, name: "葛木男神社", kana: "かつらぎおじんじゃ", location: "高知県高知市布師田字西谷宮ノ辺１３５８" },
    { id: 1831, name: "八幡神社(南伊豆町子浦)", kana: "はちまんじんじゃ", location: "静岡県賀茂郡南伊豆町子浦１０００" },
    // 必要に応じて追加
  ];

  const enrichedData = [];

  for (const item of rawData) {
    try {
      console.log(`Geocoding: ${item.location}`);
      const { lat, lng } = await geocode(item.location);
      enrichedData.push({ ...item, lat, lng });
    } catch (e) {
      console.warn(`⚠️ スキップ: ${item.location} - ${(e as Error).message}`);
    }
    await sleep(1100); // APIレート制限対策
  }

  if (enrichedData.length > 0) {
    await prisma.shrine.createMany({
      data: enrichedData,
      skipDuplicates: true, // 既に存在する主キー（id）はスキップ
    });
    console.log('登録完了');
  } else {
    console.log('登録対象なし');
  }

  // テスト用ログデータを追加（<>リンク形式で神社・神・ユーザー名を含む）
  await prisma.log.createMany({
    data: [
      { message: '<user:テスト太郎>が<shrine:天村雲神社>を参拝しました', type: 'normal' },
      { message: '<user:テスト花子>が<shrine:八幡神社>を参拝しました', type: 'normal' },
      { message: '<user:テスト太郎>が<shrine:八幡神社>を遥拝しました', type: 'normal' },
      { message: '<user:テスト三郎>が<diety:天照大御神>を祀りました', type: 'normal' },
      { message: '<user:テスト花子>が<diety:素戔嗚尊>を祀りました', type: 'normal' },
      { message: '<user:テスト三郎>が<shrine:天村雲神社>を参拝しました', type: 'normal' },
      { message: '<user:テスト太郎>が<diety:天照大御神>を祀りました', type: 'normal' },
      { message: '<user:テスト花子>が<shrine:天村雲神社>を遥拝しました', type: 'normal' },
      { message: '<user:テスト三郎>が<shrine:八幡神社>を参拝しました', type: 'normal' },
      { message: 'システム: サーバーを起動しました', type: 'system' }
    ]
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
