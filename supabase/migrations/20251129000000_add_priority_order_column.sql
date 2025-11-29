-- Add a generated column for priority sorting
-- This allows us to sort priorities correctly at the database layer
-- The column is computed automatically based on the priority value

ALTER TABLE "public"."issue" 
ADD COLUMN "priority_order" integer 
GENERATED ALWAYS AS (
  CASE priority
    WHEN 'urgent' THEN 5
    WHEN 'high' THEN 4
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 2
    WHEN 'none' THEN 1
    ELSE 0
  END
) STORED;

-- Add an index on priority_order for faster sorting
CREATE INDEX IF NOT EXISTS "idx_issue_priority_order" 
ON "public"."issue" ("priority_order" DESC);

-- Optional: Add a composite index for common query patterns (status + priority_order)
CREATE INDEX IF NOT EXISTS "idx_issue_status_priority_order" 
ON "public"."issue" ("status", "priority_order" DESC);

