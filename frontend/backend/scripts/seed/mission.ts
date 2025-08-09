import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedMissions() {
  console.log('🌟 ミッションシステムのシードを開始します...');

  // 常設ミッション
  const permanentMissions = [
    {
      name: '初参拝',
      content: '初めての神社参拝を完了しましょう',
      mission_type: 'permanent' as const,
      exp_reward: 50,
      ability_reward: { 1: 5 }, // 能力ID 1に5ポイント
      shrines: [{ shrine_id: 1, count: 1 }],
      titles: [{ title_id: 1 }]
    },
    {
      name: '神社巡り',
      content: '5つの神社を参拝しましょう',
      mission_type: 'permanent' as const,
      exp_reward: 200,
      ability_reward: { 1: 10 },
      shrines: [
        { shrine_id: 1, count: 1 },
        { shrine_id: 2, count: 1 },
        { shrine_id: 3, count: 1 },
        { shrine_id: 4, count: 1 },
        { shrine_id: 5, count: 1 }
      ],
      titles: [{ title_id: 2 }]
    },
    {
      name: '神様との出会い',
      content: '10体の神様を参拝しましょう',
      mission_type: 'permanent' as const,
      exp_reward: 300,
      ability_reward: { 2: 15 },
      dieties: [
        { diety_id: 1, count: 1 },
        { diety_id: 2, count: 1 },
        { diety_id: 3, count: 1 },
        { diety_id: 4, count: 1 },
        { diety_id: 5, count: 1 },
        { diety_id: 6, count: 1 },
        { diety_id: 7, count: 1 },
        { diety_id: 8, count: 1 },
        { diety_id: 9, count: 1 },
        { diety_id: 10, count: 1 }
      ],
      titles: [{ title_id: 3 }]
    },
    {
      name: '遥拝マスター',
      content: '遥拝を10回使用しましょう',
      mission_type: 'permanent' as const,
      exp_reward: 150,
      ability_reward: { 3: 8 },
      shrines: [{ shrine_id: 1, count: 10 }], // 遥拝は同じ神社でもカウント
      titles: [{ title_id: 4 }]
    }
  ];

  // イベントミッション
  const eventMissions = [
    {
      name: '春の神社巡り',
      content: '春の特別イベント！桜の季節に神社を巡りましょう',
      mission_type: 'event' as const,
      start_at: new Date('2024-03-01'),
      end_at: new Date('2024-05-31'),
      exp_reward: 500,
      ability_reward: { 1: 20, 2: 15 },
      shrines: [
        { shrine_id: 1, count: 3 },
        { shrine_id: 2, count: 2 },
        { shrine_id: 3, count: 2 }
      ],
      titles: [{ title_id: 5 }]
    },
    {
      name: '夏祭りチャレンジ',
      content: '夏祭り期間中の特別ミッション！暑い夏を乗り越えましょう',
      mission_type: 'event' as const,
      start_at: new Date('2024-07-01'),
      end_at: new Date('2024-08-31'),
      exp_reward: 400,
      ability_reward: { 2: 25 },
      dieties: [
        { diety_id: 1, count: 5 },
        { diety_id: 2, count: 5 }
      ],
      titles: [{ title_id: 6 }]
    }
  ];

  // イベントマスター
  const events = [
    {
      name: '春の神社巡りイベント',
      content: '桜の季節に合わせて神社巡りを楽しもう！期間中は特別な報酬がもらえます。',
      start_at: new Date('2024-03-01'),
      end_at: new Date('2024-05-31'),
      image_url: '/images/events/spring-shrine.jpg'
    },
    {
      name: '夏祭りイベント',
      content: '暑い夏を神様と一緒に乗り越えよう！夏限定のミッションに挑戦してください。',
      start_at: new Date('2024-07-01'),
      end_at: new Date('2024-08-31'),
      image_url: '/images/events/summer-festival.jpg'
    }
  ];

  try {
    // イベントマスターを作成
    for (const eventData of events) {
      const event = await prisma.eventMaster.create({
        data: {
          name: eventData.name,
          content: eventData.content,
          start_at: eventData.start_at,
          end_at: eventData.end_at,
          image_url: eventData.image_url
        }
      });
      console.log(`✅ イベント作成: ${event.name}`);
    }

    // ミッションを作成
    for (const missionData of [...permanentMissions, ...eventMissions]) {
      const { shrines, dieties, titles, ...missionInfo } = missionData;

      const mission = await prisma.missionMaster.create({
        data: {
          ...missionInfo
        }
      });

      // 神社ミッション関連を作成
      if (shrines) {
        for (const shrineData of shrines) {
          await prisma.missionShrine.create({
            data: {
              mission_id: mission.id,
              shrine_id: shrineData.shrine_id,
              count: shrineData.count
            }
          });
        }
      }

      // 神様ミッション関連を作成
      if (dieties) {
        for (const dietyData of dieties) {
          await prisma.missionDiety.create({
            data: {
              mission_id: mission.id,
              diety_id: dietyData.diety_id,
              count: dietyData.count
            }
          });
        }
      }

      // 称号報酬を作成
      if (titles) {
        for (const titleData of titles) {
          await prisma.missionTitle.create({
            data: {
              mission_id: mission.id,
              title_id: titleData.title_id
            }
          });
        }
      }

      console.log(`✅ ミッション作成: ${mission.name}`);
    }

    // イベントとミッションを関連付け
    const springEvent = await prisma.eventMaster.findFirst({
      where: { name: '春の神社巡りイベント' }
    });
    const summerEvent = await prisma.eventMaster.findFirst({
      where: { name: '夏祭りイベント' }
    });

    const springMission = await prisma.missionMaster.findFirst({
      where: { name: '春の神社巡り' }
    });
    const summerMission = await prisma.missionMaster.findFirst({
      where: { name: '夏祭りチャレンジ' }
    });

    if (springEvent && springMission) {
      await prisma.eventMission.create({
        data: {
          event_id: springEvent.id,
          mission_id: springMission.id
        }
      });
    }

    if (summerEvent && summerMission) {
      await prisma.eventMission.create({
        data: {
          event_id: summerEvent.id,
          mission_id: summerMission.id
        }
      });
    }

    // ユーザーミッションの初期化
    console.log('🔄 ユーザーミッションの初期化を開始します...');

    // 全ユーザーを取得
    const users = await prisma.user.findMany({
      select: { id: true }
    });

    // 全ミッションを取得
    const allMissions = await prisma.missionMaster.findMany({
      select: { id: true }
    });

    // 各ユーザーに対して全ミッションのUserMissionレコードを作成
    for (const user of users) {
      for (const mission of allMissions) {
        await prisma.userMission.upsert({
          where: {
            user_id_mission_id: {
              user_id: user.id,
              mission_id: mission.id
            }
          },
          update: {}, // 既存の場合は更新しない
          create: {
            user_id: user.id,
            mission_id: mission.id,
            progress: 0,
            is_completed: false
          }
        });
      }
    }

    console.log(`✅ ユーザーミッション初期化完了: ${users.length}ユーザー × ${allMissions.length}ミッション`);

    console.log('✅ ミッションシステムのシードが完了しました！');
  } catch (error) {
    console.error('❌ ミッションシステムのシード中にエラーが発生しました:', error);
    throw error;
  }
}
