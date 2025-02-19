import { z } from 'zod'

export const issueChangeSchema = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  priority: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  workspace_id: z.string().nullable().optional(),
  modified: z.string().nullable().optional(),
  created: z.string().nullable().optional(),
  kanbanorder: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  modified_columns: z.array(z.string()).nullable().optional(),
  deleted: z.boolean().nullable().optional(),
  new: z.boolean().nullable().optional(),
})

export type IssueChange = z.infer<typeof issueChangeSchema>

export const commentChangeSchema = z.object({
  id: z.string(),
  body: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  issue_id: z.string().nullable().optional(),
  workspace_id: z.string().nullable().optional(),
  modified: z.string().nullable().optional(),
  created: z.string().nullable().optional(),
  modified_columns: z.array(z.string()).nullable().optional(),
  deleted: z.boolean().nullable().optional(),
  new: z.boolean().nullable().optional(),
})

export type CommentChange = z.infer<typeof commentChangeSchema>

export const workspaceChangeSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  modified: z.string().nullable().optional(),
  created: z.string().nullable().optional(),
  modified_columns: z.array(z.string()).nullable().optional(),
  deleted: z.boolean().nullable().optional(),
  new: z.boolean().nullable().optional(),
})

export type WorkspaceChange = z.infer<typeof workspaceChangeSchema>

export const userChangeSchema = z.object({
  id: z.string(),
  email: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  full_name: z.string().nullable().optional(),
  profile_picture: z.string().nullable().optional(),
  workspace_id: z.string().nullable().optional(),
  modified: z.string().nullable().optional(),
  created: z.string().nullable().optional(),
  modified_columns: z.array(z.string()).nullable().optional(),
  deleted: z.boolean().nullable().optional(),
  new: z.boolean().nullable().optional(),
})

export type UserChange = z.infer<typeof userChangeSchema>

export const changeSetSchema = z.object({
  issues: z.array(issueChangeSchema),
  comments: z.array(commentChangeSchema),
  workspaces: z.array(workspaceChangeSchema),
  users: z.array(userChangeSchema),
})

export type ChangeSet = z.infer<typeof changeSetSchema>
