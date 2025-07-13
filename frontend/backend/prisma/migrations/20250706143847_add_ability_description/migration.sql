/*
  Warnings:

  - Added the required column `description` to the `AbilityMaster` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- まずデフォルト値付きでカラムを追加
ALTER TABLE "AbilityMaster" ADD COLUMN "description" TEXT DEFAULT '能力の説明';

-- カラムをNOT NULLに変更
ALTER TABLE "AbilityMaster" ALTER COLUMN "description" SET NOT NULL;
