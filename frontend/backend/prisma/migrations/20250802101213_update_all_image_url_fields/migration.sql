/*
  Warnings:

  - You are about to drop the column `image_url128` on the `Diety` table. All the data in the column will be lost.
  - You are about to drop the column `image_url256` on the `Diety` table. All the data in the column will be lost.
  - You are about to drop the column `image_url512` on the `Diety` table. All the data in the column will be lost.
  - You are about to drop the column `image_url64` on the `Diety` table. All the data in the column will be lost.
  - You are about to drop the column `image_url128` on the `Shrine` table. All the data in the column will be lost.
  - You are about to drop the column `image_url256` on the `Shrine` table. All the data in the column will be lost.
  - You are about to drop the column `image_url512` on the `Shrine` table. All the data in the column will be lost.
  - You are about to drop the column `image_url64` on the `Shrine` table. All the data in the column will be lost.
  - You are about to drop the column `image_url128` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `image_url256` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `image_url512` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `image_url64` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Diety" DROP COLUMN "image_url128",
DROP COLUMN "image_url256",
DROP COLUMN "image_url512",
DROP COLUMN "image_url64";

-- AlterTable
ALTER TABLE "Shrine" DROP COLUMN "image_url128",
DROP COLUMN "image_url256",
DROP COLUMN "image_url512",
DROP COLUMN "image_url64",
ADD COLUMN     "image_url_l" TEXT,
ADD COLUMN     "image_url_m" TEXT,
ADD COLUMN     "image_url_s" TEXT,
ADD COLUMN     "image_url_xl" TEXT,
ADD COLUMN     "image_url_xs" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "image_url128",
DROP COLUMN "image_url256",
DROP COLUMN "image_url512",
DROP COLUMN "image_url64",
ADD COLUMN     "image_url_l" TEXT,
ADD COLUMN     "image_url_m" TEXT,
ADD COLUMN     "image_url_s" TEXT,
ADD COLUMN     "image_url_xl" TEXT,
ADD COLUMN     "image_url_xs" TEXT;
