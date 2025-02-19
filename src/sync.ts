import { Mutex } from '@electric-sql/pglite'
import { type PGliteWithLive } from '@electric-sql/pglite/live'
import { type PGliteWithSync } from '@electric-sql/pglite-sync'
import type { IssueChange, CommentChange, WorkspaceChange, ChangeSet, UserChange } from './utils/changes'
import { postInitialSync } from './migrations'
import { useEffect, useState } from 'react'

const WRITE_SERVER_URL = import.meta.env.VITE_WRITE_SERVER_URL
  ? import.meta.env.VITE_WRITE_SERVER_URL
  : `http://localhost:3001`
const ELECTRIC_URL = import.meta.env.VITE_ELECTRIC_URL
  ? new URL(import.meta.env.VITE_ELECTRIC_URL).origin
  : `http://localhost:3000`
const ELECTRIC_SOURCE_ID = import.meta.env.VITE_ELECTRIC_SOURCE_ID
const ELECTRIC_SOURCE_SECRET = import.meta.env.VITE_ELECTRIC_SOURCE_SECRET
const APPLY_CHANGES_URL = `${WRITE_SERVER_URL}/apply-changes`

type SyncStatus = 'initial-sync' | 'done'

type PGliteWithExtensions = PGliteWithLive & PGliteWithSync

export async function startSync(pg: PGliteWithExtensions) {
  await startSyncToDatabase(pg)
  startWritePath(pg)
}

async function startSyncToDatabase(pg: PGliteWithExtensions) {
  // Check if there are any issues already in the database
  const issues = await pg.query(`SELECT 1 FROM issue LIMIT 1`)
  const hasIssuesAtStart = issues.rows.length > 0

  let issueShapeInitialSyncDone = false
  let commentShapeInitialSyncDone = false
  let workspaceShapeInitialSyncDone = false
  let userShapeInitialSyncDone = false
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
      userShapeInitialSyncDone &&
      !postInitialSyncDone
    ) {
      postInitialSyncDone = true
      updateSyncStatus('initial-sync', 'Creating indexes...')
      await postInitialSync(pg)
      postInitialSyncDoneResolver()
    }
  }

  const issueUrl = new URL(`${ELECTRIC_URL}/v1/shape`)
  if (ELECTRIC_SOURCE_SECRET) {
    issueUrl.searchParams.set('source_secret', ELECTRIC_SOURCE_SECRET)
  }

  // Issues Sync
  const issuesSync = await pg.sync.syncShapeToTable({
    shape: {
      url: issueUrl.toString(),
      params: {
        table: 'issue',
        source_id: ELECTRIC_SOURCE_ID,
      },
    },
    table: 'issue',
    primaryKey: ['id'],
    shapeKey: 'issues',
    commitGranularity: 'up-to-date',
    useCopy: true,
    onInitialSync: async () => {
      issueShapeInitialSyncDone = true
      await pg.exec(`ALTER TABLE issue ENABLE TRIGGER ALL`)
      doPostInitialSync()
    },
  })
  issuesSync.subscribe(
    () => {
      if (!hasIssuesAtStart && !postInitialSyncDone) {
        updateSyncStatus('initial-sync', 'Inserting issues...')
      }
    },
    (error) => {
      console.error('issuesSync error', error)
    }
  )

  const commentUrl = new URL(`${ELECTRIC_URL}/v1/shape`)
  if (ELECTRIC_SOURCE_SECRET) {
    commentUrl.searchParams.set('source_secret', ELECTRIC_SOURCE_SECRET)
  }

  // Comments Sync
  const commentsSync = await pg.sync.syncShapeToTable({
    shape: {
      url: commentUrl.toString(),
      params: {
        table: 'comment',
        source_id: ELECTRIC_SOURCE_ID,
      },
    },
    table: 'comment',
    primaryKey: ['id'],
    shapeKey: 'comments',
    commitGranularity: 'up-to-date',
    useCopy: true,
    onInitialSync: async () => {
      commentShapeInitialSyncDone = true
      await pg.exec(`ALTER TABLE comment ENABLE TRIGGER ALL`)
      doPostInitialSync()
    },
  })
  commentsSync.subscribe(
    () => {
      if (!hasIssuesAtStart && !postInitialSyncDone) {
        updateSyncStatus('initial-sync', 'Inserting comments...')
      }
    },
    (error) => {
      console.error('commentsSync error', error)
    }
  )

  const workspaceUrl = new URL(`${ELECTRIC_URL}/v1/shape`)
  if (ELECTRIC_SOURCE_SECRET) {
    workspaceUrl.searchParams.set('source_secret', ELECTRIC_SOURCE_SECRET)
  }

  // Workspaces Sync
  const workspacesSync = await pg.sync.syncShapeToTable({
    shape: {
      url: workspaceUrl.toString(),
      params: {
        table: 'workspace',
        source_id: ELECTRIC_SOURCE_ID,
      },
    },
    table: 'workspace',
    primaryKey: ['id'],
    shapeKey: 'workspaces',
    commitGranularity: 'up-to-date',
    useCopy: true,
    onInitialSync: async () => {
      workspaceShapeInitialSyncDone = true
      await pg.exec(`ALTER TABLE workspace ENABLE TRIGGER ALL`)
      doPostInitialSync()
    },
  })
  workspacesSync.subscribe(
    () => {
      if (!hasIssuesAtStart && !postInitialSyncDone) {
        updateSyncStatus('initial-sync', 'Inserting workspaces...')
      }
    },
    (error) => {
      console.error('workspacesSync error', error)
    }
  )

  const userUrl = new URL(`${ELECTRIC_URL}/v1/shape`)
  if (ELECTRIC_SOURCE_SECRET) {
    userUrl.searchParams.set('source_secret', ELECTRIC_SOURCE_SECRET)
  }

  // Users Sync
  const usersSync = await pg.sync.syncShapeToTable({
    shape: {
      url: userUrl.toString(),
      params: {
        table: 'user',
        source_id: ELECTRIC_SOURCE_ID,
      },
    },
    table: 'user',
    primaryKey: ['id'],
    shapeKey: 'users',
    commitGranularity: 'up-to-date',
    useCopy: true,
    onInitialSync: async () => {
      userShapeInitialSyncDone = true
      await pg.exec(`ALTER TABLE "user" ENABLE TRIGGER ALL`)
      doPostInitialSync()
    },
  })
  usersSync.subscribe(
    () => {
      if (!hasIssuesAtStart && !postInitialSyncDone) {
        updateSyncStatus('initial-sync', 'Inserting users...')
      }
    },
    (error) => {
      console.error('usersSync error', error)
    }
  )

  if (!hasIssuesAtStart) {
    await postInitialSyncDonePromise
    await pg.query(`SELECT 1;`) // Do a query to ensure PGlite is idle
  }
  updateSyncStatus('done')
}

