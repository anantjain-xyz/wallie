-- Add stripe_customer_id to workspace table
ALTER TABLE "workspace" ADD COLUMN IF NOT EXISTS "stripe_customer_id" TEXT;