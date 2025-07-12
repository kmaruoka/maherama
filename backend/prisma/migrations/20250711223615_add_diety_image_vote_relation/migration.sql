-- AlterTable
ALTER TABLE "ShrineImage" ADD COLUMN     "is_current_thumbnail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marker_url" TEXT,
ADD COLUMN     "original_url" TEXT,
ADD COLUMN     "thumbnail_url" TEXT;

-- AlterTable for DietyImage (追加カラム)
ALTER TABLE "DietyImage" ADD COLUMN "thumbnail_url" TEXT;
ALTER TABLE "DietyImage" ADD COLUMN "marker_url" TEXT;
ALTER TABLE "DietyImage" ADD COLUMN "original_url" TEXT;
ALTER TABLE "DietyImage" ADD COLUMN "is_current_thumbnail" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable VotingSettings
CREATE TABLE "VotingSettings" (
    "id" SERIAL NOT NULL,
    "voting_period_days" INTEGER NOT NULL DEFAULT 20,
    "review_period_days" INTEGER NOT NULL DEFAULT 10,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VotingSettings_pkey" PRIMARY KEY ("id")
);
