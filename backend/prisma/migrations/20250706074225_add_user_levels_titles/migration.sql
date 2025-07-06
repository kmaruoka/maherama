-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ability_points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "exp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AbilityMaster" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "effect_type" TEXT NOT NULL,
    "effect_value" INTEGER NOT NULL,

    CONSTRAINT "AbilityMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAbility" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "ability_id" INTEGER NOT NULL,
    "acquired_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAbility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbilityLog" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "ability_id" INTEGER NOT NULL,
    "points_spent" INTEGER NOT NULL,
    "acquired_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbilityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TitleMaster" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "condition_type" TEXT NOT NULL,
    "condition_value" TEXT,
    "exp_reward" INTEGER NOT NULL,

    CONSTRAINT "TitleMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTitle" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title_id" INTEGER NOT NULL,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTitle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAbility_user_id_ability_id_key" ON "UserAbility"("user_id", "ability_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserTitle_user_id_title_id_key" ON "UserTitle"("user_id", "title_id");

-- AddForeignKey
ALTER TABLE "UserAbility" ADD CONSTRAINT "UserAbility_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAbility" ADD CONSTRAINT "UserAbility_ability_id_fkey" FOREIGN KEY ("ability_id") REFERENCES "AbilityMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbilityLog" ADD CONSTRAINT "AbilityLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbilityLog" ADD CONSTRAINT "AbilityLog_ability_id_fkey" FOREIGN KEY ("ability_id") REFERENCES "AbilityMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTitle" ADD CONSTRAINT "UserTitle_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTitle" ADD CONSTRAINT "UserTitle_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "TitleMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

