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

/**
 * Formats an issue's external ID using the workspace name prefix
 * Takes the first three letters of the workspace name, capitalizes them,
 * and combines with the external ID (e.g., "WAL-1" for workspace "Wallie")
 * 
 * @param workspaceName The name of the workspace
 * @param externalId The external ID of the issue
 * @returns The formatted external ID string
 */
export function formatExternalId(workspaceName: string, externalId: number | null): string {
  if (externalId === null) return '';
  
  // Take first 3 letters of workspace name and capitalize them
  const prefix = workspaceName.slice(0, 3).toUpperCase();
  
  return `${prefix}-${externalId}`;
} 