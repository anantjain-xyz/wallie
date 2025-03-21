CREATE INDEX IF NOT EXISTS "issue_priority_idx" ON "issue" ("priority");
CREATE INDEX IF NOT EXISTS "issue_status_idx" ON "issue" ("status");
CREATE INDEX IF NOT EXISTS "issue_modified_idx" ON "issue" ("modified");
CREATE INDEX IF NOT EXISTS "issue_created_idx" ON "issue" ("created");
CREATE INDEX IF NOT EXISTS "issue_kanbanorder_idx" ON "issue" ("kanbanorder");
CREATE INDEX IF NOT EXISTS "issue_deleted_idx" ON "issue" ("deleted");
CREATE INDEX IF NOT EXISTS "issue_synced_idx" ON "issue" ("synced");
CREATE INDEX IF NOT EXISTS "comment_issue_id_idxx" ON "comment" ("issue_id");
CREATE INDEX IF NOT EXISTS "comment_created_idx" ON "comment" ("created");
CREATE INDEX IF NOT EXISTS "comment_deleted_idx" ON "comment" ("deleted");
CREATE INDEX IF NOT EXISTS "comment_synced_idx" ON "comment" ("synced");

-- Indexes for agent_run table
CREATE INDEX IF NOT EXISTS "agent_run_issue_id_idx" ON "agent_run" ("issue_id");
CREATE INDEX IF NOT EXISTS "agent_run_workspace_id_idx" ON "agent_run" ("workspace_id");
CREATE INDEX IF NOT EXISTS "agent_run_app_user_id_idx" ON "agent_run" ("app_user_id");
CREATE INDEX IF NOT EXISTS "agent_run_deleted_idx" ON "agent_run" ("deleted");
CREATE INDEX IF NOT EXISTS "agent_run_synced_idx" ON "agent_run" ("synced");

-- Indexes for agent_run_message table
CREATE INDEX IF NOT EXISTS "agent_run_message_agent_run_id_idx" ON "agent_run_message" ("agent_run_id");
CREATE INDEX IF NOT EXISTS "agent_run_message_workspace_id_idx" ON "agent_run_message" ("workspace_id");
CREATE INDEX IF NOT EXISTS "agent_run_message_deleted_idx" ON "agent_run_message" ("deleted");
CREATE INDEX IF NOT EXISTS "agent_run_message_synced_idx" ON "agent_run_message" ("synced");