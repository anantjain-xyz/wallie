-- Add cycle table
CREATE TABLE IF NOT EXISTS "cycle" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'active',
    "workspace_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deleted" BOOLEAN NOT NULL DEFAULT FALSE, -- Soft delete for local deletions
    "new" BOOLEAN NOT NULL DEFAULT FALSE, -- New row flag for local inserts
    "modified_columns" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], -- Columns that have been modified locally
    "sent_to_server" BOOLEAN NOT NULL DEFAULT FALSE, -- Flag to track if the row has been sent to the server
    "synced" BOOLEAN GENERATED ALWAYS AS (ARRAY_LENGTH(modified_columns, 1) IS NULL AND NOT deleted AND NOT new) STORED,
    "backup" JSONB, -- JSONB column to store the backup of the row data for modified columns
    CONSTRAINT "cycle_pkey" PRIMARY KEY ("id")
);

-- Add triggers for local state management for cycle
CREATE OR REPLACE TRIGGER cycle_delete_trigger
BEFORE DELETE ON cycle
FOR EACH ROW
EXECUTE FUNCTION handle_delete();

CREATE OR REPLACE TRIGGER cycle_insert_trigger
BEFORE INSERT ON cycle
FOR EACH ROW
EXECUTE FUNCTION handle_insert();

CREATE OR REPLACE TRIGGER cycle_update_trigger
BEFORE UPDATE ON cycle
FOR EACH ROW
EXECUTE FUNCTION handle_update();

-- Initially disable triggers
ALTER TABLE cycle DISABLE TRIGGER ALL;

-- Add cycle_id column to issue table
ALTER TABLE "issue" ADD COLUMN IF NOT EXISTS "cycle_id" UUID;