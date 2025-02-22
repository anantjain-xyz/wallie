import type { PGlite, PGliteInterface } from '@electric-sql/pglite'
import postInitialSyncIndexes from '../db/migrations-client/post-initial-sync-indexes.sql?raw'
import postInitialSyncFtsIndex from '../db/migrations-client/post-initial-sync-fts-index.sql?raw'
import postInitialSyncEnableTriggers from '../db/migrations-client/post-initial-sync-enable-triggers.sql?raw'

// Get all migration files using import.meta.glob
const migrations = import.meta.glob('../db/migrations-client/[0-9]*.sql', {
  as: 'raw',
  eager: true
})

export async function migrate(pg: PGlite) {
  // Sort migration files by name to ensure correct order
  const sortedMigrations = Object.entries(migrations)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([_, content]) => content)

  for (const migration of sortedMigrations) {
    await pg.exec(migration)
  }
}

export async function postInitialSync(pg: PGliteInterface) {
  const createIndexesCommands = postInitialSyncIndexes
    .split('\n')
    .map((c) => c.trim())
    .filter((c) => c.length > 0)

  for (const command of createIndexesCommands) {
    await pg.exec(command)
  }

  // While the sync.ts file enables the triggers, one by one, those are not
  // the second time a user loads the app. However, the migrations are executed
  // and we need to enable the triggers after index creation here.
  const enableTriggersCommands = postInitialSyncEnableTriggers
    .split('\n')
    .map((c) => c.trim())
    .filter((c) => c.length > 0)

  for (const command of enableTriggersCommands) {
    await pg.exec(command)
  }
}

export async function createFTSIndex(pg: PGliteInterface) {
  await pg.exec(postInitialSyncFtsIndex)
}

