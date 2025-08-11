-- CreateTable
CREATE TABLE "ShrineTravelLog" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "shrine_id" INTEGER NOT NULL,
    "content" VARCHAR(1000) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShrineTravelLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DietyTravelLog" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "diety_id" INTEGER NOT NULL,
    "content" VARCHAR(1000) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DietyTravelLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShrineTravelLog_user_id_shrine_id_key" ON "ShrineTravelLog"("user_id", "shrine_id");

-- CreateIndex
CREATE UNIQUE INDEX "DietyTravelLog_user_id_diety_id_key" ON "DietyTravelLog"("user_id", "diety_id");

-- AddForeignKey
ALTER TABLE "ShrineTravelLog" ADD CONSTRAINT "ShrineTravelLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShrineTravelLog" ADD CONSTRAINT "ShrineTravelLog_shrine_id_fkey" FOREIGN KEY ("shrine_id") REFERENCES "Shrine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietyTravelLog" ADD CONSTRAINT "DietyTravelLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietyTravelLog" ADD CONSTRAINT "DietyTravelLog_diety_id_fkey" FOREIGN KEY ("diety_id") REFERENCES "Diety"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
