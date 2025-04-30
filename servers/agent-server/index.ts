import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { HTTPException } from 'hono/http-exception'
import postgres from 'postgres'
import { HealthCheckResponse } from './types'
import { startIssueMonitor, getLastCheckedTimestamp } from './monitor'

const AGENT_SERVER_PORT = process.env.AGENT_SERVER_PORT ?? '3005'
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:password@localhost:54321/wallie'
const E2B_API_KEY = process.env.E2B_API_KEY

if (!E2B_API_KEY) {
  console.warn('E2B_API_KEY is not set. Agent functionality will be limited.')
}

const sql = postgres(DATABASE_URL)

const app = new Hono()

app.get('/health', async (c) => {
  try {
    const result = await sql`
      SELECT 'ok' as status, version() as postgres_version, now() as server_time
    `
    
    const response: HealthCheckResponse = {
      status: 'ok',
      database: {
        status: result[0].status,
        postgres_version: result[0].postgres_version,
        server_time: result[0].server_time
      },
      e2b_configured: !!E2B_API_KEY,
      last_checked_timestamp: getLastCheckedTimestamp() || undefined
    }
    
    return c.json(response)
  } catch (error) {
    console.error('Health check error:', error)
    
    const response: HealthCheckResponse = {
      status: 'error',
      message: 'Database connection failed',
      e2b_configured: !!E2B_API_KEY,
      last_checked_timestamp: getLastCheckedTimestamp() || undefined
    }
    
    return c.json(response, 500)
  }
})

app.onError((err, c) => {
  console.error('Error:', err)
  if (err instanceof HTTPException) {
    return c.json({
      error: err.message
    }, err.status)
  }
  return c.json({
    error: 'Internal Server Error'
  }, 500)
})

startIssueMonitor()

const port = parseInt(AGENT_SERVER_PORT, 10)
console.log(`Agent Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
