import postgres from 'postgres'
import { DatabaseIssue } from './types'
import { processIssue } from './processor'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:password@localhost:54321/wallie'
const POLLING_INTERVAL_SECONDS = parseInt(process.env.POLLING_INTERVAL_SECONDS ?? '30', 10) * 1000
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
        agent_processing_status IS NULL AND
        assignee_id IN (SELECT id FROM app_user WHERE username = 'wallie')
      ORDER BY updated_at ASC
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

/**
 * Gets the latest issue modification timestamp
 * @returns Promise<string | null> The latest timestamp or null if no issues
 */
async function getLastModifiedIssueTimestamp(): Promise<string | null> {
  try {
    const result = await sql`
      SELECT MAX(updated_at) as latest_timestamp FROM issue
    `
    return result[0]?.latest_timestamp ? new Date(result[0].latest_timestamp).toISOString() : null
  } catch (error) {
    console.error('Error getting latest issue timestamp:', error)
    return null
  }
}

/**
 * Checks for new issues and processes them
 */
async function checkForNewIssues(): Promise<void> {
  try {
    console.log('Checking for new issues...')
    const issues = await fetchIssuesToProcess()
    
    if (issues.length > 0) {
      console.log(`Found ${issues.length} issues to process`)
      
      for (const issue of issues) {
        console.log(`Processing issue ${issue.id}: ${issue.title}`)
        
        try {
          await updateIssueProcessingStatus(issue.id, 'started')
          
          await processIssue(issue)
          
          const timestamp = new Date(issue.updated_at).toISOString()
          if (!lastCheckedTimestamp || timestamp > lastCheckedTimestamp) {
            lastCheckedTimestamp = timestamp
          }
        } catch (error) {
          console.error(`Error processing issue ${issue.id}:`, error)
          await updateIssueProcessingStatus(issue.id, 'failed')
        }
      }
    } else {
      console.log('No new issues to process')
    }
    
    const latestTimestamp = await getLastModifiedIssueTimestamp()
    if (latestTimestamp && (!lastCheckedTimestamp || latestTimestamp > lastCheckedTimestamp)) {
      lastCheckedTimestamp = latestTimestamp
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
