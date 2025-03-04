-- Add default programming language to GitHub repositories
ALTER TABLE "github_repository"
ADD COLUMN IF NOT EXISTS "default_programming_language" TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN "github_repository"."default_programming_language" IS 'The default programming language used in this repository (e.g., TYPESCRIPT, PYTHON, etc.)'; 