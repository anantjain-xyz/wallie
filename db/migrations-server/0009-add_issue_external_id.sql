-- Add external_id column to issue table
ALTER TABLE "issue" ADD COLUMN IF NOT EXISTS "external_id" INTEGER;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS "issue_external_id_idx" ON "issue" ("external_id");
CREATE INDEX IF NOT EXISTS "issue_workspace_external_id_idx" ON "issue" ("workspace_id", "external_id");

-- Add a unique constraint to ensure external_id is unique within each workspace
ALTER TABLE "issue" ADD CONSTRAINT "issue_workspace_id_external_id_unique" 
    UNIQUE ("workspace_id", "external_id");

-- Backfill existing issues with external_ids
DO $$
DECLARE
    workspace record;
    issue record;
    next_id INTEGER;
BEGIN
    -- Process each workspace
    FOR workspace IN SELECT DISTINCT id FROM workspace LOOP
        -- Reset counter for tracking highest ID in this workspace
        next_id := 1;
        
        -- First pass: find the highest existing external_id for this workspace (if any)
        FOR issue IN SELECT id, external_id FROM issue WHERE workspace_id = workspace.id AND external_id IS NOT NULL ORDER BY external_id DESC LIMIT 1 LOOP
            next_id := issue.external_id + 1;
        END LOOP;
        
        -- Second pass: assign external_ids to issues that don't have one
        FOR issue IN SELECT id FROM issue WHERE workspace_id = workspace.id AND external_id IS NULL ORDER BY created LOOP
            EXECUTE 'UPDATE issue SET external_id = ' || next_id || ' WHERE id = ''' || issue.id || '''';
            next_id := next_id + 1;
        END LOOP;
    END LOOP;
END;
$$; 