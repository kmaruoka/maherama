import { PrismaClient } from '@prisma/client';

export async function seedDiety(prisma: PrismaClient) {
  await prisma.diety.createMany({
    data: [
      { id: 1, name: '天照大御神', kana: 'あまてらすおおみかみ' },
      { id: 2, name: '月読命', kana: 'つくよみのみこと' },
      { id: 3, name: '素戔嗚尊', kana: 'すさのおのみこと' },
      { id: 4, name: '建御雷神', kana: 'たけみかづちのかみ' },
      { id: 5, name: '大国主命', kana: 'おおくにぬしのみこと' },
      { id: 6, name: '市杵島姫命', kana: 'いちきしまひめのみこと' },
      { id: 7, name: '応神天皇', kana: 'おうじんてんのう' },
      { id: 8, name: '菅原道真', kana: 'すがわらのみちざね' },
      { id: 9, name: '猿田彦命', kana: 'さるたひこのみこと' },
      { id: 10, name: '大山祇命', kana: 'おおやまづみのみこと' },
      { id: 11, name: '天児屋根命', kana: 'あめのこやねのみこと' },
      { id: 12, name: '木花咲耶姫命', kana: 'このはなさくやひめのみこと' },
      { id: 13, name: '伊邪那岐命', kana: 'いざなぎのみこと' },
      { id: 14, name: '伊邪那美命', kana: 'いざなみのみこと' },
      { id: 15, name: '少名毘古那命', kana: 'すくなひこなのみこと' },
      { id: 16, name: '天手力男命', kana: 'あめのたぢからおのみこと' },
      { id: 17, name: '大物主神', kana: 'おおものぬしのかみ' },
      { id: 18, name: '速玉男命', kana: 'はやたまおのみこと' },
      { id: 19, name: '事代主命', kana: 'ことしろぬしのみこと' },
      { id: 20, name: '大己貴命', kana: 'おおなむちのみこと' },
    ],
    skipDuplicates: true,
  });
}
