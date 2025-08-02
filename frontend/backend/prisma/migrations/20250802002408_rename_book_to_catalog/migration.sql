/*
  Warnings:

  - You are about to drop the `DietyBook` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShrineBook` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DietyBook" DROP CONSTRAINT "DietyBook_diety_id_fkey";

-- DropForeignKey
ALTER TABLE "DietyBook" DROP CONSTRAINT "DietyBook_user_id_fkey";

-- DropForeignKey
ALTER TABLE "ShrineBook" DROP CONSTRAINT "ShrineBook_shrine_id_fkey";

-- DropForeignKey
ALTER TABLE "ShrineBook" DROP CONSTRAINT "ShrineBook_user_id_fkey";

-- DropTable
DROP TABLE "DietyBook";

-- DropTable
DROP TABLE "ShrineBook";

-- CreateTable
CREATE TABLE "ShrineCatalog" (
    "user_id" INTEGER NOT NULL,
    "shrine_id" INTEGER NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_prayed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShrineCatalog_pkey" PRIMARY KEY ("user_id","shrine_id")
);

-- CreateTable
CREATE TABLE "DietyCatalog" (
    "user_id" INTEGER NOT NULL,
    "diety_id" INTEGER NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_prayed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DietyCatalog_pkey" PRIMARY KEY ("user_id","diety_id")
);

-- AddForeignKey
ALTER TABLE "ShrineCatalog" ADD CONSTRAINT "ShrineCatalog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShrineCatalog" ADD CONSTRAINT "ShrineCatalog_shrine_id_fkey" FOREIGN KEY ("shrine_id") REFERENCES "Shrine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietyCatalog" ADD CONSTRAINT "DietyCatalog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietyCatalog" ADD CONSTRAINT "DietyCatalog_diety_id_fkey" FOREIGN KEY ("diety_id") REFERENCES "Diety"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
