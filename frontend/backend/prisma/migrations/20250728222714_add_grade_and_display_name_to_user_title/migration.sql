-- AlterTable
ALTER TABLE "UserTitle" ADD COLUMN     "display_name" TEXT,
ADD COLUMN     "grade" INTEGER NOT NULL DEFAULT 1;
