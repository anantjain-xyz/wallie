import { Mutex } from '@electric-sql/pglite'
import { type PGliteWithLive } from '@electric-sql/pglite/live'
import { type PGliteWithSync } from '@electric-sql/pglite-sync'
import type {
  IssueChange,
  CommentChange,
  WorkspaceChange,
  ChangeSet,
  AppUserChange,
  GithubInstallationChange,
  GithubRepositoryChange,
  GithubBranchChange,
  AgentRunChange,
  AgentRunMessageChange,
  IssueLinkChange
} from './utils/changes'
import { postInitialSync } from './migrations'
import { useEffect, useState } from 'react'
import { withTransaction } from './utils/transaction'

const WRITE_SERVER_URL = import.meta.env.VITE_WRITE_SERVER_URL
  ? import.meta.env.VITE_WRITE_SERVER_URL
  : `http://localhost:3001`
const PROXY_SERVER_URL = import.meta.env.VITE_PROXY_SERVER_URL
  ? new URL(import.meta.env.VITE_PROXY_SERVER_URL).origin
  : `http://localhost:3002`
const APPLY_CHANGES_URL = `${WRITE_SERVER_URL}/apply-changes`

type SyncStatus = 'initial-sync' | 'done'

export type PGliteWithExtensions = PGliteWithLive & PGliteWithSync

// Create a reusable error handler for shape sync operations
const createShapeErrorHandler = (getAuthHeaders: () => Promise<{ Authorization?: string }>) => {
  return async (error: Error) => {
    const authHeaders = await getAuthHeaders()

    // Check if the user is signed in by inspecting the Authorization header
    // If the authorization header is "Bearer null", then the user is not signed in
    const isSignedIn = authHeaders.Authorization !== 'Bearer null'
    
    // Only refresh the token if the user is signed in
    // Otherwise, it will lead to an infinite loop of refreshing the token
    if (error.message.includes('401') && isSignedIn) {
      // If the error is due to an expired token, refresh the token and try again
      // Clerk tokens expire every minute, so should expect to run into this every
      // minute or so.
      return {
        headers: {
          ...authHeaders,
          'Cache-Control': 'no-cache'
        }
      }
    }
  }
}

export async function startSync(pg: PGliteWithExtensions, getAuthHeaders: () => Promise<{ Authorization?: string }>) {
  await startSyncToDatabase(pg, getAuthHeaders)
  startWritePath(pg, getAuthHeaders)
}

