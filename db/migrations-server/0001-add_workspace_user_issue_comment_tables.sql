-- Create the tables

-- Add workspace table
CREATE TABLE IF NOT EXISTS "workspace" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "workspace_pkey" PRIMARY KEY ("id")
);

INSERT INTO "workspace" ("id", "name", "url") VALUES ('75474ef0-8f28-4c25-8586-392340a01665', 'Wallie', 'wallie');

CREATE TABLE IF NOT EXISTS "app_user" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "full_name" TEXT,
    "profile_picture" TEXT,
    "workspace_id" UUID NOT NULL,
    "modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "app_user_email_key" UNIQUE ("email"),
    CONSTRAINT "app_user_username_key" UNIQUE ("username"),
    FOREIGN KEY (workspace_id) REFERENCES workspace(id) ON DELETE CASCADE
);

-- Add some initial test data
INSERT INTO "app_user" ("id", "email", "username", "full_name", "workspace_id")
VALUES (
    '98765432-4321-8765-4321-987654321012',
    'test@example.com',
    'testuser',
    'Test User',
    '75474ef0-8f28-4c25-8586-392340a01665'
); 

CREATE TABLE IF NOT EXISTS "issue" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "kanbanorder" TEXT NOT NULL,
    "creator_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    CONSTRAINT "issue_pkey" PRIMARY KEY ("id"),
    FOREIGN KEY (creator_id) REFERENCES app_user(id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id) REFERENCES workspace(id) ON DELETE CASCADE
);

CREATE TABLE  IF NOT EXISTS "comment" (
    "id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "creator_id" UUID NOT NULL,
    "issue_id" UUID NOT NULL,
    "modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "workspace_id" UUID NOT NULL,
    CONSTRAINT "comment_pkey" PRIMARY KEY ("id"),
    FOREIGN KEY (creator_id) REFERENCES app_user(id) ON DELETE CASCADE,
    FOREIGN KEY (issue_id) REFERENCES issue(id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id) REFERENCES workspace(id) ON DELETE CASCADE
);