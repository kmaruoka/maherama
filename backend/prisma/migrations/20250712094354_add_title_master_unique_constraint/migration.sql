/*
  Warnings:

  - A unique constraint covering the columns `[condition_type,condition_value]` on the table `TitleMaster` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TitleMaster_condition_type_condition_value_key" ON "TitleMaster"("condition_type", "condition_value");