const syncMutex = new Mutex()

async function startWritePath(pg: PGliteWithExtensions) {
  // Use a live query to watch for changes to the local tables that need to be synced
  pg.live.query<{
    issue_count: number
    comment_count: number
    workspace_count: number
    user_count: number
  }>(
    `
      SELECT * FROM
        (SELECT count(id) as issue_count FROM issue WHERE synced = false),
        (SELECT count(id) as comment_count FROM comment WHERE synced = false),
        (SELECT count(id) as workspace_count FROM workspace WHERE synced = false),
        (SELECT count(id) as user_count FROM "user" WHERE synced = false)
    `,
    [],
    async (results) => {
      const { issue_count, comment_count, workspace_count, user_count } = results.rows[0]
      if (issue_count > 0 || comment_count > 0 || workspace_count > 0 || user_count > 0) {
        await syncMutex.acquire()
        try {
          doSyncToServer(pg)
        } finally {
          syncMutex.release()
        }
      }
    }
  )
}

// Call wrapped in mutex to prevent multiple syncs from happening at the same time
async function doSyncToServer(pg: PGliteWithExtensions) {
  let issueChanges: IssueChange[]
  let commentChanges: CommentChange[]
  let workspaceChanges: WorkspaceChange[]
  let userChanges: UserChange[]
  await pg.transaction(async (tx) => {
    const issueRes = await tx.query<IssueChange>(`
      SELECT
        id,
        title,
        description,
        priority,
        status,
        workspace_id,
        modified,
        created,
        kanbanorder,
        username,
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
        username,
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
    const workspaceRes = await tx.query<WorkspaceChange>(`
      SELECT
        id,
        name,
        url,
        modified,
        created,
        modified_columns,
        deleted,
        new
      FROM workspace
      WHERE synced = false AND sent_to_server = false
    `)
    const userRes = await tx.query<UserChange>(`
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
      FROM "user"
      WHERE synced = false AND sent_to_server = false
    `)
    issueChanges = issueRes.rows
    commentChanges = commentRes.rows
    workspaceChanges = workspaceRes.rows
    userChanges = userRes.rows
  })
  const changeSet: ChangeSet = {
    issues: issueChanges!,
    comments: commentChanges!,
    workspaces: workspaceChanges!,
    users: userChanges!,
  }
  const response = await fetch(APPLY_CHANGES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(changeSet),
  })
  if (!response.ok) {
    // In a real app you would want to check which changes have failed and save that
    // information to the database, maybe in a `sync_errors` column on the row effected.
    throw new Error('Failed to apply changes')
  }
  await pg.transaction(async (tx) => {
    // Mark all changes as sent to server, but check that the modified timestamp
    // has not changed in the meantime

    tx.exec('SET LOCAL electric.bypass_triggers = true')

    for (const issue of issueChanges!) {
      await tx.query(
        `
        UPDATE issue
        SET sent_to_server = true
        WHERE id = $1 AND modified = $2
      `,
        [issue.id, issue.modified]
      )
    }

    for (const comment of commentChanges!) {
      await tx.query(
        `
        UPDATE comment
        SET sent_to_server = true
        WHERE id = $1 AND modified = $2
      `,
        [comment.id, comment.modified]
      )
    }

    for (const workspace of workspaceChanges!) {
      await tx.query(
        `
        UPDATE workspace
        SET sent_to_server = true
        WHERE id = $1 AND modified = $2
      `,
        [workspace.id, workspace.modified]
      )
    }

    for (const user of userChanges!) {
      await tx.query(
        `
        UPDATE "user"
        SET sent_to_server = true
        WHERE id = $1 AND modified = $2
      `,
        [user.id, user.modified]
      )
    }
  })
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
