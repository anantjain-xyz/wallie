export interface DatabaseIssue {
  id: string;
  title: string;
  description: string;
  status: string;
  workspace_id: string;
  created: Date;
  modified: Date;
  github_repository_id?: string;
  assignee_id?: string;
  estimate?: number;
  external_id?: string;
  last_comment_body?: string;
  last_comment_author?: string;
  is_project_mode?: boolean;
}

export interface ProcessIssueResult {
  success: boolean;
  message: string;
  issueId: string;
}

export interface HealthCheckResponse {
  status: string;
  database?: {
    status: string;
    postgres_version: string;
    server_time: Date;
  };
  e2b_configured: boolean;
  message?: string;
  last_checked_timestamp?: string;
}
