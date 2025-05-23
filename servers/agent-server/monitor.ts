import postgres from 'postgres'
import { DatabaseIssue } from './types'
import { processIssue } from './processor'
import { addComment } from './issue'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:password@localhost:54321/wallie'
const POLLING_INTERVAL_SECONDS = parseInt(process.env.POLLING_INTERVAL_SECONDS ?? '5', 10) * 1000
const ERROR_RETRY_SECONDS = parseInt(process.env.ERROR_RETRY_SECONDS ?? '60', 10) * 1000

const sql = postgres(DATABASE_URL)

let lastCheckedTimestamp: string | null = null

/**
 * Returns the last checked timestamp
 * @returns string | null The last checked timestamp or null if not set
 */
export function getLastCheckedTimestamp(): string | null {
  return lastCheckedTimestamp
}

/**
 * Gets the latest issue modification timestamp
 * @returns Promise<string | null> The latest timestamp or null if no issues
 */
async function getLastModifiedIssueTimestamp(): Promise<string | null> {
  try {
    const result = await sql`
      SELECT MAX(modified) as latest_timestamp FROM issue
    `
    return result[0]?.latest_timestamp ? new Date(result[0].latest_timestamp).toISOString() : null
  } catch (error) {
    console.error('Error getting latest issue timestamp:', error)
    return null
  }
}

/**
 * Checks if the last comment is from wallie user
 * @param issueId ID of the issue to check
 * @returns Promise<boolean> True if last comment is from wallie
 */
async function isLastCommentFromWallie(issueId: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT u.username
      FROM comment c
      JOIN app_user u ON c.creator_id = u.id
      WHERE c.issue_id = ${issueId}
      ORDER BY c.created DESC
      LIMIT 1
    `
    return result[0]?.username === 'wallie'
  } catch (error) {
    console.error(`Error checking if last comment is from wallie for issue ${issueId}:`, error)
    return false
  }
}

/**
 * Checks if the last comment contains a retry request
 * @param issueId ID of the issue to check
 * @returns Promise<boolean> True if last comment contains retry keywords
 */
async function isLastCommentRetryRequest(issueId: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT c.body
      FROM comment c
      WHERE c.issue_id = ${issueId}
      ORDER BY c.created DESC
      LIMIT 1
    `
    
    if (result[0]?.body) {
      const retryKeywords = ['retry', 'try again', 'reprocess', 'redo', 're-do', 're-process']
      return retryKeywords.some(keyword => 
        result[0].body.toLowerCase().includes(keyword)
      )
    }
    return false
  } catch (error) {
    console.error(`Error checking if last comment is retry request for issue ${issueId}:`, error)
    return false
  }
}

/**
 * Check if issue has comments
 * @param issueId ID of the issue to check
 * @returns Promise<boolean> True if issue has any comments
 */
async function hasComments(issueId: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT COUNT(*) as count
      FROM comment
      WHERE issue_id = ${issueId}
    `
    return result[0]?.count > 0
  } catch (error) {
    console.error(`Error checking if issue ${issueId} has comments:`, error)
    return false
  }
}

/**
 * Checks if user is wallie
 * @param userId ID of the user to check
 * @returns Promise<boolean> True if user is wallie
 */
async function isWallieUser(userId: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT COUNT(*) as count
      FROM app_user
      WHERE id = ${userId} AND username = 'wallie'
    `
    return result[0]?.count > 0
  } catch (error) {
    console.error(`Error checking if user ${userId} is wallie:`, error)
    return false
  }
}

/**
 * Fetches issues that were modified since the last check
 * @returns Promise<DatabaseIssue[]> Array of modified issues
 */
async function getNewIssues(timestamp: string | null): Promise<DatabaseIssue[]> {
  try {
    let issues: DatabaseIssue[];

    if (!timestamp) return []
    
    return await sql<DatabaseIssue[]>`
      SELECT 
        i.id, 
        i.title, 
        i.description, 
        i.status, 
        i.workspace_id, 
        i.created, 
        i.modified,
        i.github_repository_id,
        i.assignee_id,
        i.estimate,
        i.external_id
      FROM issue i
      WHERE i.modified > ${new Date(timestamp)}
      ORDER BY i.modified ASC
    `;
    
  } catch (error) {
    console.error('Error fetching new issues:', error);
    return [];
  }
}

/**
 * Updates an issue's status
 * @param issueId The ID of the issue to update
 * @param status The new status
 */
