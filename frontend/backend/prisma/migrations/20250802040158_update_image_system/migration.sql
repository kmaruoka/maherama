/*
  Warnings:

  - You are about to drop the column `image_url` on the `DietyImage` table. All the data in the column will be lost.
  - You are about to drop the column `marker_url` on the `DietyImage` table. All the data in the column will be lost.
  - You are about to drop the column `original_url` on the `DietyImage` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail_url` on the `DietyImage` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnailBy` on the `Shrine` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnailUrl` on the `Shrine` table. All the data in the column will be lost.
  - You are about to drop the column `image_url` on the `ShrineImage` table. All the data in the column will be lost.
  - You are about to drop the column `marker_url` on the `ShrineImage` table. All the data in the column will be lost.
  - You are about to drop the column `original_url` on the `ShrineImage` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail_url` on the `ShrineImage` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnailUrl` on the `User` table. All the data in the column will be lost.
  - Added the required column `image_id` to the `DietyImage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `image_id` to the `ShrineImage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Diety" ADD COLUMN     "image_by" TEXT,
ADD COLUMN     "image_id" INTEGER,
ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "image_url128" TEXT,
ADD COLUMN     "image_url256" TEXT,
ADD COLUMN     "image_url512" TEXT,
ADD COLUMN     "image_url64" TEXT;

-- AlterTable
ALTER TABLE "DietyImage" DROP COLUMN "image_url",
DROP COLUMN "marker_url",
DROP COLUMN "original_url",
DROP COLUMN "thumbnail_url",
ADD COLUMN     "image_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Shrine" DROP COLUMN "thumbnailBy",
DROP COLUMN "thumbnailUrl",
ADD COLUMN     "image_by" TEXT,
ADD COLUMN     "image_id" INTEGER,
ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "image_url128" TEXT,
ADD COLUMN     "image_url256" TEXT,
ADD COLUMN     "image_url512" TEXT,
ADD COLUMN     "image_url64" TEXT;

-- AlterTable
ALTER TABLE "ShrineImage" DROP COLUMN "image_url",
DROP COLUMN "marker_url",
DROP COLUMN "original_url",
DROP COLUMN "thumbnail_url",
ADD COLUMN     "image_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "thumbnailUrl",
ADD COLUMN     "image_by" TEXT,
ADD COLUMN     "image_id" INTEGER,
ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "image_url128" TEXT,
ADD COLUMN     "image_url256" TEXT,
ADD COLUMN     "image_url512" TEXT,
ADD COLUMN     "image_url64" TEXT;

-- CreateTable
CREATE TABLE "Image" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "url64" TEXT,
    "url128" TEXT,
    "url256" TEXT,
    "url512" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Shrine" ADD CONSTRAINT "Shrine_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diety" ADD CONSTRAINT "Diety_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShrineImage" ADD CONSTRAINT "ShrineImage_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "Image"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietyImage" ADD CONSTRAINT "DietyImage_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "Image"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
