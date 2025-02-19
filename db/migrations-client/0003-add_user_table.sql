CREATE TABLE IF NOT EXISTS "user" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "full_name" TEXT,
    "profile_picture" TEXT,
    "workspace_id" UUID NOT NULL,
    "modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deleted" BOOLEAN NOT NULL DEFAULT FALSE, -- Soft delete for local deletions
    "new" BOOLEAN NOT NULL DEFAULT FALSE, -- New row flag for local inserts
    "modified_columns" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], -- Columns that have been modified locally
    "sent_to_server" BOOLEAN NOT NULL DEFAULT FALSE, -- Flag to track if the row has been sent to the server
    "synced" BOOLEAN GENERATED ALWAYS AS (ARRAY_LENGTH(modified_columns, 1) IS NULL AND NOT deleted AND NOT new) STORED,
    "backup" JSONB, -- JSONB column to store the backup of the row data for modified columns
    CONSTRAINT "user_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_email_key" UNIQUE ("email"),
    CONSTRAINT "user_username_key" UNIQUE ("username"),
    FOREIGN KEY (workspace_id) REFERENCES workspace(id) ON DELETE CASCADE
);

-- Add triggers for local state management
CREATE OR REPLACE TRIGGER user_delete_trigger
BEFORE DELETE ON "user"
FOR EACH ROW
EXECUTE FUNCTION handle_delete();

CREATE OR REPLACE TRIGGER user_insert_trigger
BEFORE INSERT ON "user"
FOR EACH ROW
EXECUTE FUNCTION handle_insert();

CREATE OR REPLACE TRIGGER user_update_trigger
BEFORE UPDATE ON "user"
FOR EACH ROW
EXECUTE FUNCTION handle_update();

-- Initially disable triggers
ALTER TABLE "user" DISABLE TRIGGER ALL; 