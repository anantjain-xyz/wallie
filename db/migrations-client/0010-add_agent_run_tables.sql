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
    "deleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "new" BOOLEAN NOT NULL DEFAULT FALSE,
    "modified_columns" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "sent_to_server" BOOLEAN NOT NULL DEFAULT FALSE,
    "synced" BOOLEAN GENERATED ALWAYS AS (ARRAY_LENGTH(modified_columns, 1) IS NULL AND NOT deleted AND NOT new) STORED,
    "backup" JSONB,
    CONSTRAINT "agent_run_pkey" PRIMARY KEY ("id")
);

-- Add triggers for local state management for agent_run
CREATE OR REPLACE TRIGGER agent_run_delete_trigger
BEFORE DELETE ON agent_run
FOR EACH ROW
EXECUTE FUNCTION handle_delete();

CREATE OR REPLACE TRIGGER agent_run_insert_trigger
BEFORE INSERT ON agent_run
FOR EACH ROW
EXECUTE FUNCTION handle_insert();

CREATE OR REPLACE TRIGGER agent_run_update_trigger
BEFORE UPDATE ON agent_run
FOR EACH ROW
EXECUTE FUNCTION handle_update();


-- Agent Run Messages
CREATE TABLE IF NOT EXISTS "agent_run_message" (
    "id" UUID NOT NULL,
    "agent_run_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL, 
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "new" BOOLEAN NOT NULL DEFAULT FALSE,
    "modified_columns" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "sent_to_server" BOOLEAN NOT NULL DEFAULT FALSE,
    "synced" BOOLEAN GENERATED ALWAYS AS (ARRAY_LENGTH(modified_columns, 1) IS NULL AND NOT deleted AND NOT new) STORED,
    "backup" JSONB,
    CONSTRAINT "agent_run_message_pkey" PRIMARY KEY ("id")
);

-- Add triggers for local state management for agent_run_message
CREATE OR REPLACE TRIGGER agent_run_message_delete_trigger
BEFORE DELETE ON agent_run_message
FOR EACH ROW
EXECUTE FUNCTION handle_delete();

CREATE OR REPLACE TRIGGER agent_run_message_insert_trigger
BEFORE INSERT ON agent_run_message
FOR EACH ROW
EXECUTE FUNCTION handle_insert();

CREATE OR REPLACE TRIGGER agent_run_message_update_trigger
BEFORE UPDATE ON agent_run_message
FOR EACH ROW
EXECUTE FUNCTION handle_update();

-- Initially disable triggers
ALTER TABLE agent_run DISABLE TRIGGER ALL;
ALTER TABLE agent_run_message DISABLE TRIGGER ALL; 