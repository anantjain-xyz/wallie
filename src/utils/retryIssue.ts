/**
 * Utility functions for retrying issues
 */

import { Issue } from '../types/types';
import { showInfo, showError } from './notification';

/**
 * Retries an issue by creating a new issue with the same details
 * 
 * @param pg PGlite instance
 * @param issue The issue to retry
 * @param userId The ID of the user retrying the issue
 * @param workspaceId The workspace ID
 * @param reason Optional reason for the retry
 * @returns Promise<string> The ID of the new issue
 */
export async function retryIssue(
  pg: any,
  issue: Issue,
  userId: string,
  workspaceId: string,
  reason?: string
): Promise<string> {
  try {
    // Begin a transaction
    await pg.exec('BEGIN');
    
    try {
      // Generate a new ID for the retried issue
      const newIssueId = crypto.randomUUID();
      const date = new Date();
      
      // Create a new issue with the same details
      await pg.sql`
        INSERT INTO issue (
          id,
          title,
          creator_id,
          priority,
          status,
          description,
          modified,
          created,
          kanbanorder,
          workspace_id,
          github_repository_id,
          assignee_id,
          estimate,
          external_id
        )
        VALUES (
          ${newIssueId},
          ${issue.title + ' (Retry)'},
          ${userId},
          ${issue.priority},
          ${issue.status},
          ${issue.description || ''},
          ${date},
          ${date},
          ${issue.kanbanorder},
          ${workspaceId},
          ${issue.github_repository_id || null},
          ${issue.assignee_id || null},
          ${issue.estimate || null},
          ${null}  -- Will get a new external_id automatically
        )
      `;
      
      // Add a comment to the original issue linking to the retry
      await pg.sql`
        INSERT INTO comment (id, issue_id, body, created, modified, creator_id, workspace_id)
        VALUES (
          ${crypto.randomUUID()},
          ${issue.id},
          ${'This issue has been retried. See the new issue for updates.'},
          ${date},
          ${date},
          ${userId},
          ${workspaceId}
        )
      `;
      
      // Add a comment to the new issue referencing the original
      await pg.sql`
        INSERT INTO comment (id, issue_id, body, created, modified, creator_id, workspace_id)
        VALUES (
          ${crypto.randomUUID()},
          ${newIssueId},
          ${`This is a retry of issue #${issue.external_id}. ${reason ? 'Reason: ' + reason : ''}`},
          ${date},
          ${date},
          ${userId},
          ${workspaceId}
        )
      `;
      
      // Commit the transaction
      await pg.exec('COMMIT');
      
      showInfo('Issue has been retried successfully', 'Issue Retried');
      return newIssueId;
    } catch (innerError) {
      // Rollback the transaction if any operation fails
      await pg.exec('ROLLBACK');
      throw innerError;
    }
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Unknown error', 'Failed to retry issue');
    throw error;
  }
}