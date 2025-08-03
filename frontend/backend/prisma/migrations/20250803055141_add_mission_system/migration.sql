-- CreateTable
CREATE TABLE "MissionMaster" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mission_type" TEXT NOT NULL DEFAULT 'permanent',
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "exp_reward" INTEGER NOT NULL DEFAULT 0,
    "ability_reward" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventMaster" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image_id" INTEGER,
    "image_url" TEXT,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventMission" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "mission_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionShrine" (
    "id" SERIAL NOT NULL,
    "mission_id" INTEGER NOT NULL,
    "shrine_id" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionShrine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionDiety" (
    "id" SERIAL NOT NULL,
    "mission_id" INTEGER NOT NULL,
    "diety_id" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionDiety_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionTitle" (
    "id" SERIAL NOT NULL,
    "mission_id" INTEGER NOT NULL,
    "title_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMission" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "mission_id" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventMission_event_id_mission_id_key" ON "EventMission"("event_id", "mission_id");

-- CreateIndex
CREATE UNIQUE INDEX "MissionShrine_mission_id_shrine_id_key" ON "MissionShrine"("mission_id", "shrine_id");

-- CreateIndex
CREATE UNIQUE INDEX "MissionDiety_mission_id_diety_id_key" ON "MissionDiety"("mission_id", "diety_id");

-- CreateIndex
CREATE UNIQUE INDEX "MissionTitle_mission_id_title_id_key" ON "MissionTitle"("mission_id", "title_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserMission_user_id_mission_id_key" ON "UserMission"("user_id", "mission_id");

-- AddForeignKey
ALTER TABLE "EventMaster" ADD CONSTRAINT "EventMaster_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMission" ADD CONSTRAINT "EventMission_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "EventMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMission" ADD CONSTRAINT "EventMission_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "MissionMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionShrine" ADD CONSTRAINT "MissionShrine_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "MissionMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionShrine" ADD CONSTRAINT "MissionShrine_shrine_id_fkey" FOREIGN KEY ("shrine_id") REFERENCES "Shrine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionDiety" ADD CONSTRAINT "MissionDiety_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "MissionMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionDiety" ADD CONSTRAINT "MissionDiety_diety_id_fkey" FOREIGN KEY ("diety_id") REFERENCES "Diety"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionTitle" ADD CONSTRAINT "MissionTitle_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "MissionMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionTitle" ADD CONSTRAINT "MissionTitle_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "TitleMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMission" ADD CONSTRAINT "UserMission_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "MissionMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMission" ADD CONSTRAINT "UserMission_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
