-- Create cycle configuration table
CREATE TABLE IF NOT EXISTS "cycle_configuration" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMPTZ,
    "end_date" TIMESTAMPTZ,
    "duration_days" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT FALSE,
    "is_default" BOOLEAN NOT NULL DEFAULT FALSE,
    "workspace_id" UUID NOT NULL,
    "created_by" UUID,
    "modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "cycle_configuration_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "cycle_configuration" ADD CONSTRAINT "cycle_configuration_workspace_id_fkey" 
FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;

ALTER TABLE "cycle_configuration" ADD CONSTRAINT "cycle_configuration_created_by_fkey" 
FOREIGN KEY ("created_by") REFERENCES "app_user"("id") ON DELETE SET NULL;

-- Add unique constraint to ensure only one default configuration per workspace
ALTER TABLE "cycle_configuration" ADD CONSTRAINT "cycle_configuration_workspace_default_unique" 
UNIQUE ("workspace_id", "is_default") 
WHERE "is_default" = TRUE;

-- Create cycle_issue table to associate issues with cycles
CREATE TABLE IF NOT EXISTS "cycle_issue" (
    "id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "issue_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "cycle_issue_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cycle_issue_cycle_issue_unique" UNIQUE ("cycle_id", "issue_id")
);

-- Add foreign key constraints for cycle_issue
ALTER TABLE "cycle_issue" ADD CONSTRAINT "cycle_issue_cycle_id_fkey" 
FOREIGN KEY ("cycle_id") REFERENCES "cycle_configuration"("id") ON DELETE CASCADE;

ALTER TABLE "cycle_issue" ADD CONSTRAINT "cycle_issue_issue_id_fkey" 
FOREIGN KEY ("issue_id") REFERENCES "issue"("id") ON DELETE CASCADE;

ALTER TABLE "cycle_issue" ADD CONSTRAINT "cycle_issue_workspace_id_fkey" 
FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;

-- Add triggers for sync
CREATE TRIGGER cycle_configuration_modified_trigger
BEFORE UPDATE ON cycle_configuration
FOR EACH ROW
EXECUTE FUNCTION set_modified_timestamp();

CREATE TRIGGER cycle_issue_modified_trigger
BEFORE UPDATE ON cycle_issue
FOR EACH ROW
EXECUTE FUNCTION set_modified_timestamp();