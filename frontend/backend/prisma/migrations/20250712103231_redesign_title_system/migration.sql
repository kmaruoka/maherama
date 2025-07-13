/*
  Warnings:

  - You are about to drop the column `condition_type` on the `TitleMaster` table. All the data in the column will be lost.
  - You are about to drop the column `condition_value` on the `TitleMaster` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `TitleMaster` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `TitleMaster` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,title_id,embed_data]` on the table `UserTitle` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `TitleMaster` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_template` to the `TitleMaster` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `TitleMaster` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `TitleMaster` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "TitleMaster_condition_type_condition_value_key";

-- DropIndex
DROP INDEX "UserTitle_user_id_title_id_key";

-- AlterTable
ALTER TABLE "TitleMaster" DROP COLUMN "condition_type",
DROP COLUMN "condition_value",
DROP COLUMN "name",
ADD COLUMN     "ability_reward" JSONB,
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "name_template" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "UserTitle" ADD COLUMN     "embed_data" JSONB,
ADD COLUMN     "is_equipped" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "TitleMaster_code_key" ON "TitleMaster"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UserTitle_user_id_title_id_embed_data_key" ON "UserTitle"("user_id", "title_id", "embed_data");
