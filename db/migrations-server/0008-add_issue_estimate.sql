-- Add estimate column to issue table
ALTER TABLE "issue" ADD COLUMN IF NOT EXISTS "estimate" INTEGER;