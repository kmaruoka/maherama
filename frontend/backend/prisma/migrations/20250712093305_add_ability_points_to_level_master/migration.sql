/*
  Warnings:

  - Added the required column `ability_points` to the `LevelMaster` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LevelMaster" ADD COLUMN     "ability_points" INTEGER NOT NULL DEFAULT 100;

-- 既存データにデフォルト値を設定
UPDATE "LevelMaster" SET "ability_points" = 100 WHERE "ability_points" IS NULL;

-- デフォルト制約を削除
ALTER TABLE "LevelMaster" ALTER COLUMN "ability_points" DROP DEFAULT;
