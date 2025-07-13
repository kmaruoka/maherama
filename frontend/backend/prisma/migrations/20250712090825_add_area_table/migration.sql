-- AlterTable
ALTER TABLE "Shrine" ADD COLUMN     "area_id" INTEGER;

-- CreateTable
CREATE TABLE "Area" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentCode" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Area_code_key" ON "Area"("code");

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_parentCode_fkey" FOREIGN KEY ("parentCode") REFERENCES "Area"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shrine" ADD CONSTRAINT "Shrine_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;
