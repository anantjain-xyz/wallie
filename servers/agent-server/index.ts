import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import postgres from 'postgres'
import { HealthCheckResponse } from './types'
import agentRoutes from './routes'

const AGENT_SERVER_PORT = process.env.AGENT_SERVER_PORT ?? '3005'
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:password@localhost:54321/wallie'
const E2B_API_KEY = process.env.E2B_API_KEY
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

if (!E2B_API_KEY) {
  console.warn('E2B_API_KEY is not set. Agent functionality will be limited.')
}

const sql = postgres(DATABASE_URL)

const app = new Hono()

app.use('*', cors({
  origin: FRONTEND_URL,
  credentials: true,
}))

app.get('/', async (c) => {
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
      e2b_configured: !!E2B_API_KEY
    }
    
    return c.json(response)
  } catch (error) {
    console.error('Health check error:', error)
    
    const response: HealthCheckResponse = {
      status: 'error',
      message: 'Database connection failed',
      e2b_configured: !!E2B_API_KEY
    }
    
    return c.json(response, 500)
  }
})

app.route('/agent', agentRoutes)

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

const port = parseInt(AGENT_SERVER_PORT, 10)
console.log(`Agent Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
