/*
  Warnings:

  - You are about to drop the column `slots` on the `UserSubscription` table. All the data in the column will be lost.
  - Added the required column `subscription_type` to the `UserSubscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UserSubscription" DROP COLUMN "slots",
ADD COLUMN     "subscription_type" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "LevelMaster" (
    "id" SERIAL NOT NULL,
    "level" INTEGER NOT NULL,
    "required_exp" INTEGER NOT NULL,
    "pray_distance" INTEGER NOT NULL,
    "worship_count" INTEGER NOT NULL,

    CONSTRAINT "LevelMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShrineImage" (
    "id" SERIAL NOT NULL,
    "shrine_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voting_month" TEXT NOT NULL,
    "is_winner" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ShrineImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageVote" (
    "id" SERIAL NOT NULL,
    "shrine_image_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "voted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShrineApplication" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "kana" TEXT,
    "location" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "founded" TEXT,
    "history" TEXT,
    "festivals" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,

    CONSTRAINT "ShrineApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LevelMaster_level_key" ON "LevelMaster"("level");

-- CreateIndex
CREATE UNIQUE INDEX "ImageVote_shrine_image_id_user_id_key" ON "ImageVote"("shrine_image_id", "user_id");

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShrineImage" ADD CONSTRAINT "ShrineImage_shrine_id_fkey" FOREIGN KEY ("shrine_id") REFERENCES "Shrine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShrineImage" ADD CONSTRAINT "ShrineImage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageVote" ADD CONSTRAINT "ImageVote_shrine_image_id_fkey" FOREIGN KEY ("shrine_image_id") REFERENCES "ShrineImage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageVote" ADD CONSTRAINT "ImageVote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShrineApplication" ADD CONSTRAINT "ShrineApplication_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
