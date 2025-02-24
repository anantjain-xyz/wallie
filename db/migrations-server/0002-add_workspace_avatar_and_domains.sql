ALTER TABLE "workspace"
ADD COLUMN IF NOT EXISTS "avatar_url" TEXT,
ADD COLUMN IF NOT EXISTS "allowlisted_domains" TEXT[];

-- Update the existing workspace with some default values
UPDATE "workspace"
SET 
    "avatar_url" = NULL,
    "allowlisted_domains" = ARRAY['wallie.app']
WHERE "id" = '75474ef0-8f28-4c25-8586-392340a01665'; 