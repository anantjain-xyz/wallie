-- GitHub App Installations
CREATE TABLE IF NOT EXISTS "github_installation" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "installation_id" BIGINT NOT NULL,
    "installation_url" TEXT NOT NULL,
    "app_id" BIGINT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_name" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "repositories" JSONB,
    "access_token" TEXT,
    "token_expires_at" TIMESTAMPTZ,
    "suspended" BOOLEAN NOT NULL DEFAULT FALSE,
    "created" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "new" BOOLEAN NOT NULL DEFAULT FALSE,
    "modified_columns" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "sent_to_server" BOOLEAN NOT NULL DEFAULT FALSE,
    "synced" BOOLEAN GENERATED ALWAYS AS (ARRAY_LENGTH(modified_columns, 1) IS NULL AND NOT deleted AND NOT new) STORED,
    "backup" JSONB,
    CONSTRAINT "github_installation_pkey" PRIMARY KEY ("id")
);

-- GitHub Repositories
CREATE TABLE IF NOT EXISTS "github_repository" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "github_installation_id" UUID NOT NULL,
    "installation_id" BIGINT NOT NULL,
    "repo_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "private" BOOLEAN NOT NULL,
    "html_url" TEXT NOT NULL,
    "description" TEXT,
    "created" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "new" BOOLEAN NOT NULL DEFAULT FALSE,
    "modified_columns" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "sent_to_server" BOOLEAN NOT NULL DEFAULT FALSE,
    "synced" BOOLEAN GENERATED ALWAYS AS (ARRAY_LENGTH(modified_columns, 1) IS NULL AND NOT deleted AND NOT new) STORED,
    "backup" JSONB,
    CONSTRAINT "github_repository_pkey" PRIMARY KEY ("id")
);

-- Update Issue table to link with GitHub repositories
ALTER TABLE "issue"
ADD COLUMN IF NOT EXISTS "github_repository_id" UUID;

-- Add triggers for local state management
CREATE OR REPLACE TRIGGER github_installation_delete_trigger
BEFORE DELETE ON github_installation
FOR EACH ROW
EXECUTE FUNCTION handle_delete();

CREATE OR REPLACE TRIGGER github_installation_insert_trigger
BEFORE INSERT ON github_installation
FOR EACH ROW
EXECUTE FUNCTION handle_insert();

CREATE OR REPLACE TRIGGER github_installation_update_trigger
BEFORE UPDATE ON github_installation
FOR EACH ROW
EXECUTE FUNCTION handle_update();

CREATE OR REPLACE TRIGGER github_repository_delete_trigger
BEFORE DELETE ON github_repository
FOR EACH ROW
EXECUTE FUNCTION handle_delete();

CREATE OR REPLACE TRIGGER github_repository_insert_trigger
BEFORE INSERT ON github_repository
FOR EACH ROW
EXECUTE FUNCTION handle_insert();

CREATE OR REPLACE TRIGGER github_repository_update_trigger
BEFORE UPDATE ON github_repository
FOR EACH ROW
EXECUTE FUNCTION handle_update();

-- Initially disable triggers
ALTER TABLE github_installation DISABLE TRIGGER ALL;
ALTER TABLE github_repository DISABLE TRIGGER ALL;