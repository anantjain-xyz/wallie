
export interface AgentConfig {
  e2bApiKey: string;
}

export interface DatabaseIssue {
  id: string;
  title: string;
  description: string;
  status: string;
  workspace_id: string;
  created_at: Date;
  updated_at: Date;
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
