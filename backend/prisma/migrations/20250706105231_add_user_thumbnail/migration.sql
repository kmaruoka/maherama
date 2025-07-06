/*
  Warnings:

  - A unique constraint covering the columns `[diety_id,user_id]` on the table `DietyPrayStats` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[diety_id,user_id]` on the table `DietyPrayStatsDaily` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[diety_id,user_id]` on the table `DietyPrayStatsMonthly` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[diety_id,user_id]` on the table `DietyPrayStatsWeekly` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[diety_id,user_id]` on the table `DietyPrayStatsYearly` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shrine_id,user_id]` on the table `ShrinePrayStats` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shrine_id,user_id]` on the table `ShrinePrayStatsDaily` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shrine_id,user_id]` on the table `ShrinePrayStatsMonthly` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shrine_id,user_id]` on the table `ShrinePrayStatsWeekly` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shrine_id,user_id]` on the table `ShrinePrayStatsYearly` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "thumbnailUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DietyPrayStats_diety_id_user_id_key" ON "DietyPrayStats"("diety_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "DietyPrayStatsDaily_diety_id_user_id_key" ON "DietyPrayStatsDaily"("diety_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "DietyPrayStatsMonthly_diety_id_user_id_key" ON "DietyPrayStatsMonthly"("diety_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "DietyPrayStatsWeekly_diety_id_user_id_key" ON "DietyPrayStatsWeekly"("diety_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "DietyPrayStatsYearly_diety_id_user_id_key" ON "DietyPrayStatsYearly"("diety_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ShrinePrayStats_shrine_id_user_id_key" ON "ShrinePrayStats"("shrine_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ShrinePrayStatsDaily_shrine_id_user_id_key" ON "ShrinePrayStatsDaily"("shrine_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ShrinePrayStatsMonthly_shrine_id_user_id_key" ON "ShrinePrayStatsMonthly"("shrine_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ShrinePrayStatsWeekly_shrine_id_user_id_key" ON "ShrinePrayStatsWeekly"("shrine_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ShrinePrayStatsYearly_shrine_id_user_id_key" ON "ShrinePrayStatsYearly"("shrine_id", "user_id");

-- AddForeignKey
ALTER TABLE "ShrinePrayStats" ADD CONSTRAINT "ShrinePrayStats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShrinePrayStatsMonthly" ADD CONSTRAINT "ShrinePrayStatsMonthly_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShrinePrayStatsWeekly" ADD CONSTRAINT "ShrinePrayStatsWeekly_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShrinePrayStatsDaily" ADD CONSTRAINT "ShrinePrayStatsDaily_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShrinePrayStatsYearly" ADD CONSTRAINT "ShrinePrayStatsYearly_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietyPrayStats" ADD CONSTRAINT "DietyPrayStats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietyPrayStatsMonthly" ADD CONSTRAINT "DietyPrayStatsMonthly_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietyPrayStatsWeekly" ADD CONSTRAINT "DietyPrayStatsWeekly_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietyPrayStatsDaily" ADD CONSTRAINT "DietyPrayStatsDaily_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietyPrayStatsYearly" ADD CONSTRAINT "DietyPrayStatsYearly_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
