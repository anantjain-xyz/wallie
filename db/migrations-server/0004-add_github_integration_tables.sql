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
    CONSTRAINT "github_installation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "github_installation_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE,
    CONSTRAINT "github_installation_installation_id_unique" UNIQUE ("installation_id")
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
    CONSTRAINT "github_repository_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "github_repository_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE,
    CONSTRAINT "github_repository_installation_fk" FOREIGN KEY ("github_installation_id") REFERENCES "github_installation"("id") ON DELETE CASCADE,
    CONSTRAINT "github_repository_repo_installation_unique" UNIQUE ("repo_id", "github_installation_id")
);

-- Update Issue table to link with GitHub repositories
ALTER TABLE "issue"
ADD COLUMN IF NOT EXISTS "github_repository_id" UUID,
ADD CONSTRAINT "issue_github_repository_fk" FOREIGN KEY ("github_repository_id") REFERENCES "github_repository"("id") ON DELETE SET NULL;