/*
  Warnings:

  - You are about to drop the column `thumbnailBy` on the `Diety` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnailUrl` on the `Diety` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Diety" DROP COLUMN "thumbnailBy",
DROP COLUMN "thumbnailUrl";

-- AlterTable
ALTER TABLE "DietyBook" ADD COLUMN     "last_prayed_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ShrineBook" ADD COLUMN     "last_prayed_at" TIMESTAMP(3);
