import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { authMiddleware, validateProxyAuth } from './auth'

const app = new Hono()

// Enable CORS
app.use('*', cors())

// Add auth middleware
app.use('/*', authMiddleware)
app.use('/*', async (c, next) => {
  const authResult = await validateProxyAuth(c);
  if (authResult) {
    return authResult;
  }
  await next();
});

// Proxy middleware to forward requests
async function proxyMiddleware(c: any) {
  // Construct the upstream URL
  const url = new URL(c.req.raw.url)
  const baseUrl = process.env.ELECTRIC_URL ?? `http://localhost:3000`
  const originUrl = new URL(`/v1/shape`, baseUrl)
  url.searchParams.forEach((value, key) => {
    originUrl.searchParams.set(key, value)
  })
  
  try {
    const response = await fetch(originUrl, {
      method: c.req.raw.method,
      headers: {
        ...Object.fromEntries(c.req.raw.headers),
        'x-forwarded-for': c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
      },
      body: c.req.raw.method !== 'GET' && c.req.raw.method !== 'HEAD' ? await c.req.text() : undefined,
    })

    // Forward the response headers
    const headers = new Headers(response.headers)
    
    // When proxying long-polling requests, content-encoding & content-length headers
    // can cause issues, so we remove them
    headers.delete('content-encoding')
    headers.delete('content-length')
    
    return new Response(response.body, {
      status: response.status,
      headers,
    })
  } catch (error) {
    console.error('Proxy error:', error)
    throw new HTTPException(502, { message: 'Bad Gateway' })
  }
}

// Handle all methods and routes
app.all('*', proxyMiddleware)

// Error handling
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

// Start the server
const port = parseInt(process.env.PROXY_SERVER_PORT || '3002', 10)
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
}) 