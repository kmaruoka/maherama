/*
  Warnings:

  - You are about to drop the column `url` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `url128` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `url256` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `url512` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `url64` on the `Image` table. All the data in the column will be lost.
  - Added the required column `original_url` to the `Image` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uploaded_by` to the `Image` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Image" DROP COLUMN "url",
DROP COLUMN "url128",
DROP COLUMN "url256",
DROP COLUMN "url512",
DROP COLUMN "url64",
ADD COLUMN     "original_url" TEXT NOT NULL,
ADD COLUMN     "uploaded_by" TEXT NOT NULL,
ADD COLUMN     "url_l" TEXT,
ADD COLUMN     "url_m" TEXT,
ADD COLUMN     "url_s" TEXT,
ADD COLUMN     "url_xl" TEXT,
ADD COLUMN     "url_xs" TEXT;
