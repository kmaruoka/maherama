/*
  Warnings:

  - You are about to drop the column `time` on the `DietyPray` table. All the data in the column will be lost.
  - You are about to drop the column `time` on the `Log` table. All the data in the column will be lost.
  - You are about to drop the column `time` on the `ShrinePray` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AbilityLog" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AbilityMaster" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Diety" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DietyBook" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DietyImage" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DietyImageVote" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DietyPray" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DietyPrayStats" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DietyPrayStatsDaily" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DietyPrayStatsMonthly" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DietyPrayStatsWeekly" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DietyPrayStatsYearly" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Follow" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ImageVote" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "LevelMaster" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Log" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "RemotePray" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Shrine" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ShrineApplication" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ShrineBook" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ShrineDiety" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ShrineImage" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ShrinePray" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ShrinePrayStats" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ShrinePrayStatsDaily" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ShrinePrayStatsMonthly" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ShrinePrayStatsWeekly" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ShrinePrayStatsYearly" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserAbility" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserSubscription" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserTitle" ALTER COLUMN "updated_at" DROP DEFAULT;

-- Rename columns to preserve data
ALTER TABLE "DietyPray" RENAME COLUMN "time" TO "prayed_at";
ALTER TABLE "Log" RENAME COLUMN "time" TO "logged_at";
ALTER TABLE "ShrinePray" RENAME COLUMN "time" TO "prayed_at";
