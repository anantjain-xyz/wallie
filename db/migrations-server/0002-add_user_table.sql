CREATE TABLE IF NOT EXISTS "user" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "full_name" TEXT,
    "profile_picture" TEXT,
    "workspace_id" UUID NOT NULL,
    "modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "user_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_email_key" UNIQUE ("email"),
    CONSTRAINT "user_username_key" UNIQUE ("username"),
    FOREIGN KEY (workspace_id) REFERENCES workspace(id) ON DELETE CASCADE
);

-- Add some initial test data
INSERT INTO "user" ("id", "email", "username", "full_name", "workspace_id")
VALUES (
    '98765432-4321-8765-4321-987654321012',
    'test@example.com',
    'testuser',
    'Test User',
    '75474ef0-8f28-4c25-8586-392340a01665'
); 