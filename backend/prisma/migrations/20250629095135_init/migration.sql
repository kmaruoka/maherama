/*
  Warnings:

  - You are about to drop the column `address` on the `Shrine` table. All the data in the column will be lost.
  - Added the required column `location` to the `Shrine` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Shrine" DROP COLUMN "address",
ADD COLUMN     "kana" TEXT,
ADD COLUMN     "location" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShrinePray" (
    "id" SERIAL NOT NULL,
    "shrine_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShrinePray_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DietyPray" (
    "id" SERIAL NOT NULL,
    "diety_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DietyPray_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShrinePrayStats" (
    "id" SERIAL NOT NULL,
    "rank" INTEGER NOT NULL,
    "shrine_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "ShrinePrayStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShrinePrayStatsMonthly" (
    "id" SERIAL NOT NULL,
    "rank" INTEGER NOT NULL,
    "shrine_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "ShrinePrayStatsMonthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShrinePrayStatsWeekly" (
    "id" SERIAL NOT NULL,
    "rank" INTEGER NOT NULL,
    "shrine_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "ShrinePrayStatsWeekly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShrinePrayStatsDaily" (
    "id" SERIAL NOT NULL,
    "rank" INTEGER NOT NULL,
    "shrine_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "ShrinePrayStatsDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DietyPrayStats" (
    "id" SERIAL NOT NULL,
    "rank" INTEGER NOT NULL,
    "diety_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "DietyPrayStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DietyPrayStatsMonthly" (
    "id" SERIAL NOT NULL,
    "rank" INTEGER NOT NULL,
    "diety_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "DietyPrayStatsMonthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DietyPrayStatsWeekly" (
    "id" SERIAL NOT NULL,
    "rank" INTEGER NOT NULL,
    "diety_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "DietyPrayStatsWeekly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DietyPrayStatsDaily" (
    "id" SERIAL NOT NULL,
    "rank" INTEGER NOT NULL,
    "diety_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "DietyPrayStatsDaily_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ShrinePray" ADD CONSTRAINT "ShrinePray_shrine_id_fkey" FOREIGN KEY ("shrine_id") REFERENCES "Shrine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietyPray" ADD CONSTRAINT "DietyPray_diety_id_fkey" FOREIGN KEY ("diety_id") REFERENCES "Diety"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShrinePrayStats" ADD CONSTRAINT "ShrinePrayStats_shrine_id_fkey" FOREIGN KEY ("shrine_id") REFERENCES "Shrine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShrinePrayStatsMonthly" ADD CONSTRAINT "ShrinePrayStatsMonthly_shrine_id_fkey" FOREIGN KEY ("shrine_id") REFERENCES "Shrine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShrinePrayStatsWeekly" ADD CONSTRAINT "ShrinePrayStatsWeekly_shrine_id_fkey" FOREIGN KEY ("shrine_id") REFERENCES "Shrine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShrinePrayStatsDaily" ADD CONSTRAINT "ShrinePrayStatsDaily_shrine_id_fkey" FOREIGN KEY ("shrine_id") REFERENCES "Shrine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietyPrayStats" ADD CONSTRAINT "DietyPrayStats_diety_id_fkey" FOREIGN KEY ("diety_id") REFERENCES "Diety"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietyPrayStatsMonthly" ADD CONSTRAINT "DietyPrayStatsMonthly_diety_id_fkey" FOREIGN KEY ("diety_id") REFERENCES "Diety"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietyPrayStatsWeekly" ADD CONSTRAINT "DietyPrayStatsWeekly_diety_id_fkey" FOREIGN KEY ("diety_id") REFERENCES "Diety"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietyPrayStatsDaily" ADD CONSTRAINT "DietyPrayStatsDaily_diety_id_fkey" FOREIGN KEY ("diety_id") REFERENCES "Diety"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
