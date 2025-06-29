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

ALTER TABLE "Diety" ADD COLUMN "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "Follow" (
    "follower_id" INTEGER NOT NULL,
    "following_id" INTEGER NOT NULL,
    CONSTRAINT "Follow_pkey" PRIMARY KEY ("follower_id","following_id")
);

ALTER TABLE "Follow" ADD CONSTRAINT "Follow_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
