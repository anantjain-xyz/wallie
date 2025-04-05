import { Hono } from 'hono'
import { cors } from 'hono/cors'
import postgres from 'postgres'
import {
  ChangeSet,
  changeSetSchema,
  CommentChange,
  IssueChange,
  WorkspaceChange,
  AppUserChange,
  GithubInstallationChange,
  GithubRepositoryChange,
  GithubBranchChange,
  IssueLinkChange,
} from '../src/utils/changes'
import { serve } from '@hono/node-server'
import { authMiddleware, validateWriteAuth } from './auth'
import { writeRateLimiter } from './middleware/rate-limit'

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres:password@localhost:54321/wallie'

// Create postgres connection
const sql = postgres(DATABASE_URL)

const app = new Hono()

// Middleware
app.use('/*', cors())

// Add rate limiting
app.use('/*', writeRateLimiter)

// Add auth middleware
app.use('/*', authMiddleware)
app.use('/*', async (c, next) => {
  const authResult = await validateWriteAuth(c);
  if (authResult) {
    return authResult;
  }
  await next();
});

// Routes
app.get('/', async (c) => {
  const result = await sql`
    SELECT 'ok' as status, version() as postgres_version, now() as server_time
  `
  return c.json(result[0])
})

app.post('/apply-changes', async (c) => {
  const content = await c.req.json()
  let parsedChanges: ChangeSet
  try {
    parsedChanges = changeSetSchema.parse(content)
    // Any additional validation of the changes can be done here!
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Invalid changes' }, 400)
  }
  try {
    await applyChanges(parsedChanges)
  } catch (error) {
    // In a real app you would want to check which changes have failed and save that
    // and return that information to the client.
    console.error(error)
    return c.json({ error: 'Failed to apply changes' }, 500)
  }
  return c.json({ success: true })
})

// Start the server
const port = process.env.WRITE_SERVER_PORT ?? 3001
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port: parseInt(port as string),
})

async function applyChanges(changes: ChangeSet) {
  const { issues, comments, workspaces, users, githubInstallations, githubRepositories, githubBranches, issueLinks } = changes
  await sql.begin(async (sql) => {
    for (const workspace of workspaces) {
      await applyTableChange('workspace', workspace, sql)
    }
    for (const user of users) {
      await applyTableChange('app_user', user, sql)
    }
    for (const issue of issues) {
      await applyTableChange('issue', issue, sql)
    }
    for (const comment of comments) {
      await applyTableChange('comment', comment, sql)
    }
    for (const githubInstallation of githubInstallations) {
      await applyTableChange('github_installation', githubInstallation, sql)
    }
    for (const githubRepository of githubRepositories) {
      await applyTableChange('github_repository', githubRepository, sql)
    }
    for (const githubBranch of githubBranches) {
      await applyTableChange('github_branch', githubBranch, sql)
    }
    for (const issueLink of issueLinks) {
      await applyTableChange('issue_link', issueLink, sql)
    }
  })
}

async function applyTableChange(
  tableName: 'issue' | 'comment' | 'workspace' | 'app_user' | 'github_installation' | 'github_repository' | 'github_branch' | 'issue_link',
  change: IssueChange | CommentChange | WorkspaceChange | AppUserChange | GithubInstallationChange | GithubRepositoryChange | GithubBranchChange | IssueLinkChange,
  sql: postgres.TransactionSql
): Promise<void> {
  const {
    id,
    modified_columns: modified_columns_raw,
    new: isNew,
    deleted,
  } = change
  const modified_columns = modified_columns_raw as (keyof typeof change)[]

  if (deleted) {
    await sql`
      DELETE FROM ${sql(tableName)} WHERE id = ${id}
    `
  } else if (isNew) {
    await sql`
      INSERT INTO ${sql(tableName)} ${sql(change, 'id', ...modified_columns)}
      ON CONFLICT (id) DO UPDATE
      SET ${sql(change, ...modified_columns.filter(col => col !== 'id'))}
    `
  } else {
    await sql`
      UPDATE ${sql(tableName)} 
      SET ${sql(change, ...modified_columns)}
      WHERE id = ${id}
    `
  }
} 