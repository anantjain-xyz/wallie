-- Agent Runs tracking
CREATE TABLE IF NOT EXISTS "agent_run" (
    "id" UUID NOT NULL,
    "issue_id" UUID NOT NULL,
    "app_user_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "start_time" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "end_time" TIMESTAMPTZ,
    "model_provider" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "status" TEXT,
    "created" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "agent_run_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "agent_run_issue_fk" FOREIGN KEY ("issue_id") REFERENCES "issue"("id") ON DELETE CASCADE,
    CONSTRAINT "agent_run_app_user_fk" FOREIGN KEY ("app_user_id") REFERENCES "app_user"("id") ON DELETE SET NULL,
    CONSTRAINT "agent_run_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE
);

-- Create indexes for agent_run
CREATE INDEX IF NOT EXISTS "agent_run_issue_id_idx" ON "agent_run" ("issue_id");
CREATE INDEX IF NOT EXISTS "agent_run_workspace_id_idx" ON "agent_run" ("workspace_id");
CREATE INDEX IF NOT EXISTS "agent_run_app_user_id_idx" ON "agent_run" ("app_user_id");

-- Agent Run Messages
CREATE TABLE IF NOT EXISTS "agent_run_message" (
    "id" UUID NOT NULL,
    "agent_run_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL, 
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "agent_run_message_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "agent_run_message_agent_run_fk" FOREIGN KEY ("agent_run_id") REFERENCES "agent_run"("id") ON DELETE CASCADE,
    CONSTRAINT "agent_run_message_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE
);

-- Create indexes for agent_run_message
CREATE INDEX IF NOT EXISTS "agent_run_message_agent_run_id_idx" ON "agent_run_message" ("agent_run_id");
CREATE INDEX IF NOT EXISTS "agent_run_message_workspace_id_idx" ON "agent_run_message" ("workspace_id"); 