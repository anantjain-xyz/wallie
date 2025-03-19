import { type PGliteWithLive } from '@electric-sql/pglite/live'

/**
 * A utility function to handle database transactions with proper cleanup
 * @param pg The PGlite database instance
 * @param operation The operation to perform within the transaction
 * @returns The result of the operation
 */
export async function withTransaction<T>(
  pg: PGliteWithLive, 
  operation: (tx: typeof pg) => Promise<T>
): Promise<T> {
  try {
    await pg.exec('BEGIN')
    try {
      const result = await operation(pg)
      await pg.exec('COMMIT')
      return result
    } catch (error) {
      await pg.exec('ROLLBACK')
      throw error
    }
  } finally {
    // Ensure cleanup of any stuck transaction
    try {
      await pg.exec('ROLLBACK')
    } catch {
      // Ignore cleanup errors
    }
  }
} 