/*
  Warnings:

  - You are about to drop the column `base_cost` on the `AbilityMaster` table. All the data in the column will be lost.
  - You are about to drop the column `cost_increase` on the `AbilityMaster` table. All the data in the column will be lost.
  - You are about to drop the column `max_level` on the `AbilityMaster` table. All the data in the column will be lost.
  - Added the required column `cost` to the `AbilityMaster` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AbilityMaster" DROP COLUMN "base_cost",
DROP COLUMN "cost_increase",
DROP COLUMN "max_level",
ADD COLUMN     "cost" INTEGER NOT NULL;
