-- Add workspace table with local state tracking
CREATE TABLE IF NOT EXISTS "workspace" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deleted" BOOLEAN NOT NULL DEFAULT FALSE, -- Soft delete for local deletions
    "new" BOOLEAN NOT NULL DEFAULT FALSE, -- New row flag for local inserts
    "modified_columns" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], -- Columns that have been modified locally
    "sent_to_server" BOOLEAN NOT NULL DEFAULT FALSE, -- Flag to track if the row has been sent to the server
    "synced" BOOLEAN GENERATED ALWAYS AS (ARRAY_LENGTH(modified_columns, 1) IS NULL AND NOT deleted AND NOT new) STORED,
    "backup" JSONB, -- JSONB column to store the backup of the row data for modified columns
    CONSTRAINT "workspace_pkey" PRIMARY KEY ("id")
);

-- Add triggers for local state management
CREATE OR REPLACE TRIGGER workspace_delete_trigger
BEFORE DELETE ON workspace
FOR EACH ROW
EXECUTE FUNCTION handle_delete();

CREATE OR REPLACE TRIGGER workspace_insert_trigger
BEFORE INSERT ON workspace
FOR EACH ROW
EXECUTE FUNCTION handle_insert();

CREATE OR REPLACE TRIGGER workspace_update_trigger
BEFORE UPDATE ON workspace
FOR EACH ROW
EXECUTE FUNCTION handle_update();

-- Initially disable triggers
ALTER TABLE workspace DISABLE TRIGGER ALL; 