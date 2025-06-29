-- CreateTable
CREATE TABLE "RemotePray" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "shrine_id" INTEGER NOT NULL,
    "prayed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RemotePray_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RemotePray_user_id_shrine_id_key" ON "RemotePray"("user_id", "shrine_id");
