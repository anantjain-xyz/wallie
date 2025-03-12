-- Add external_id column to issue table
ALTER TABLE "issue" ADD COLUMN IF NOT EXISTS "external_id" INTEGER; 

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS "issue_external_id_idx" ON "issue" ("external_id");
CREATE INDEX IF NOT EXISTS "issue_workspace_external_id_idx" ON "issue" ("workspace_id", "external_id");