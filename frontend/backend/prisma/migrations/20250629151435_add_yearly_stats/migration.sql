-- CreateTable
CREATE TABLE "ShrinePrayStatsYearly" (
    "id" SERIAL NOT NULL,
    "rank" INTEGER NOT NULL,
    "shrine_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "ShrinePrayStatsYearly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DietyPrayStatsYearly" (
    "id" SERIAL NOT NULL,
    "rank" INTEGER NOT NULL,
    "diety_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "DietyPrayStatsYearly_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ShrinePrayStatsYearly" ADD CONSTRAINT "ShrinePrayStatsYearly_shrine_id_fkey" FOREIGN KEY ("shrine_id") REFERENCES "Shrine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietyPrayStatsYearly" ADD CONSTRAINT "DietyPrayStatsYearly_diety_id_fkey" FOREIGN KEY ("diety_id") REFERENCES "Diety"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
