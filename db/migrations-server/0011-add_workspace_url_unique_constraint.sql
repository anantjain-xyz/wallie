-- Add unique constraint to workspace url
ALTER TABLE "workspace" 
ADD CONSTRAINT "workspace_url_key" UNIQUE ("url"); 