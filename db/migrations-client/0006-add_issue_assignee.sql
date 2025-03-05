-- Add assignee_id column to issue table
ALTER TABLE "issue" ADD COLUMN IF NOT EXISTS "assignee_id" UUID;