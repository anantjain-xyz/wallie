import postgres from 'postgres'
import { DatabaseIssue } from './types'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:password@localhost:54321/wallie'

const sql = postgres(DATABASE_URL)

/**
 * Fetches issues that need to be processed by the agent
 * @returns Promise<DatabaseIssue[]> Array of issues to be processed
 */
export async function fetchIssuesToProcess(): Promise<DatabaseIssue[]> {
  try {
    const issues = await sql<DatabaseIssue[]>`
      SELECT 
        id, 
        title, 
        description, 
        status, 
        workspace_id, 
        created_at, 
        updated_at
      FROM issue
      WHERE 
        status = 'open' AND
        agent_processing_status IS NULL
      LIMIT 10
    `
    return issues
  } catch (error) {
    console.error('Error fetching issues to process:', error)
    return []
  }
}

/**
 * Updates an issue's processing status
 * @param issueId The ID of the issue to update
 * @param status The new processing status
 */
export async function updateIssueProcessingStatus(issueId: string, status: string): Promise<void> {
  try {
    await sql`
      UPDATE issue
      SET agent_processing_status = ${status}, updated_at = now()
      WHERE id = ${issueId}
    `
  } catch (error) {
    console.error(`Error updating issue ${issueId} processing status:`, error)
    throw error
  }
}
