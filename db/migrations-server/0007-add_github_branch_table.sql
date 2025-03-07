-- GitHub Branches
CREATE TABLE IF NOT EXISTS "github_branch" (
    "id" UUID NOT NULL,
    "issue_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "pull_request_link" TEXT,
    "created" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "github_branch_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "github_branch_issue_fk" FOREIGN KEY ("issue_id") REFERENCES "issue"("id") ON DELETE CASCADE,
    CONSTRAINT "github_branch_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE
);