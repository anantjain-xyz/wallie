-- Add tier and billing cycle information to workspace table
ALTER TABLE "workspace" ADD COLUMN IF NOT EXISTS "tier" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "workspace" ADD COLUMN IF NOT EXISTS "current_billing_cycle_start_date" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "workspace" ADD COLUMN IF NOT EXISTS "successful_agent_runs_this_cycle" INTEGER NOT NULL DEFAULT 0;

-- Add index for faster tier lookups
CREATE INDEX IF NOT EXISTS "workspace_tier_idx" ON "workspace" ("tier");