export async function updateIssueStatus(issueId: string, status: string): Promise<void> {
  try {
    await sql`
      UPDATE issue
      SET status = ${status}, modified = now()
      WHERE id = ${issueId}
    `
  } catch (error) {
    console.error(`Error updating issue ${issueId} status:`, error)
    throw error
  }
}

/**
 * Checks for new issues and processes them
 */
async function checkForNewIssues(): Promise<void> {
  try {
    console.log('Checking for new issues...')
    const issues = await getNewIssues(lastCheckedTimestamp)
    
    console.log(`Found ${issues.length} modified issues`)
    
    for (const issue of issues) {
      // Check if issue is in 'done' status
      if (issue.status === 'done') {
        console.log(`Issue ${issue.id} is in 'done' status, skipping`)
        continue
      }

      // Check if GitHub repository is set
      if (!issue.github_repository_id) {
        console.log(`Issue ${issue.id} has no GitHub repository ID, skipping`)
        continue
      }
      
      // Check if there is an assignee
      if (!issue.assignee_id) {
        console.log(`Issue ${issue.id} has no assignee, skipping`)
        continue
      }
      
      // Verify the assignee is 'wallie'
      const isWallieAssignee = await isWallieUser(issue.assignee_id)
      if (!isWallieAssignee) {
        console.log(`Issue ${issue.id} is not assigned to 'wallie', skipping`)
        continue
      }

      // Check comments
      const issueHasComments = await hasComments(issue.id)
      
      if (issueHasComments) {
        // Check if the last comment is from 'wallie'
        const isLastFromWallie = await isLastCommentFromWallie(issue.id)
        if (isLastFromWallie) {
          // If the last comment is from wallie, check if it's a retry request
          const isRetryRequest = await isLastCommentRetryRequest(issue.id)
          if (!isRetryRequest) {
            console.log(`Issue ${issue.id} last comment is from wallie and not a retry request, skipping`)
            continue
          }
        }
      }
      
      // Update the last checked timestamp for this issue
      const timestamp = new Date(issue.modified).toISOString()
      if (!lastCheckedTimestamp || timestamp > lastCheckedTimestamp) {
        lastCheckedTimestamp = timestamp
      }
      
      // Process the issue
      console.log(`Processing issue ${issue.id}: ${issue.title}`)
      
      try {
        // Update status to in_progress
        await updateIssueStatus(issue.id, 'in_progress')

        // Add a comment to the issue
        await addComment(issue.id, issue.workspace_id, 'Processing issue...')
        
        // Process the issue
        await processIssue({
          ...issue,
          is_project_mode: issue.estimate !== undefined && issue.estimate !== null && issue.estimate >= 5
        })
        
        // Update status to in_review on success
        await updateIssueStatus(issue.id, 'in_review')
        
      } catch (error) {
        console.error(`Error processing issue ${issue.id}:`, error)
        // Leave issue in in_progress status and add error comment
        try {
          await addComment(
            issue.id, 
            issue.workspace_id, 
            `Error processing this issue: ${error}`,
            true
          )
        } catch (commentError) {
          console.error(`Failed to add error comment for issue ${issue.id}:`, commentError)
        }
      }
    }
    
    // If we processed issues, update the lastCheckedTimestamp to the latest modified time
    if (issues.length > 0) {
      const maxModifiedDate = new Date(Math.max(...issues.map(i => new Date(i.modified).getTime())))
      const latestTimestamp = maxModifiedDate.toISOString()
      if (!lastCheckedTimestamp || latestTimestamp > lastCheckedTimestamp) {
        lastCheckedTimestamp = latestTimestamp
      }
    }
  } catch (error) {
    console.error('Error checking for new issues:', error)
  }
}

/**
 * Continuously monitors for new issues
 */
async function monitorIssuesTask(): Promise<void> {
  console.log('Starting issue monitoring task')
  
  try {
    lastCheckedTimestamp = await getLastModifiedIssueTimestamp()
    if (lastCheckedTimestamp) {
      console.log(`Starting issue monitoring from timestamp: ${lastCheckedTimestamp}`)
    }
  } catch (error) {
    console.error('Error initializing issue monitoring:', error)
  }
  
  while (true) {
    try {
      await checkForNewIssues()
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_SECONDS))
    } catch (error) {
      console.error('Error in issue monitoring:', error)
      await new Promise(resolve => setTimeout(resolve, ERROR_RETRY_SECONDS))
    }
  }
}

/**
 * Starts the issue monitoring task
 */
export function startIssueMonitor(): void {
  monitorIssuesTask().catch(error => {
    console.error('Fatal error in issue monitoring task:', error)
  })
}
