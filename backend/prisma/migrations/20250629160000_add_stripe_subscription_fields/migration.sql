-- AlterTable
ALTER TABLE "UserSubscription" ADD COLUMN "stripe_subscription_id" TEXT,
ADD COLUMN "billing_cycle_start" TIMESTAMP(3),
ADD COLUMN "billing_cycle_end" TIMESTAMP(3),
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true; 