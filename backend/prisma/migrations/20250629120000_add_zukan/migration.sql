CREATE TABLE "ShrineBook" (
    "user_id" INTEGER NOT NULL,
    "shrine_id" INTEGER NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShrineBook_pkey" PRIMARY KEY ("user_id","shrine_id")
);

ALTER TABLE "ShrineBook" ADD CONSTRAINT "ShrineBook_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShrineBook" ADD CONSTRAINT "ShrineBook_shrine_id_fkey" FOREIGN KEY ("shrine_id") REFERENCES "Shrine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "DietyBook" (
    "user_id" INTEGER NOT NULL,
    "diety_id" INTEGER NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DietyBook_pkey" PRIMARY KEY ("user_id","diety_id")
);

ALTER TABLE "DietyBook" ADD CONSTRAINT "DietyBook_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DietyBook" ADD CONSTRAINT "DietyBook_diety_id_fkey" FOREIGN KEY ("diety_id") REFERENCES "Diety"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
