-- GitHub Branches
CREATE TABLE IF NOT EXISTS "github_branch" (
    "id" UUID NOT NULL,
    "issue_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "pull_request_link" TEXT,
    "created" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "new" BOOLEAN NOT NULL DEFAULT FALSE,
    "modified_columns" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "sent_to_server" BOOLEAN NOT NULL DEFAULT FALSE,
    "synced" BOOLEAN GENERATED ALWAYS AS (ARRAY_LENGTH(modified_columns, 1) IS NULL AND NOT deleted AND NOT new) STORED,
    "backup" JSONB,
    CONSTRAINT "github_branch_pkey" PRIMARY KEY ("id")
);

-- Add triggers for local state management
CREATE OR REPLACE TRIGGER github_branch_delete_trigger
BEFORE DELETE ON github_branch
FOR EACH ROW
EXECUTE FUNCTION handle_delete();

CREATE OR REPLACE TRIGGER github_branch_insert_trigger
BEFORE INSERT ON github_branch
FOR EACH ROW
EXECUTE FUNCTION handle_insert();

CREATE OR REPLACE TRIGGER github_branch_update_trigger
BEFORE UPDATE ON github_branch
FOR EACH ROW
EXECUTE FUNCTION handle_update();

-- Initially disable triggers
ALTER TABLE github_branch DISABLE TRIGGER ALL; 