CREATE TABLE IF NOT EXISTS "github_branch" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "branch_name" TEXT NOT NULL,
  "pull_request_link" TEXT,
  "github_repository_id" TEXT,
  "created" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "modified" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "creator_id" TEXT,
  "synced" BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS "github_branch_branch_name_idx" ON "github_branch" ("branch_name");
CREATE INDEX IF NOT EXISTS "github_branch_github_repository_id_idx" ON "github_branch" ("github_repository_id");
CREATE INDEX IF NOT EXISTS "github_branch_created_idx" ON "github_branch" ("created");
CREATE INDEX IF NOT EXISTS "github_branch_modified_idx" ON "github_branch" ("modified");
CREATE INDEX IF NOT EXISTS "github_branch_creator_id_idx" ON "github_branch" ("creator_id");
CREATE INDEX IF NOT EXISTS "github_branch_synced_idx" ON "github_branch" ("synced");