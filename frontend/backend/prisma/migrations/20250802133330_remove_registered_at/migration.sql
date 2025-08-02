/*
  Warnings:

  - You are about to drop the column `registered_at` on the `Diety` table. All the data in the column will be lost.
  - You are about to drop the column `registered_at` on the `Shrine` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Diety" DROP COLUMN "registered_at";

-- AlterTable
ALTER TABLE "Shrine" DROP COLUMN "registered_at";
