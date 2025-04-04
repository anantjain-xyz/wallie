CREATE TABLE IF NOT EXISTS "issue_link" (
    "id" UUID NOT NULL,
    "source_issue_id" UUID NOT NULL,
    "target_issue_id" UUID NOT NULL,
    "link_type" TEXT NOT NULL,
    "workspace_id" UUID NOT NULL,
    "modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deleted" BOOLEAN NOT NULL DEFAULT FALSE, -- Soft delete for local deletions
    "new" BOOLEAN NOT NULL DEFAULT FALSE, -- New row flag for local inserts
    "modified_columns" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], -- Columns that have been modified locally
    "sent_to_server" BOOLEAN NOT NULL DEFAULT FALSE, -- Flag to track if the row has been sent to the server
    "synced" BOOLEAN GENERATED ALWAYS AS (ARRAY_LENGTH(modified_columns, 1) IS NULL AND NOT deleted AND NOT new) STORED,
    "backup" JSONB, -- JSONB column to store the backup of the row data for modified columns
    CONSTRAINT "issue_link_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE TRIGGER issue_link_delete_trigger
BEFORE DELETE ON issue_link
FOR EACH ROW
EXECUTE FUNCTION handle_delete();

CREATE OR REPLACE TRIGGER issue_link_insert_trigger
BEFORE INSERT ON issue_link
FOR EACH ROW
EXECUTE FUNCTION handle_insert();

CREATE OR REPLACE TRIGGER issue_link_update_trigger
BEFORE UPDATE ON issue_link
FOR EACH ROW
EXECUTE FUNCTION handle_update();

ALTER TABLE issue_link DISABLE TRIGGER ALL; 