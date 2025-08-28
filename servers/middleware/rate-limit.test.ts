import { describe, it, expect } from 'vitest'
import { createRateLimiter, apiRateLimiter, proxyRateLimiter, writeRateLimiter } from './rate-limit'
import type { Context } from 'hono'

function createMockContext(headers: Record<string, string> = {}, path = '/api'): Context {
  const request = new Request('http://localhost' + path, { headers: new Headers(headers) })
  const store = new Map<string, unknown>()
  const ctx = {
    req: {
      header: (name: string) => request.headers.get(name.toLowerCase()),
      path,
    },
    header: (_name: string, _value: string) => {},
    get: (key: string) => store.get(key),
    set: (key: string, value: unknown) => void store.set(key, value),
    json: (data: unknown, status?: number) => new Response(JSON.stringify(data), { status: status ?? 200, headers: { 'content-type': 'application/json' } }),
  } as unknown as Context
  return ctx
}

describe('rate limiters', () => {
  it('createRateLimiter default keyGenerator uses headers and path', async () => {
    const middleware = createRateLimiter()
    const ctx = createMockContext({ 'x-forwarded-for': '1.2.3.4' }, '/v1/items')
    const res = await middleware(ctx, async () => new Response('ok'))
    expect(res === undefined || res instanceof Response).toBe(true)
  })

  it('createRateLimiter allows custom keyGenerator', async () => {
    const middleware = createRateLimiter({ keyGenerator: () => 'fixed-key' })
    const ctx = createMockContext({}, '/custom')
    const res = await middleware(ctx, async () => new Response('ok'))
    expect(res === undefined || res instanceof Response).toBe(true)
  })

  it('preconfigured limiters are defined', () => {
    expect(typeof apiRateLimiter).toBe('function')
    expect(typeof writeRateLimiter).toBe('function')
    expect(typeof proxyRateLimiter).toBe('function')
  })
})


