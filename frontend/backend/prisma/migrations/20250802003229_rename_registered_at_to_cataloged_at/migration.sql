/*
  Warnings:

  - You are about to drop the column `registered_at` on the `DietyCatalog` table. All the data in the column will be lost.
  - You are about to drop the column `registered_at` on the `ShrineCatalog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DietyCatalog" DROP COLUMN "registered_at",
ADD COLUMN     "cataloged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ShrineCatalog" DROP COLUMN "registered_at",
ADD COLUMN     "cataloged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
