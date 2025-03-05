-- Add assignee_id column to issue table
ALTER TABLE "issue" ADD COLUMN IF NOT EXISTS "assignee_id" UUID;
ALTER TABLE "issue" ADD CONSTRAINT "issue_assignee_id_fkey" FOREIGN KEY (assignee_id) REFERENCES app_user(id) ON DELETE SET NULL;