async function startSyncToDatabase(pg: PGliteWithExtensions, getAuthHeaders: () => Promise<{ Authorization?: string }>) {
  // Check if there are any issues already in the database
  const issues = await pg.query(`SELECT 1 FROM issue LIMIT 1`)
  const hasIssuesAtStart = issues.rows.length > 0

  let issueShapeInitialSyncDone = false
  let commentShapeInitialSyncDone = false
  let workspaceShapeInitialSyncDone = false
  let appUserShapeInitialSyncDone = false
  let githubInstallationShapeInitialSyncDone = false
  let githubRepositoryShapeInitialSyncDone = false
  let githubBranchShapeInitialSyncDone = false
  let agentRunShapeInitialSyncDone = false
  let agentRunMessageShapeInitialSyncDone = false
  let issueLinkShapeInitialSyncDone = false
  
  let postInitialSyncDone = false

  if (!hasIssuesAtStart && !postInitialSyncDone) {
    updateSyncStatus('initial-sync', 'Downloading shape data...')
  }

  let postInitialSyncDoneResolver: () => void
  const postInitialSyncDonePromise = new Promise<void>((resolve) => {
    postInitialSyncDoneResolver = resolve
  })

  const doPostInitialSync = async () => {
    if (
      !hasIssuesAtStart &&
      issueShapeInitialSyncDone &&
      commentShapeInitialSyncDone &&
      workspaceShapeInitialSyncDone &&
      appUserShapeInitialSyncDone &&
      githubInstallationShapeInitialSyncDone &&
      githubRepositoryShapeInitialSyncDone &&
      githubBranchShapeInitialSyncDone &&
      agentRunShapeInitialSyncDone &&
      agentRunMessageShapeInitialSyncDone &&
      issueLinkShapeInitialSyncDone &&
      !postInitialSyncDone
    ) {
      postInitialSyncDone = true
      updateSyncStatus('initial-sync', 'Creating indexes...')
      await postInitialSync(pg)
      postInitialSyncDoneResolver()
    }
  }

  const workspaceUrl = new URL(`${PROXY_SERVER_URL}/v1/shape`)

  // Workspaces Sync
  await pg.sync.syncShapeToTable({
    shape: {
      url: workspaceUrl.toString(),
      params: {
        table: 'workspace',
      },
      headers: {
        ...await getAuthHeaders(),
        'Cache-Control': 'no-cache'
      },
      onError: createShapeErrorHandler(getAuthHeaders)
    },
    table: 'workspace',
    primaryKey: ['id'],
    // When shapeKey is null, the shape subscription state is not persisted.
    // This means it doesn't store additional metadata about the sync process 
    // in the database. If we don't set this as null, we run into an issue where
    // the initial sync gets stuck in a "pending" state.
    shapeKey: null,
    useCopy: true,
    onInitialSync: async () => {
      workspaceShapeInitialSyncDone = true
      await pg.exec(`ALTER TABLE workspace ENABLE TRIGGER ALL`)
      doPostInitialSync()
    },
  })

  const userUrl = new URL(`${PROXY_SERVER_URL}/v1/shape`)

  // Users Sync
  await pg.sync.syncShapeToTable({
    shape: {
      url: userUrl.toString(),
      params: {
        table: 'app_user',
      },
      headers: {
        ...await getAuthHeaders(),
        'Cache-Control': 'no-cache'
      },
      onError: createShapeErrorHandler(getAuthHeaders)
    },
    table: 'app_user',
    primaryKey: ['id'],
    shapeKey: null,
    useCopy: true,
    onInitialSync: async () => {
      appUserShapeInitialSyncDone = true
      await pg.exec(`ALTER TABLE app_user ENABLE TRIGGER ALL`)
      doPostInitialSync()
    },
  })

  const issueUrl = new URL(`${PROXY_SERVER_URL}/v1/shape`)
  
  // Issues Sync
  await pg.sync.syncShapeToTable({
    shape: {
      url: issueUrl.toString(),
      params: {
        table: 'issue',
      },
      headers: {
        ...await getAuthHeaders(),
        'Cache-Control': 'no-cache'
      },
      onError: createShapeErrorHandler(getAuthHeaders)
    },
    table: 'issue',
    primaryKey: ['id'],
    shapeKey: 'issues',
    useCopy: true,
    onInitialSync: async () => {
      issueShapeInitialSyncDone = true
      await pg.exec(`ALTER TABLE issue ENABLE TRIGGER ALL`)
      doPostInitialSync()
    },
  })

  const commentUrl = new URL(`${PROXY_SERVER_URL}/v1/shape`)

  // Comments Sync
  await pg.sync.syncShapeToTable({
    shape: {
      url: commentUrl.toString(),
      params: {
        table: 'comment',
      },
      headers: {
        ...await getAuthHeaders(),
        'Cache-Control': 'no-cache'
      },
      onError: createShapeErrorHandler(getAuthHeaders)
    },
    table: 'comment',
    primaryKey: ['id'],
    shapeKey: 'comments',
    useCopy: true,
    onInitialSync: async () => {
      commentShapeInitialSyncDone = true
      await pg.exec(`ALTER TABLE comment ENABLE TRIGGER ALL`)
      doPostInitialSync()
    },
  })

  const githubInstallationUrl = new URL(`${PROXY_SERVER_URL}/v1/shape`)

  // GitHub Installation Sync
  await pg.sync.syncShapeToTable({
    shape: {
      url: githubInstallationUrl.toString(),
      params: {
        table: 'github_installation',
      },
      headers: {
        ...await getAuthHeaders(),
        'Cache-Control': 'no-cache'
      },
      onError: createShapeErrorHandler(getAuthHeaders)
    },
    table: 'github_installation',
    primaryKey: ['id'],
    shapeKey: 'github_installations',
    useCopy: true,
    onInitialSync: async () => {
      githubInstallationShapeInitialSyncDone = true
      await pg.exec(`ALTER TABLE github_installation ENABLE TRIGGER ALL`)
      doPostInitialSync()
    },
  })

  const githubRepositoryUrl = new URL(`${PROXY_SERVER_URL}/v1/shape`)

  // GitHub Repository Sync
  await pg.sync.syncShapeToTable({
    shape: {
      url: githubRepositoryUrl.toString(),
      params: {
        table: 'github_repository',
      },
      headers: {
        ...await getAuthHeaders(),
        'Cache-Control': 'no-cache'
      },
      onError: createShapeErrorHandler(getAuthHeaders)
    },
    table: 'github_repository',
    primaryKey: ['id'],
    shapeKey: 'github_repositories',
    useCopy: true,
    onInitialSync: async () => {
      githubRepositoryShapeInitialSyncDone = true
      await pg.exec(`ALTER TABLE github_repository ENABLE TRIGGER ALL`)
      doPostInitialSync()
    },
  })

  // GitHub Branches Sync
  const githubBranchUrl = new URL(`${PROXY_SERVER_URL}/v1/shape`)
  await pg.sync.syncShapeToTable({
    shape: {
      url: githubBranchUrl.toString(),
      params: {
        table: 'github_branch',
      },
      headers: {
        ...await getAuthHeaders(),
        'Cache-Control': 'no-cache'
      },
      onError: createShapeErrorHandler(getAuthHeaders)
    },
    table: 'github_branch',
    primaryKey: ['id'],
    shapeKey: 'github_branches',
    useCopy: true,
    onInitialSync: async () => {
      githubBranchShapeInitialSyncDone = true
      await pg.exec(`ALTER TABLE github_branch ENABLE TRIGGER ALL`)
      doPostInitialSync()
    },
  })

  // Agent Runs Sync
  const agentRunUrl = new URL(`${PROXY_SERVER_URL}/v1/shape`)
  await pg.sync.syncShapeToTable({
    shape: {
      url: agentRunUrl.toString(),
      params: {
        table: 'agent_run',
      },
      headers: {
        ...await getAuthHeaders(),
        'Cache-Control': 'no-cache'
      },
      onError: createShapeErrorHandler(getAuthHeaders)
    },
    table: 'agent_run',
    primaryKey: ['id'],
    shapeKey: 'agent_runs',
    useCopy: true,
    onInitialSync: async () => {
      agentRunShapeInitialSyncDone = true
      await pg.exec(`ALTER TABLE agent_run ENABLE TRIGGER ALL`)
      doPostInitialSync()
    },
  })

  // Agent Run Messages Sync
  const agentRunMessageUrl = new URL(`${PROXY_SERVER_URL}/v1/shape`)
  await pg.sync.syncShapeToTable({
    shape: {
      url: agentRunMessageUrl.toString(),
      params: {
        table: 'agent_run_message',
      },
      headers: {
        ...await getAuthHeaders(),
        'Cache-Control': 'no-cache'
      },
      onError: createShapeErrorHandler(getAuthHeaders)
    },
    table: 'agent_run_message',
    primaryKey: ['id'],
    shapeKey: 'agent_run_messages',
    useCopy: true,
    onInitialSync: async () => {
      agentRunMessageShapeInitialSyncDone = true
      await pg.exec(`ALTER TABLE agent_run_message ENABLE TRIGGER ALL`)
      doPostInitialSync()
    },
  })

  // Issue Links Sync
  const issueLinkUrl = new URL(`${PROXY_SERVER_URL}/v1/shape`)
  await pg.sync.syncShapeToTable({
    shape: {
      url: issueLinkUrl.toString(),
      params: {
        table: 'issue_link',
      },
      headers: {
        ...await getAuthHeaders(),
        'Cache-Control': 'no-cache'
      },
      onError: createShapeErrorHandler(getAuthHeaders)
    },
    table: 'issue_link',
    primaryKey: ['id'],
    shapeKey: 'issue_links',
    useCopy: true,
    onInitialSync: async () => {
      issueLinkShapeInitialSyncDone = true
      await pg.exec(`ALTER TABLE issue_link ENABLE TRIGGER ALL`)
      doPostInitialSync()
    },
  })

  if (!hasIssuesAtStart) {
    await postInitialSyncDonePromise
    await pg.query(`SELECT 1;`) // Do a query to ensure PGlite is idle
  }
  updateSyncStatus('done')
}

