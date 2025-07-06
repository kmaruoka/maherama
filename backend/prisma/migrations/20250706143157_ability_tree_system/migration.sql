/*
  Warnings:

  - You are about to drop the column `cost` on the `AbilityMaster` table. All the data in the column will be lost.
  - Added the required column `base_cost` to the `AbilityMaster` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- まず新しいカラムを追加（デフォルト値付き）
ALTER TABLE "AbilityMaster" ADD COLUMN "base_cost" INTEGER DEFAULT 100;
ALTER TABLE "AbilityMaster" ADD COLUMN "cost_increase" INTEGER DEFAULT 100;
ALTER TABLE "AbilityMaster" ADD COLUMN "max_level" INTEGER DEFAULT 1;
ALTER TABLE "AbilityMaster" ADD COLUMN "prerequisite_ability_id" INTEGER;

-- 既存のcostデータをbase_costにコピー
UPDATE "AbilityMaster" SET "base_cost" = "cost" WHERE "cost" IS NOT NULL;

-- カラムをNOT NULLに変更
ALTER TABLE "AbilityMaster" ALTER COLUMN "base_cost" SET NOT NULL;
ALTER TABLE "AbilityMaster" ALTER COLUMN "cost_increase" SET NOT NULL;
ALTER TABLE "AbilityMaster" ALTER COLUMN "max_level" SET NOT NULL;

-- 古いcostカラムを削除
ALTER TABLE "AbilityMaster" DROP COLUMN "cost";

-- AlterTable
ALTER TABLE "UserAbility" ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE "AbilityMaster" ADD CONSTRAINT "AbilityMaster_prerequisite_ability_id_fkey" FOREIGN KEY ("prerequisite_ability_id") REFERENCES "AbilityMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
