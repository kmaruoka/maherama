-- CreateTable
CREATE TABLE "Shrine" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shrine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Diety" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "kana" TEXT,
    "description" TEXT,

    CONSTRAINT "Diety_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShrineDiety" (
    "shrine_id" INTEGER NOT NULL,
    "diety_id" INTEGER NOT NULL,

    CONSTRAINT "ShrineDiety_pkey" PRIMARY KEY ("shrine_id","diety_id")
);

-- CreateTable
CREATE TABLE "Log" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'normal',
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ShrineDiety" ADD CONSTRAINT "ShrineDiety_shrine_id_fkey" FOREIGN KEY ("shrine_id") REFERENCES "Shrine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShrineDiety" ADD CONSTRAINT "ShrineDiety_diety_id_fkey" FOREIGN KEY ("diety_id") REFERENCES "Diety"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