const syncMutex = new Mutex()

async function startWritePath(pg: PGliteWithExtensions, getAuthHeaders: () => Promise<{ Authorization?: string }>) {
  // Enable triggers on all tables here as well
  // since we do not always do the initial sync
  // but the migrations are run each time, which
  // disable the triggers after creation
  await pg.exec(`ALTER TABLE workspace ENABLE TRIGGER ALL`)
  await pg.exec(`ALTER TABLE app_user ENABLE TRIGGER ALL`)
  await pg.exec(`ALTER TABLE issue ENABLE TRIGGER ALL`)
  await pg.exec(`ALTER TABLE comment ENABLE TRIGGER ALL`)
  await pg.exec(`ALTER TABLE github_installation ENABLE TRIGGER ALL`)
  await pg.exec(`ALTER TABLE github_repository ENABLE TRIGGER ALL`)
  await pg.exec(`ALTER TABLE github_branch ENABLE TRIGGER ALL`)
  await pg.exec(`ALTER TABLE agent_run ENABLE TRIGGER ALL`)
  await pg.exec(`ALTER TABLE agent_run_message ENABLE TRIGGER ALL`)
  await pg.exec(`ALTER TABLE issue_link ENABLE TRIGGER ALL`)

  // Use a live query to watch for changes to the local tables that need to be synced
  pg.live.query<{
    issue_count: number
    comment_count: number
    workspace_count: number
    user_count: number
    github_installation_count: number
    github_repository_count: number
    github_branch_count: number
    agent_run_count: number
    agent_run_message_count: number
    issue_link_count: number
  }>(
    `
      SELECT * FROM
        (SELECT count(id) as issue_count FROM issue WHERE synced = false),
        (SELECT count(id) as comment_count FROM comment WHERE synced = false),
        (SELECT count(id) as workspace_count FROM workspace WHERE synced = false),
        (SELECT count(id) as user_count FROM app_user WHERE synced = false),
        (SELECT count(id) as github_installation_count FROM github_installation WHERE synced = false),
        (SELECT count(id) as github_repository_count FROM github_repository WHERE synced = false),
        (SELECT count(id) as github_branch_count FROM github_branch WHERE synced = false),
        (SELECT count(id) as agent_run_count FROM agent_run WHERE synced = false),
        (SELECT count(id) as agent_run_message_count FROM agent_run_message WHERE synced = false),
        (SELECT count(id) as issue_link_count FROM issue_link WHERE synced = false)
    `,
    [],
    async (results) => {
      const {
        issue_count,
        comment_count,
        workspace_count,
        user_count,
        github_installation_count,
        github_repository_count,
        github_branch_count,
        agent_run_count,
        agent_run_message_count,
        issue_link_count
      } = results.rows[0]
      if (
        issue_count > 0 ||
        comment_count > 0 ||
        workspace_count > 0 ||
        user_count > 0 ||
        github_installation_count > 0 ||
        github_repository_count > 0 ||
        github_branch_count > 0 ||
        agent_run_count > 0 ||
        agent_run_message_count > 0 ||
        issue_link_count > 0
      ) {
        await syncMutex.acquire()
        try {
          await doSyncToServer(pg, getAuthHeaders)
        } catch (error) {
          console.error('Failed to sync changes to server:', error)
          // Store sync error in localStorage to display to user
          localStorage.setItem('syncError', JSON.stringify({
            message: error instanceof Error ? error.message : 'Unknown error during sync',
            timestamp: new Date().toISOString()
          }))
        } finally {
          syncMutex.release()
        }
      }
    }
  )
}

