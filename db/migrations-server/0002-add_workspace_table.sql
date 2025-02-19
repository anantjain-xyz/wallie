-- Add workspace table
CREATE TABLE IF NOT EXISTS "workspace" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "workspace_pkey" PRIMARY KEY ("id")
); 