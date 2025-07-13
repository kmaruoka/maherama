-- Add columns to Diety
ALTER TABLE "Diety" ADD COLUMN "thumbnailUrl" TEXT;
ALTER TABLE "Diety" ADD COLUMN "thumbnailBy" TEXT;

-- CreateTable DietyImage
CREATE TABLE "DietyImage" (
    "id" SERIAL NOT NULL,
    "diety_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voting_month" TEXT NOT NULL,
    "is_winner" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "DietyImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable DietyImageVote
CREATE TABLE "DietyImageVote" (
    "id" SERIAL NOT NULL,
    "diety_image_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "voted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DietyImageVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DietyImageVote_diety_image_id_user_id_key" ON "DietyImageVote"("diety_image_id", "user_id");

-- AddForeignKey
ALTER TABLE "DietyImage" ADD CONSTRAINT "DietyImage_diety_id_fkey" FOREIGN KEY ("diety_id") REFERENCES "Diety"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DietyImage" ADD CONSTRAINT "DietyImage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DietyImageVote" ADD CONSTRAINT "DietyImageVote_diety_image_id_fkey" FOREIGN KEY ("diety_image_id") REFERENCES "DietyImage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DietyImageVote" ADD CONSTRAINT "DietyImageVote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
