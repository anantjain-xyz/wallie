import { rateLimiter } from 'hono-rate-limiter'
import type { Context } from 'hono'

// Default rate limit configuration
const DEFAULT_WINDOW_MS = 60 * 1000 // 1 minute
const DEFAULT_MAX_REQUESTS = 100 // 100 requests per minute
const DEFAULT_MESSAGE = 'Too many requests, please try again later'

export const createRateLimiter = (options?: {
  windowMs?: number
  limit?: number
  message?: string
  keyGenerator?: (c: Context) => string
}) => {
  return rateLimiter({
    windowMs: options?.windowMs ?? DEFAULT_WINDOW_MS,
    limit: options?.limit ?? DEFAULT_MAX_REQUESTS,
    message: options?.message ?? DEFAULT_MESSAGE,
    keyGenerator: options?.keyGenerator ?? ((c: Context) => {
      // Default key generator uses IP address and path
      const ip = c.req.header('x-forwarded-for') || 
                 c.req.header('x-real-ip') || 
                 'unknown'
      return `${ip}:${c.req.path}`
    }),
    // The default store will be used automatically
  })
}

// Pre-configured rate limiters for different server types
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 120 // 120 requests per minute for API server
})

export const writeRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 60 // 60 requests per minute for write server
})

export const proxyRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 200 // 200 requests per minute for proxy server
})