import { Sandbox } from '@e2b/code-interpreter'
import { DatabaseIssue, ProcessIssueResult } from './types'
import { updateIssueStatus } from './monitor'
import { addComment } from './issue'

const E2B_API_KEY = process.env.E2B_API_KEY

/**
 * Processes an issue using E2B and Claude Code
 * @param issue The issue to process
 * @returns Promise<ProcessIssueResult> The result of processing the issue
 */
export async function processIssue(issue: DatabaseIssue): Promise<ProcessIssueResult> {
  if (!E2B_API_KEY) {
    console.error('E2B_API_KEY is not set. Cannot process issue.')
    return {
      success: false,
      message: 'E2B API key not configured',
      issueId: issue.id
    }
  }

  try {
    // Status is already set to in_progress by the monitor
    
    const sandbox = await Sandbox.create({
      apiKey: E2B_API_KEY
    })

    console.log(`Processing issue ${issue.id}: ${issue.title}`)

    // 2. Use Claude Code to analyze and process the issue

    const result = await sandbox.runCode('print("Hello, world!")')

    // Add result as issue comment
    await addComment(issue.id, issue.workspace_id, result.results[0]?.text ?? 'No result')
    await addComment(issue.id, issue.workspace_id, 'stdout: ' + result.logs.stdout.join('\n'))
    await addComment(issue.id, issue.workspace_id, 'stderr: ' + result.logs.stderr.join('\n'))

    // The monitor will update status to in_review after successful return
    
    return {
      success: true,
      message: 'Issue processed successfully',
      issueId: issue.id
    }
  } catch (error) {
    console.error(`Error processing issue ${issue.id}:`, error)
    
    // We leave the issue in in_progress status on error
    
    return {
      success: false,
      message: `Error processing issue: ${error instanceof Error ? error.message : String(error)}`,
      issueId: issue.id
    }
  }
}
