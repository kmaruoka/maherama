import { PrismaClient } from '@prisma/client';

export async function seedLog(prisma: PrismaClient) {
  const data = [
    { message: 'システム: データベースを初期化しました', type: 'system' },
    { message: '<user:テストユーザー1>が<shrine:1:天村雲神社(山川町村雲)>を参拝しました', type: 'normal' },
    { message: '<user:テストユーザー2>が<shrine:2:蜂須神社(つるぎ町)>を遥拝しました', type: 'normal' },
    { message: '<user:テストユーザー3>が<diety:1:天照大御神>を祈願しました', type: 'normal' },
  ];
  await prisma.log.createMany({ data, skipDuplicates: true });
}
