import { PGliteWithLive } from '@electric-sql/pglite/live'

/**
 * Gets the next available external_id for a workspace
 * @param pg PGlite instance
 * @param workspaceId The workspace ID
 * @returns The next available external_id
 */
export async function getNextExternalId(pg: PGliteWithLive, workspaceId: string): Promise<number> {
  // Find the highest existing external_id for this workspace
  const result = await pg.query<{ max_id: number | null }>(`
    SELECT MAX(external_id) as max_id
    FROM issue
    WHERE workspace_id = $1
    AND external_id IS NOT NULL
  `, [workspaceId])
  
  const maxId = result.rows[0]?.max_id || 0

  return maxId + 1
} 