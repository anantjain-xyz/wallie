-- Workspace Secrets Table (Server-Only)
CREATE TABLE IF NOT EXISTS "workspace_secret" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "value_preview" TEXT,
    "created_by" TEXT,
    "created" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "workspace_secret_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workspace_secret_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE,
    CONSTRAINT "workspace_secret_key_workspace_unique" UNIQUE ("key", "workspace_id")
);

-- Create indexes for workspace_secret
CREATE INDEX IF NOT EXISTS "workspace_secret_workspace_id_idx" ON "workspace_secret" ("workspace_id");
CREATE INDEX IF NOT EXISTS "workspace_secret_key_idx" ON "workspace_secret" ("key");