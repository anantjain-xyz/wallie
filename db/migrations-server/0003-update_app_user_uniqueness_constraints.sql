-- Update app_user table uniqueness constraints
-- Drop existing constraints that make email and username unique across all workspaces
ALTER TABLE "app_user" DROP CONSTRAINT IF EXISTS "app_user_email_key";
ALTER TABLE "app_user" DROP CONSTRAINT IF EXISTS "app_user_username_key";

-- Add new constraints that make email and username unique only within a workspace
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_workspace_email_key" UNIQUE ("workspace_id", "email");
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_workspace_username_key" UNIQUE ("workspace_id", "username");