// Call wrapped in mutex to prevent multiple syncs from happening at the same time
async function doSyncToServer(pg: PGliteWithLive & PGliteWithSync, getAuthHeaders: () => Promise<{ Authorization?: string }>) {
  try {
    // Get all changes that need to be synced
    const changeSet: ChangeSet = await withTransaction(pg, async (tx) => {
      const workspaceRes = await tx.query<WorkspaceChange>(`
        SELECT
          id,
          name,
          url,
          avatar_url,
          allowlisted_domains,
          modified,
          created,
          modified_columns,
          deleted,
          new
        FROM workspace
        WHERE synced = false AND sent_to_server = false
      `)
      const appUserRes = await tx.query<AppUserChange>(`
        SELECT
          id,
          email,
          username,
          full_name,
          profile_picture,
          workspace_id,
          modified,
          created,
          modified_columns,
          deleted,
          new
        FROM app_user
        WHERE synced = false AND sent_to_server = false
      `)
      const issueRes = await tx.query<IssueChange>(`
        SELECT
          id,
          title,
          description,
          priority,
          status,
          workspace_id,
          github_repository_id,
          assignee_id,
          estimate,
          external_id,
          plan,
          design,
          modified,
          created,
          kanbanorder,
          creator_id,
          modified_columns,
          deleted,
          new
        FROM issue
        WHERE synced = false AND sent_to_server = false
      `)
      const commentRes = await tx.query<CommentChange>(`
        SELECT
          id,
          body,
          creator_id,
          issue_id,
          workspace_id,
          modified,
          created,
          modified_columns,
          deleted,
          new
        FROM comment
        WHERE synced = false AND sent_to_server = false
      `)
      const githubInstallationRes = await tx.query<GithubInstallationChange>(`
        SELECT
          id,
          workspace_id,
          installation_id,
          installation_url,
          app_id,
          target_type,
          target_name,
          permissions,
          access_token,
          token_expires_at,
          suspended,
          modified,
          created,
          modified_columns,
          deleted,
          new
        FROM github_installation
        WHERE synced = false AND sent_to_server = false
      `)
      const githubRepositoryRes = await tx.query<GithubRepositoryChange>(`
        SELECT
          id,
          workspace_id,
          installation_id,
          repo_id,
          name,
          full_name,
          private,
          html_url,
          description,
          default_programming_language,
          modified,
          created,
          modified_columns,
          deleted,
          new
        FROM github_repository
        WHERE synced = false AND sent_to_server = false
      `)
      const githubBranchRes = await tx.query<GithubBranchChange>(`
        SELECT
          id,
          issue_id,
          workspace_id,
          name,
          pull_request_link,
          modified,
          created,
          modified_columns,
          deleted,
          new
        FROM github_branch
        WHERE synced = false AND sent_to_server = false
      `)
      const agentRunRes = await tx.query<AgentRunChange>(`
        SELECT
          id,
          issue_id,
          app_user_id,
          workspace_id,
          start_time,
          end_time,
          model_provider,
          model_name,
          status,
          modified,
          created,
          modified_columns,
          deleted,
          new
        FROM agent_run
        WHERE synced = false AND sent_to_server = false
      `)
      const agentRunMessageRes = await tx.query<AgentRunMessageChange>(`
        SELECT
          id,
          agent_run_id,
          workspace_id,
          message,
          type,
          modified,
          created,
          modified_columns,
          deleted,
          new
        FROM agent_run_message
        WHERE synced = false AND sent_to_server = false
      `)
      const issueLinkRes = await tx.query<IssueLinkChange>(`
        SELECT
          id,
          source_issue_id,
          target_issue_id,
          link_type,
          workspace_id,
          modified,
          created,
          modified_columns,
          deleted,
          new
        FROM issue_link
        WHERE synced = false AND sent_to_server = false
      `)
      return {
        issues: issueRes.rows,
        comments: commentRes.rows,
        workspaces: workspaceRes.rows,
        users: appUserRes.rows,
        githubInstallations: githubInstallationRes.rows,
        githubRepositories: githubRepositoryRes.rows,
        githubBranches: githubBranchRes.rows,
        agentRuns: agentRunRes.rows,
        agentRunMessages: agentRunMessageRes.rows,
        issueLinks: issueLinkRes.rows,
      }
    })

    // Send changes to server
    const authHeaders = await getAuthHeaders()
    const headers = new Headers({
      'Content-Type': 'application/json'
    })
    if (authHeaders.Authorization) {
      headers.set('Authorization', authHeaders.Authorization)
    }
    const response = await fetch(APPLY_CHANGES_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(changeSet),
    })
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to apply changes: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`)
    }

    // Mark changes as sent to server
    await withTransaction(pg, async (tx) => {
      tx.exec('SET LOCAL electric.bypass_triggers = true')

      for (const workspace of changeSet.workspaces) {
        await tx.query(
          `
          UPDATE workspace
          SET sent_to_server = true
          WHERE id = $1 AND modified = $2
        `,
          [
            workspace.id, 
            workspace.modified instanceof Date 
              ? workspace.modified 
              : typeof workspace.modified === 'string'
                ? new Date(workspace.modified)
                : (() => {
                    console.error(`Invalid modified date for workspace ${workspace.id}:`, workspace.modified)
                    return workspace.modified || new Date() // Fallback only if modified is null/undefined
                  })()
          ]
        )
      }

      for (const user of changeSet.users) {
        await tx.query(
          `
          UPDATE app_user
          SET sent_to_server = true
          WHERE id = $1 AND modified = $2
        `,
          [
            user.id, 
            user.modified instanceof Date 
              ? user.modified 
              : typeof user.modified === 'string'
                ? new Date(user.modified)
                : (() => {
                    console.error(`Invalid modified date for user ${user.id}:`, user.modified)
                    return user.modified || new Date() // Fallback only if modified is null/undefined
                  })()
          ]
        )
      }

      for (const issue of changeSet.issues) {
        await tx.query(
          `
          UPDATE issue
          SET sent_to_server = true
          WHERE id = $1 AND modified = $2
        `,
          [
            issue.id, 
            issue.modified instanceof Date 
              ? issue.modified 
              : typeof issue.modified === 'string'
                ? new Date(issue.modified)
                : (() => {
                    console.error(`Invalid modified date for issue ${issue.id}:`, issue.modified)
                    return issue.modified || new Date() // Fallback only if modified is null/undefined
                  })()
          ]
        )
      }

      for (const comment of changeSet.comments) {
        await tx.query(
          `
          UPDATE comment
          SET sent_to_server = true
          WHERE id = $1 AND modified = $2
        `,
          [
            comment.id,
            comment.modified instanceof Date
              ? comment.modified
              : typeof comment.modified === 'string'
                ? new Date(comment.modified)
                : (() => {
                    console.error(`Invalid modified date for comment ${comment.id}:`, comment.modified)
                    return comment.modified || new Date() // Fallback only if modified is null/undefined
                  })()
          ]
        )
      }

      for (const installation of changeSet.githubInstallations) {
        await tx.query(
          `
          UPDATE github_installation
          SET sent_to_server = true
          WHERE id = $1 AND modified = $2
        `,
          [
            installation.id,
            installation.modified instanceof Date
              ? installation.modified
              : typeof installation.modified === 'string'
                ? new Date(installation.modified)
                : (() => {
                    console.error(`Invalid modified date for github installation ${installation.id}:`, installation.modified)
                    return installation.modified || new Date() // Fallback only if modified is null/undefined
                  })()
          ]
        )
      }

      for (const repository of changeSet.githubRepositories) {
        await tx.query(
          `
          UPDATE github_repository
          SET sent_to_server = true
          WHERE id = $1 AND modified = $2
        `,
          [
            repository.id,
            repository.modified instanceof Date
              ? repository.modified
              : typeof repository.modified === 'string'
                ? new Date(repository.modified)
                : (() => {
                    console.error(`Invalid modified date for github repository ${repository.id}:`, repository.modified)
                    return repository.modified || new Date() // Fallback only if modified is null/undefined
                  })()
          ]
        )
      }

      for (const branch of changeSet.githubBranches) {
        await tx.query(
          `
          UPDATE github_branch
          SET sent_to_server = true
          WHERE id = $1 AND modified = $2
        `,
          [
            branch.id,
            branch.modified instanceof Date
              ? branch.modified
              : typeof branch.modified === 'string'
                ? new Date(branch.modified)
                : (() => {
                    console.error(`Invalid modified date for github branch ${branch.id}:`, branch.modified)
                    return branch.modified || new Date() // Fallback only if modified is null/undefined
                  })()
          ]
        )
      }

      for (const agentRun of changeSet.agentRuns) {
        await tx.query(
          `
          UPDATE agent_run
          SET sent_to_server = true
          WHERE id = $1 AND modified = $2
        `,
          [
            agentRun.id,
            agentRun.modified instanceof Date
              ? agentRun.modified
              : typeof agentRun.modified === 'string'
                ? new Date(agentRun.modified)
                : (() => {
                    console.error(`Invalid modified date for agent run ${agentRun.id}:`, agentRun.modified)
                    return agentRun.modified || new Date() // Fallback only if modified is null/undefined
                  })()
          ]
        )
      }

      for (const agentRunMessage of changeSet.agentRunMessages) {
        await tx.query(
          `
          UPDATE agent_run_message
          SET sent_to_server = true
          WHERE id = $1 AND modified = $2
        `,
          [
            agentRunMessage.id,
            agentRunMessage.modified instanceof Date
              ? agentRunMessage.modified
              : typeof agentRunMessage.modified === 'string'
                ? new Date(agentRunMessage.modified)
                : (() => {
                    console.error(`Invalid modified date for agent run message ${agentRunMessage.id}:`, agentRunMessage.modified)
                    return agentRunMessage.modified || new Date() // Fallback only if modified is null/undefined
                  })()
          ]
        )
      }

      for (const issueLink of changeSet.issueLinks) {
        await tx.query(
          `
          UPDATE issue_link
          SET sent_to_server = true
          WHERE id = $1 AND modified = $2
        `,
          [
            issueLink.id,
            issueLink.modified instanceof Date
              ? issueLink.modified
              : typeof issueLink.modified === 'string'
                ? new Date(issueLink.modified)
                : (() => {
                    console.error(`Invalid modified date for issue link ${issueLink.id}:`, issueLink.modified)
                    return issueLink.modified || new Date() // Fallback only if modified is null/undefined
                  })()
          ]
        )
      }
    })
  } catch (error) {
    console.error('Failed to sync changes to server:', error)
    localStorage.setItem('syncError', JSON.stringify({
      message: error instanceof Error ? error.message : 'Unknown error during sync',
      timestamp: new Date().toISOString()
    }))
  }
}

export function updateSyncStatus(newStatus: SyncStatus, message?: string) {
  localStorage.setItem('syncStatus', JSON.stringify([newStatus, message]))
  // Fire a storage event on this tab as this doesn't happen automatically
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: 'syncStatus',
      newValue: JSON.stringify([newStatus, message]),
    })
  )
}

export function useSyncStatus() {
  const currentSyncStatusJson = localStorage.getItem('syncStatus')
  const currentSyncStatus: [SyncStatus, string] = currentSyncStatusJson
    ? JSON.parse(currentSyncStatusJson)
    : ['initial-sync', 'Starting sync...']
  const [syncStatus, setSyncStatus] =
    useState<[SyncStatus, string]>(currentSyncStatus)

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'syncStatus' && e.newValue) {
        const [newStatus, message] = JSON.parse(e.newValue)
        setSyncStatus([newStatus, message])
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  return syncStatus
}

let initialSyncDone = false

export function waitForInitialSyncDone() {
  return new Promise<void>((resolve) => {
    if (initialSyncDone) {
      resolve()
      return
    }
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'syncStatus' && e.newValue) {
        const [newStatus] = JSON.parse(e.newValue)
        if (newStatus === 'done') {
          window.removeEventListener('storage', handleStorageChange)
          initialSyncDone = true
          resolve()
        }
      }
    }

    // Check current status first
    const currentSyncStatusJson = localStorage.getItem('syncStatus')
    const [currentStatus] = currentSyncStatusJson
      ? JSON.parse(currentSyncStatusJson)
      : ['initial-sync']

    if (currentStatus === 'done') {
      initialSyncDone = true
      resolve()
    } else {
      window.addEventListener('storage', handleStorageChange)
    }
  })
}
