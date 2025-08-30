import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { authMiddleware } from '../auth'
import { apiRateLimiter } from '../middleware/rate-limit'
import githubAuthApp from './github-auth'
import githubWebhookApp from './github-webhook'
import secretsApp from './secrets'
import { EncryptionService } from './encryption'
import subscriptionApp from './subscription'
import { stripeWebhookApp } from './stripe-webhook'
import workspacesApp from './workspaces'

// Check that encryption key is set
try {
  // This will throw an error if the key is not set
  EncryptionService.encrypt('test');
  console.log('Encryption service initialized successfully');
} catch (error) {
  console.error('Error initializing encryption service:', error);
  // Don't exit the process, let it continue but with encryption service disabled
  console.warn('Encryption service is not available. Secrets API will not function correctly!');
}

const app = new Hono()

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Enable CORS with credentials and specific origin
app.use('*', cors({
  origin: FRONTEND_URL,
  credentials: true,
}))

app.use('/*', (c, next) => {
  // Skip rate limiting for webhook routes
  if (c.req.path.startsWith('/webhook')) {
    return next();
  }
  return apiRateLimiter(c, next);
})

// Add auth middleware for non-webhook routes
app.use('/*', async (c, next) => {
  // Skip auth for webhook routes since we handle it via webhook signing secrets
  if (c.req.path.startsWith('/webhook')) {
    await next();
    return;
  }
  
  // Apply auth middleware for other routes
  return authMiddleware(c, next);
});

// API routes
app.route('/webhook/github', githubWebhookApp);
app.route('/webhook/stripe', stripeWebhookApp);
app.route('/secrets', secretsApp);
app.route('/subscription', subscriptionApp);
app.route('/workspaces', workspacesApp);
app.route('/', githubAuthApp);

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
const port = parseInt(process.env.API_SERVER_PORT || '3003', 10)
console.log(`API Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})