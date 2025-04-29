import { Sandbox } from '@e2b/code-interpreter'
import { DatabaseIssue, ProcessIssueResult } from './types'
import { updateIssueProcessingStatus } from './monitor'

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
    await updateIssueProcessingStatus(issue.id, 'processing')

    const sandbox = await Sandbox.create({
      apiKey: E2B_API_KEY
    })

    console.log(`Processing issue ${issue.id}: ${issue.title}`)

    // 2. Use Claude Code to analyze and process the issue

    await sandbox.runCode('print("Processing issue")')


    await updateIssueProcessingStatus(issue.id, 'processed')

    return {
      success: true,
      message: 'Issue processed successfully',
      issueId: issue.id
    }
  } catch (error) {
    console.error(`Error processing issue ${issue.id}:`, error)
    
    await updateIssueProcessingStatus(issue.id, 'failed')
    
    return {
      success: false,
      message: `Error processing issue: ${error instanceof Error ? error.message : String(error)}`,
      issueId: issue.id
    }
  }
}
