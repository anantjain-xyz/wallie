import type { PGlite, PGliteInterface } from '@electric-sql/pglite'
import postInitialSyncIndexes from '../db/migrations-client/post-initial-sync-indexes.sql?raw'
import postInitialSyncFtsIndex from '../db/migrations-client/post-initial-sync-fts-index.sql?raw'

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
  const commands = postInitialSyncIndexes
    .split('\n')
    .map((c) => c.trim())
    .filter((c) => c.length > 0)
  for (const command of commands) {
    // wait 100ms between commands
    console.time(`command: ${command}`)
    await pg.exec(command)
    console.timeEnd(`command: ${command}`)
  }
}

export async function createFTSIndex(pg: PGliteInterface) {
  await pg.exec(postInitialSyncFtsIndex)
}

