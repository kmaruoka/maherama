import { PrismaClient } from '@prisma/client';

export async function seedLog(prisma: PrismaClient) {
  const now = new Date();
  const data = [
    { message: 'システム: データベースを初期化しました', type: 'system', time: new Date(now.getTime() - 1000 * 60 * 60 * 2) },
    { message: '<user:1:テストユーザー1>が<shrine:1:天村雲神社(山川町村雲)>を参拝しました', type: 'normal', time: new Date(now.getTime() - 1000 * 60 * 60 * 1.5) },
    { message: '<user:2:テストユーザー2>が<shrine:2:蜂須神社(つるぎ町)>を遥拝しました', type: 'normal', time: new Date(now.getTime() - 1000 * 60 * 60 * 1.2) },
    { message: '<user:2:テストユーザー2>が<shrine:1:天村雲神社(山川町村雲)>を遥拝しました', type: 'normal', time: new Date(now.getTime() - 1000 * 60 * 60 * 0.7) },
    { message: '<user:3:テストユーザー3>が<shrine:2:蜂須神社(つるぎ町)>を参拝しました', type: 'normal', time: new Date(now.getTime() - 1000 * 60 * 60 * 0.6) },
    { message: '<user:3:テストユーザー3>が<shrine:1:天村雲神社(山川町村雲)>を参拝しました', type: 'normal', time: new Date(now.getTime() - 1000 * 60 * 60 * 0.3) },
    { message: '<user:1:テストユーザー1>が<shrine:2:蜂須神社(つるぎ町)>を遥拝しました', type: 'normal', time: new Date(now.getTime() - 1000 * 60 * 60 * 0.2) },
  ];
  await prisma.log.createMany({ data, skipDuplicates: true });
}
