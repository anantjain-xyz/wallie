CREATE TABLE IF NOT EXISTS "issue_link" (
    "id" UUID NOT NULL,
    "source_issue_id" UUID NOT NULL,
    "target_issue_id" UUID NOT NULL,
    "link_type" TEXT NOT NULL,
    "workspace_id" UUID NOT NULL,
    "modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "issue_link_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "issue_link" ADD CONSTRAINT "issue_link_source_issue_id_fkey" 
FOREIGN KEY ("source_issue_id") REFERENCES "issue"("id") ON DELETE CASCADE;

ALTER TABLE "issue_link" ADD CONSTRAINT "issue_link_target_issue_id_fkey" 
FOREIGN KEY ("target_issue_id") REFERENCES "issue"("id") ON DELETE CASCADE;

ALTER TABLE "issue_link" ADD CONSTRAINT "issue_link_workspace_id_fkey" 
FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE; 