import { Hono } from 'hono'
import { fetchIssuesToProcess } from './monitor'
import { processIssue } from './processor'
import { DatabaseIssue, ProcessIssueResult } from './types'

const routes = new Hono()

routes.get('/issues', async (c) => {
  try {
    const issues = await fetchIssuesToProcess()
    return c.json({ issues })
  } catch (error) {
    console.error('Error fetching issues:', error)
    return c.json({ error: 'Failed to fetch issues' }, 500)
  }
})

routes.post('/process/:issueId', async (c) => {
  const issueId = c.req.param('issueId')
  
  try {
    const issue: DatabaseIssue = {
      id: issueId,
      title: 'Placeholder issue',
      description: 'This is a placeholder issue for testing',
      status: 'open',
      workspace_id: 'workspace-123',
      created_at: new Date(),
      updated_at: new Date()
    }
    
    const result = await processIssue(issue)
    return c.json(result)
  } catch (error) {
    console.error(`Error processing issue ${issueId}:`, error)
    
    const result: ProcessIssueResult = {
      success: false,
      message: `Error processing issue: ${error instanceof Error ? error.message : String(error)}`,
      issueId
    }
    
    return c.json(result, 500)
  }
})


export default routes
