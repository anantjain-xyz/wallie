import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL ?? 'postgresql://postgres:password@localhost:54321/wallie')

/**
 * Adds a comment to an issue
 * @param issueId ID of the issue
 * @param workspaceId ID of the workspace
 * @param message Comment message
 * @param isError Whether this is an error comment (adds error emoji if true)
 */
export async function addComment(issueId: string, workspaceId: string, message: string, isError: boolean = false): Promise<void> {
  try {
    const commentBody = isError ? `⛔ ${message}` : message
    await sql`
      INSERT INTO comment (id, issue_id, workspace_id, body, creator_id)
      VALUES (
        gen_random_uuid(), 
        ${issueId}, 
        ${workspaceId}, 
        ${commentBody}, 
        (SELECT id FROM app_user WHERE username = 'wallie' AND workspace_id = ${workspaceId})
      )
    `
  } catch (error) {
    console.error(`Failed to add comment for issue ${issueId}:`, error)
    throw error
  }
} 