-- Workspace
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

-- Users
CREATE TABLE IF NOT EXISTS "app_user" (
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
    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

-- Add triggers for local state management
CREATE OR REPLACE TRIGGER app_user_delete_trigger
BEFORE DELETE ON app_user
FOR EACH ROW
EXECUTE FUNCTION handle_delete();

CREATE OR REPLACE TRIGGER app_user_insert_trigger
BEFORE INSERT ON app_user
FOR EACH ROW
EXECUTE FUNCTION handle_insert();

CREATE OR REPLACE TRIGGER app_user_update_trigger
BEFORE UPDATE ON app_user
FOR EACH ROW
EXECUTE FUNCTION handle_update();

-- Initially disable triggers
ALTER TABLE app_user DISABLE TRIGGER ALL;

-- Issues
CREATE TABLE IF NOT EXISTS "issue" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "kanbanorder" TEXT NOT NULL,
    "creator_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT FALSE, -- Soft delete for local deletions
    "new" BOOLEAN NOT NULL DEFAULT FALSE, -- New row flag for local inserts
    "modified_columns" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], -- Columns that have been modified locally
    "sent_to_server" BOOLEAN NOT NULL DEFAULT FALSE, -- Flag to track if the row has been sent to the server
    "synced" BOOLEAN GENERATED ALWAYS AS (ARRAY_LENGTH(modified_columns, 1) IS NULL AND NOT deleted AND NOT new) STORED,
    "backup" JSONB, -- JSONB column to store the backup of the row data for modified columns
    CONSTRAINT "issue_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE TRIGGER issue_delete_trigger
BEFORE DELETE ON issue
FOR EACH ROW
EXECUTE FUNCTION handle_delete();

CREATE OR REPLACE TRIGGER issue_insert_trigger
BEFORE INSERT ON issue
FOR EACH ROW
EXECUTE FUNCTION handle_insert();   

CREATE OR REPLACE TRIGGER issue_update_trigger
BEFORE UPDATE ON issue
FOR EACH ROW
EXECUTE FUNCTION handle_update();

ALTER TABLE issue DISABLE TRIGGER ALL;

-- Comments
CREATE TABLE IF NOT EXISTS "comment" (
    "id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "creator_id" UUID NOT NULL,
    "issue_id" UUID NOT NULL,
    "modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "workspace_id" UUID NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT FALSE, -- Soft delete for local deletions
    "new" BOOLEAN NOT NULL DEFAULT FALSE, -- New row flag for local inserts
    "modified_columns" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], -- Columns that have been modified locally
    "sent_to_server" BOOLEAN NOT NULL DEFAULT FALSE, -- Flag to track if the row has been sent to the server
    "synced" BOOLEAN GENERATED ALWAYS AS (ARRAY_LENGTH(modified_columns, 1) IS NULL AND NOT deleted AND NOT new) STORED,
    "backup" JSONB, -- JSONB column to store the backup of the row data for modified columns
    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE TRIGGER comment_delete_trigger
BEFORE DELETE ON comment
FOR EACH ROW
EXECUTE FUNCTION handle_delete();

CREATE OR REPLACE TRIGGER comment_insert_trigger
BEFORE INSERT ON comment
FOR EACH ROW
EXECUTE FUNCTION handle_insert();

CREATE OR REPLACE TRIGGER comment_update_trigger
BEFORE UPDATE ON comment
FOR EACH ROW
EXECUTE FUNCTION handle_update();

ALTER TABLE comment DISABLE TRIGGER ALL;
