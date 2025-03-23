import { z } from 'zod'

export const issueChangeSchema = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  priority: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  workspace_id: z.string().nullable().optional(),
  github_repository_id: z.string().nullable().optional(),
  assignee_id: z.string().nullable().optional(),
  estimate: z.number().nullable().optional(),
  external_id: z.number().nullable().optional(),
  plan: z.string().nullable().optional(),
  design: z.string().nullable().optional(),
  modified: z.date().or(z.string().transform(str => new Date(str))).nullable().optional(),
  created: z.date().or(z.string().transform(str => new Date(str))).nullable().optional(),
  kanbanorder: z.string().nullable().optional(),
  creator_id: z.string().nullable().optional(),
  modified_columns: z.array(z.string()).nullable().optional(),
  deleted: z.boolean().nullable().optional(),
  new: z.boolean().nullable().optional(),
})

export type IssueChange = z.infer<typeof issueChangeSchema>

export const commentChangeSchema = z.object({
  id: z.string(),
  body: z.string().nullable().optional(),
  creator_id: z.string().nullable().optional(),
  issue_id: z.string().nullable().optional(),
  workspace_id: z.string().nullable().optional(),
  modified: z.date().or(z.string().transform(str => new Date(str))).nullable().optional(),
  created: z.date().or(z.string().transform(str => new Date(str))).nullable().optional(),
  modified_columns: z.array(z.string()).nullable().optional(),
  deleted: z.boolean().nullable().optional(),
  new: z.boolean().nullable().optional(),
})

export type CommentChange = z.infer<typeof commentChangeSchema>

export const workspaceChangeSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  allowlisted_domains: z.array(z.string()).nullable().optional(),
  modified: z.date().or(z.string().transform(str => new Date(str))).nullable().optional(),
  created: z.date().or(z.string().transform(str => new Date(str))).nullable().optional(),
  modified_columns: z.array(z.string()).nullable().optional(),
  deleted: z.boolean().nullable().optional(),
  new: z.boolean().nullable().optional(),
})

export type WorkspaceChange = z.infer<typeof workspaceChangeSchema>

export const appUserChangeSchema = z.object({
  id: z.string(),
  email: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  full_name: z.string().nullable().optional(),
  profile_picture: z.string().nullable().optional(),
  workspace_id: z.string().nullable().optional(),
  modified: z.date().or(z.string().transform(str => new Date(str))).nullable().optional(),
  created: z.date().or(z.string().transform(str => new Date(str))).nullable().optional(),
  modified_columns: z.array(z.string()).nullable().optional(),
  deleted: z.boolean().nullable().optional(),
  new: z.boolean().nullable().optional(),
})

export type AppUserChange = z.infer<typeof appUserChangeSchema>

export const agentRunChangeSchema = z.object({
  id: z.string(),
  issue_id: z.string().nullable().optional(),
  app_user_id: z.string().nullable().optional(),
  workspace_id: z.string().nullable().optional(),
  start_time: z.date().or(z.string().transform(str => new Date(str))).nullable().optional(),
  end_time: z.date().or(z.string().transform(str => new Date(str))).nullable().optional(),
  model_provider: z.string().nullable().optional(),
  model_name: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  modified: z.date().or(z.string().transform(str => new Date(str))).nullable().optional(),
  created: z.date().or(z.string().transform(str => new Date(str))).nullable().optional(),
  modified_columns: z.array(z.string()).nullable().optional(),
  deleted: z.boolean().nullable().optional(),
  new: z.boolean().nullable().optional(),
})

export type AgentRunChange = z.infer<typeof agentRunChangeSchema>

export const githubInstallationChangeSchema = z.object({
  id: z.string(),
  workspace_id: z.string().nullable().optional(),
  installation_id: z.number().nullable().optional(),
  installation_url: z.string().nullable().optional(),
  app_id: z.number().nullable().optional(),
  target_type: z.string().nullable().optional(),
  target_name: z.string().nullable().optional(),
  permissions: z.any().nullable().optional(),
  access_token: z.string().nullable().optional(),
  token_expires_at: z.date().or(z.string().transform(str => new Date(str))).nullable().optional(),
  suspended: z.boolean().nullable().optional(),
  modified: z.date().or(z.string().transform(str => new Date(str))).nullable().optional(),
  created: z.date().or(z.string().transform(str => new Date(str))).nullable().optional(),
  modified_columns: z.array(z.string()).nullable().optional(),
  deleted: z.boolean().nullable().optional(),
  new: z.boolean().nullable().optional(),
})

export type GithubInstallationChange = z.infer<typeof githubInstallationChangeSchema>

export const githubRepositoryChangeSchema = z.object({
  id: z.string(),
  workspace_id: z.string().nullable().optional(),
  installation_id: z.number().nullable().optional(),
  repo_id: z.number().nullable().optional(),
  name: z.string().nullable().optional(),
  full_name: z.string().nullable().optional(),
  private: z.boolean().nullable().optional(),
  html_url: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  default_programming_language: z.string().nullable().optional(),
  modified: z.date().or(z.string().transform(str => new Date(str))).nullable().optional(),
  created: z.date().or(z.string().transform(str => new Date(str))).nullable().optional(),
  modified_columns: z.array(z.string()).nullable().optional(),
  deleted: z.boolean().nullable().optional(),
  new: z.boolean().nullable().optional(),
})

export type GithubRepositoryChange = z.infer<typeof githubRepositoryChangeSchema>

export const githubBranchChangeSchema = z.object({
  id: z.string(),
  issue_id: z.string().nullable().optional(),
  workspace_id: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  pull_request_link: z.string().nullable().optional(),
  modified: z.date().or(z.string().transform(str => new Date(str))).nullable().optional(),
  created: z.date().or(z.string().transform(str => new Date(str))).nullable().optional(),
  modified_columns: z.array(z.string()).nullable().optional(),
  deleted: z.boolean().nullable().optional(),
  new: z.boolean().nullable().optional(),
})

export type GithubBranchChange = z.infer<typeof githubBranchChangeSchema>

export const agentRunMessageChangeSchema = z.object({
  id: z.string(),
  agent_run_id: z.string().nullable().optional(),
  workspace_id: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  modified: z.date().or(z.string().transform(str => new Date(str))).nullable().optional(),
  created: z.date().or(z.string().transform(str => new Date(str))).nullable().optional(),
  modified_columns: z.array(z.string()).nullable().optional(),
  deleted: z.boolean().nullable().optional(),
  new: z.boolean().nullable().optional(),
})

export type AgentRunMessageChange = z.infer<typeof agentRunMessageChangeSchema>

export const changeSetSchema = z.object({
  issues: z.array(issueChangeSchema),
  comments: z.array(commentChangeSchema),
  workspaces: z.array(workspaceChangeSchema),
  users: z.array(appUserChangeSchema),
  agentRuns: z.array(agentRunChangeSchema),
  githubInstallations: z.array(githubInstallationChangeSchema),
  githubRepositories: z.array(githubRepositoryChangeSchema),
  githubBranches: z.array(githubBranchChangeSchema),
  agentRunMessages: z.array(agentRunMessageChangeSchema),
})

export type ChangeSet = z.infer<typeof changeSetSchema>
