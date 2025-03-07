-- Create github_branch table
CREATE TABLE IF NOT EXISTS github_branch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_name TEXT NOT NULL,
  pull_request_link TEXT,
  github_repository_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  creator_id TEXT,
  synced BOOLEAN DEFAULT FALSE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_github_branch_branch_name ON github_branch(branch_name);
CREATE INDEX IF NOT EXISTS idx_github_branch_github_repository_id ON github_branch(github_repository_id);